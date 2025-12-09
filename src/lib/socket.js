import { io } from 'socket.io-client';
import { getApiBaseUrl } from './api';

/**
 * Socket.IO client for real-time POS events.
 * 
 * This module provides a singleton socket connection that can be used
 * throughout the app to receive real-time updates when other cashiers
 * make changes (sales, drafts, inventory, etc.).
 * 
 * IMPORTANT: This is purely additive - it does not change any existing
 * data fetching logic. Components can optionally subscribe to events
 * to trigger refreshes.
 */

let socket = null;
let currentBranchId = null;
const listeners = new Map(); // eventType -> Set<callback>

// Connection state tracking for stale data detection
let lastConnectedAt = null;
let lastDisconnectedAt = null;
let missedEventsCount = 0;
let connectionState = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
const STALE_THRESHOLD_MS = 30000; // 30 seconds - if disconnected longer, data may be stale

// Callbacks for connection state changes
const connectionStateListeners = new Set();

/**
 * Get auth token from storage for WebSocket authentication
 */
function getAuthToken() {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem('access_token') || 
           window.sessionStorage.getItem('access_token') || 
           null;
  } catch {
    return null;
  }
}

/**
 * Get or create the socket connection.
 * Lazily connects on first use.
 */
export function getSocket() {
  if (!socket) {
    const baseUrl = getApiBaseUrl();
    socket = io(baseUrl, {
      // Don't auto-connect; we'll connect when subscribing to a branch
      autoConnect: false,
      // Reconnect automatically on disconnect
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // Use WebSocket transport primarily, fall back to polling
      transports: ['websocket', 'polling'],
      // Include credentials for auth (cookies)
      withCredentials: true,
      // Send auth token in handshake for JWT authentication
      auth: (cb) => {
        const token = getAuthToken();
        cb({ token });
      },
    });

    // Connection lifecycle logging with stale data detection
    socket.on('connect', () => {
      const now = Date.now();
      const wasReconnect = lastDisconnectedAt !== null;
      const disconnectDuration = wasReconnect ? now - lastDisconnectedAt : 0;
      
      console.log('[Socket] Connected:', socket.id, wasReconnect ? `(reconnected after ${disconnectDuration}ms)` : '(fresh)');
      
      lastConnectedAt = now;
      const prevState = connectionState;
      connectionState = 'connected';
      
      // Re-subscribe to branch if we had one
      if (currentBranchId) {
        socket.emit('subscribe:branch', { branchId: currentBranchId });
      }
      
      // Notify listeners of connection state change
      notifyConnectionStateChange({
        state: 'connected',
        wasReconnect,
        disconnectDuration,
        mayBeStale: wasReconnect && disconnectDuration > STALE_THRESHOLD_MS,
        missedEventsCount,
      });
      
      // Reset missed events counter after reconnect notification
      if (wasReconnect) {
        missedEventsCount = 0;
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      lastDisconnectedAt = Date.now();
      connectionState = 'disconnected';
      
      notifyConnectionStateChange({
        state: 'disconnected',
        reason,
      });
    });

    socket.on('reconnecting', (attemptNumber) => {
      console.log('[Socket] Reconnecting, attempt:', attemptNumber);
      connectionState = 'reconnecting';
      
      notifyConnectionStateChange({
        state: 'reconnecting',
        attempt: attemptNumber,
      });
    });

    socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after all attempts');
      connectionState = 'disconnected';
      
      notifyConnectionStateChange({
        state: 'reconnect_failed',
      });
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      
      notifyConnectionStateChange({
        state: 'error',
        error: err.message,
      });
    });

    // Set up event forwarding to registered listeners
    setupEventForwarding(socket);
  }
  return socket;
}

/**
 * Notify all connection state listeners of a state change
 */
function notifyConnectionStateChange(event) {
  for (const listener of connectionStateListeners) {
    try {
      listener(event);
    } catch (err) {
      console.error('[Socket] Connection state listener error:', err);
    }
  }
}

/**
 * Forward socket events to registered listeners.
 */
function setupEventForwarding(sock) {
  const eventTypes = [
    'sale:created',
    'sale:updated',
    'sale:status_changed',
    'sale:payment_added',
    'sale:cancelled',
    'sale:refunded',
    'draft:created',
    'draft:updated',
    'draft:deleted',
    'inventory:updated',
    'stock:adjusted',
    'product:created',
    'product:updated',
    'product:deleted',
    'table:status_changed',
    'shift:opened',
    'shift:closed',
  ];

  for (const eventType of eventTypes) {
    sock.on(eventType, (data) => {
      console.log(`[Socket] Received ${eventType}:`, data);
      const callbacks = listeners.get(eventType);
      if (callbacks) {
        for (const cb of callbacks) {
          try {
            cb(data);
          } catch (err) {
            console.error(`[Socket] Listener error for ${eventType}:`, err);
          }
        }
      }
      // Also notify wildcard listeners
      const wildcardCallbacks = listeners.get('*');
      if (wildcardCallbacks) {
        for (const cb of wildcardCallbacks) {
          try {
            cb({ type: eventType, ...data });
          } catch (err) {
            console.error('[Socket] Wildcard listener error:', err);
          }
        }
      }
    });
  }
}

