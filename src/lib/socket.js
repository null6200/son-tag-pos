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
      // Include credentials for auth
      withCredentials: true,
    });

    // Connection lifecycle logging
    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      // Re-subscribe to branch if we had one
      if (currentBranchId) {
        socket.emit('subscribe:branch', { branchId: currentBranchId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // Set up event forwarding to registered listeners
    setupEventForwarding(socket);
  }
  return socket;
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
