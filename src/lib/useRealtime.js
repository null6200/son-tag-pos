import { useEffect, useCallback, useRef, useState } from 'react';
import { onPosEvent, subscribeToBranch, unsubscribeFromBranch, isConnected } from './socket';

/**
 * React hook for subscribing to real-time POS events.
 * 
 * This hook makes it easy to refresh data when other cashiers make changes.
 * It automatically handles cleanup on unmount.
 * 
 * @param {string|string[]} eventTypes - Event type(s) to listen for
 * @param {function} callback - Function to call when event is received
 * @param {object} options - Optional configuration
 * @param {boolean} options.enabled - Whether to enable the subscription. Defaults are:
 *   - In development: enabled by default
 *   - In production: disabled by default unless VITE_ENABLE_REALTIME=true
 * @param {string} options.skipActorId - Skip events from this user ID (to avoid self-updates)
 * 
 * @example
 * // Refresh sales list when any sale event occurs
 * useRealtime(['sale:created', 'sale:status_changed'], () => {
 *   refetchSales();
 * });
 * 
 * @example
 * // Refresh inventory when stock changes, but skip own actions
 * useRealtime('inventory:updated', () => {
 *   refetchInventory();
 * }, { skipActorId: currentUser.id });
 */

// Determine sensible default for realtime based on build/runtime environment.
// - In development (Vite dev server), enable realtime by default.
// - In production builds (Netlify, etc.), disable by default unless
//   VITE_ENABLE_REALTIME is explicitly set to 'true'.
function getDefaultRealtimeEnabled() {
  try {
    // Vite-style env for frontend builds
    const env = typeof import.meta !== 'undefined' ? (import.meta.env || {}) : {};

    if (typeof env.VITE_ENABLE_REALTIME !== 'undefined') {
      return String(env.VITE_ENABLE_REALTIME).toLowerCase() === 'true';
    }

    if (env.DEV === true) return true;
    if (env.PROD === true) return false;
  } catch {
    // Ignore env probing errors and fall through to fallback
  }

  // Fallback: enable (e.g., tests or non-Vite environments)
  return true;
}

const REALTIME_DEFAULT_ENABLED = getDefaultRealtimeEnabled();

export function useRealtime(eventTypes, callback, options = {}) {
  const { enabled = REALTIME_DEFAULT_ENABLED, skipActorId } = options;
  const callbackRef = useRef(callback);
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (!enabled) return;
    
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    const unsubscribers = [];
    
    for (const eventType of types) {
      const handler = (data) => {
        // Skip if this event was triggered by the current user
        if (skipActorId && data?.actorUserId === skipActorId) {
          return;
        }
        callbackRef.current(data);
      };
      
      unsubscribers.push(onPosEvent(eventType, handler));
    }
    
    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [eventTypes, enabled, skipActorId]);
}

/**
 * Hook to manage branch subscription lifecycle.
 * Call this once at the app level (e.g., in App.jsx or a context provider).
 * 
 * @param {string} branchId - Current branch ID
 * @param {string} userId - Current user ID
 * 
 * @example
 * // In App.jsx or AuthProvider:
 * useBranchSubscription(currentBranch?.id, currentUser?.id);
 */
export function useBranchSubscription(branchId, userId) {
  useEffect(() => {
    if (branchId) {
      subscribeToBranch(branchId, userId);
    }
    
    return () => {
      unsubscribeFromBranch();
    };
  }, [branchId, userId]);
}

/**
 * Hook to get socket connection status.
 * 
 * @returns {boolean} Whether socket is connected
 */
export function useSocketStatus() {
  const [connected, setConnected] = useState(isConnected());
  
  useEffect(() => {
    // Check status periodically
    const interval = setInterval(() => {
      setConnected(isConnected());
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return connected;
}

/**
 * Hook for auto-refreshing data on specific events.
 * Combines useRealtime with a debounce to avoid rapid re-fetches.
 * 
 * @param {string|string[]} eventTypes - Event type(s) to listen for
 * @param {function} refetchFn - Function to call to refresh data
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 500)
 * 
 * @example
 * const { data: sales, refetch } = useSalesQuery();
 * useAutoRefresh(['sale:created', 'sale:status_changed'], refetch);
 */
export function useAutoRefresh(eventTypes, refetchFn, debounceMs = 500) {
  const timeoutRef = useRef(null);
  
  const debouncedRefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      refetchFn();
    }, debounceMs);
  }, [refetchFn, debounceMs]);
  
  useRealtime(eventTypes, debouncedRefetch);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}

export default useRealtime;