/**
 * Subscribe to a specific branch's events.
 * Call this when the user logs in or selects a branch.
 */
export function subscribeToBranch(branchId, userId) {
  if (!branchId) return;
  
  const sock = getSocket();
  
  // Connect if not already connected
  if (!sock.connected) {
    sock.connect();
  }
  
  // Unsubscribe from previous branch if different
  if (currentBranchId && currentBranchId !== branchId) {
    sock.emit('unsubscribe:branch', { branchId: currentBranchId });
  }
  
  currentBranchId = branchId;
  sock.emit('subscribe:branch', { branchId, userId });
  console.log('[Socket] Subscribed to branch:', branchId);
}

/**
 * Unsubscribe from the current branch and disconnect.
 * Call this when the user logs out.
 */
export function unsubscribeFromBranch() {
  if (!socket) return;
  
  if (currentBranchId) {
    socket.emit('unsubscribe:branch', { branchId: currentBranchId });
    currentBranchId = null;
  }
  
  socket.disconnect();
  console.log('[Socket] Unsubscribed and disconnected');
}

/**
 * Register a listener for a specific event type.
 * Returns an unsubscribe function.
 * 
 * @param {string} eventType - Event type to listen for (e.g., 'sale:created', 'draft:updated')
 *                             Use '*' to listen to all events.
 * @param {function} callback - Function to call when event is received
 * @returns {function} Unsubscribe function
 * 
 * @example
 * // In a component:
 * useEffect(() => {
 *   const unsubscribe = onPosEvent('sale:created', (data) => {
 *     console.log('New sale:', data);
 *     refetchSales();
 *   });
 *   return unsubscribe;
 * }, []);
 */
export function onPosEvent(eventType, callback) {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, new Set());
  }
  listeners.get(eventType).add(callback);
  
  // Return unsubscribe function
  return () => {
    const callbacks = listeners.get(eventType);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        listeners.delete(eventType);
      }
    }
  };
}

/**
 * Check if socket is currently connected.
 */
export function isConnected() {
  return socket?.connected || false;
}

/**
 * Get current subscribed branch ID.
 */
export function getCurrentBranchId() {
  return currentBranchId;
}

/**
 * Convenience hook-like function for React components.
 * Use this in useEffect to subscribe to events.
 * 
 * @example
 * useEffect(() => {
 *   return subscribeToEvents({
 *     'sale:created': () => refetchSales(),
 *     'draft:updated': () => refetchDrafts(),
 *     'inventory:updated': () => refetchInventory(),
 *   });
 * }, []);
 */
export function subscribeToEvents(eventMap) {
  const unsubscribers = [];
  
  for (const [eventType, callback] of Object.entries(eventMap)) {
    unsubscribers.push(onPosEvent(eventType, callback));
  }
  
  // Return combined unsubscribe function
  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}

/**
 * Get current connection state.
 * @returns {'disconnected' | 'connecting' | 'connected' | 'reconnecting'}
 */
export function getConnectionState() {
  return connectionState;
}

/**
 * Get connection statistics for debugging/display.
 */
export function getConnectionStats() {
  return {
    state: connectionState,
    lastConnectedAt,
    lastDisconnectedAt,
    missedEventsCount,
    isStale: lastDisconnectedAt && (Date.now() - lastDisconnectedAt) > STALE_THRESHOLD_MS,
    disconnectedFor: lastDisconnectedAt ? Date.now() - lastDisconnectedAt : 0,
  };
}

/**
 * Subscribe to connection state changes.
 * Useful for showing connection status indicators or stale data warnings.
 * 
 * @param {function} callback - Called with connection state event
 * @returns {function} Unsubscribe function
 * 
 * @example
 * useEffect(() => {
 *   return onConnectionStateChange((event) => {
 *     if (event.state === 'connected' && event.mayBeStale) {
 *       // Show "Data may be outdated, refreshing..." toast
 *       refetchAllData();
 *     }
 *     if (event.state === 'disconnected') {
 *       // Show "Connection lost" indicator
 *     }
 *   });
 * }, []);
 */
export function onConnectionStateChange(callback) {
  connectionStateListeners.add(callback);
  
  // Return unsubscribe function
  return () => {
    connectionStateListeners.delete(callback);
  };
}

/**
 * Force a reconnection attempt.
 * Useful when user manually wants to reconnect.
 */
export function reconnect() {
  if (!socket) return;
  
  if (socket.connected) {
    console.log('[Socket] Already connected');
    return;
  }
  
  console.log('[Socket] Manual reconnect requested');
  socket.connect();
}

/**
 * Check if data may be stale due to connection issues.
 * @returns {boolean}
 */
export function mayBeStale() {
  if (connectionState === 'connected') return false;
  if (!lastDisconnectedAt) return false;
  return (Date.now() - lastDisconnectedAt) > STALE_THRESHOLD_MS;
}
