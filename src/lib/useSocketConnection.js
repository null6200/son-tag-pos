import { useState, useEffect, useCallback } from 'react';
import {
  getConnectionState,
  getConnectionStats,
  onConnectionStateChange,
  onPosEvent,
  reconnect,
  mayBeStale,
} from './socket';

/**
 * React hook for managing WebSocket connection state and stale data detection.
 * 
 * @param {Object} options
 * @param {function} options.onStaleData - Called when data may be stale after reconnect
 * @param {function} options.onReconnect - Called when connection is restored
 * @param {function} options.onDisconnect - Called when connection is lost
 * @returns {Object} Connection state and utilities
 * 
 * @example
 * function MyComponent() {
 *   const { isConnected, isStale, reconnect } = useSocketConnection({
 *     onStaleData: () => {
 *       toast.warning('Connection restored. Refreshing data...');
 *       refetchAllData();
 *     },
 *     onDisconnect: () => {
 *       toast.error('Connection lost. Some updates may be missed.');
 *     },
 *   });
 * 
 *   return (
 *     <div>
 *       {!isConnected && <ConnectionLostBanner onRetry={reconnect} />}
 *       {isStale && <StaleDataWarning />}
 *     </div>
 *   );
 * }
 */
export function useSocketConnection({ onStaleData, onReconnect, onDisconnect } = {}) {
  const [state, setState] = useState(() => ({
    connectionState: getConnectionState(),
    ...getConnectionStats(),
  }));

  useEffect(() => {
    const unsubscribe = onConnectionStateChange((event) => {
      // Update state
      setState({
        connectionState: event.state,
        ...getConnectionStats(),
      });

      // Call appropriate callbacks
      if (event.state === 'connected') {
        if (event.mayBeStale && onStaleData) {
          onStaleData(event);
        } else if (event.wasReconnect && onReconnect) {
          onReconnect(event);
        }
      } else if (event.state === 'disconnected' && onDisconnect) {
        onDisconnect(event);
      }
    });

    return unsubscribe;
  }, [onStaleData, onReconnect, onDisconnect]);

  return {
    connectionState: state.connectionState,
    isConnected: state.connectionState === 'connected',
    isReconnecting: state.connectionState === 'reconnecting',
    isDisconnected: state.connectionState === 'disconnected',
    isStale: state.isStale,
    disconnectedFor: state.disconnectedFor,
    lastConnectedAt: state.lastConnectedAt,
    reconnect,
    mayBeStale,
  };
}

/**
 * React hook that auto-refreshes data when connection is restored after being stale.
 * 
 * @param {function} refetchFn - Function to call to refresh data
 * @param {Object} options
 * @param {number} options.staleThreshold - Custom stale threshold in ms (default: 30000)
 * 
 * @example
 * function SalesPage() {
 *   const { data, refetch } = useQuery('sales', fetchSales);
 *   
 *   // Auto-refresh sales when connection is restored
 *   useAutoRefreshOnReconnect(refetch);
 *   
 *   return <SalesList data={data} />;
 * }
 */
export function useAutoRefreshOnReconnect(refetchFn, { staleThreshold = 30000 } = {}) {
  useEffect(() => {
    if (!refetchFn) return;

    const unsubscribe = onConnectionStateChange((event) => {
      if (event.state === 'connected' && event.mayBeStale) {
        console.log('[useAutoRefreshOnReconnect] Data may be stale, refreshing...');
        try {
          refetchFn();
        } catch (err) {
          console.error('[useAutoRefreshOnReconnect] Refresh failed:', err);
        }
      }
    });

    return unsubscribe;
  }, [refetchFn, staleThreshold]);
}

/**
 * React hook that subscribes to real-time events and auto-refreshes on relevant changes.
 * 
 * @param {string|string[]} eventTypes - Event type(s) to listen for
 * @param {function} refetchFn - Function to call when event is received
 * 
 * @example
 * function InventoryPage() {
 *   const { data, refetch } = useQuery('inventory', fetchInventory);
 *   
 *   // Auto-refresh when inventory changes
 *   useRealtimeRefresh(['inventory:updated', 'stock:adjusted'], refetch);
 *   
 *   return <InventoryList data={data} />;
 * }
 */
export function useRealtimeRefresh(eventTypes, refetchFn) {
  useEffect(() => {
    if (!refetchFn) return;

    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    const unsubscribers = [];

    for (const eventType of types) {
      unsubscribers.push(
        onPosEvent(eventType, (data) => {
          console.log(`[useRealtimeRefresh] Received ${eventType}, refreshing...`);
          try {
            refetchFn(data);
          } catch (err) {
            console.error(`[useRealtimeRefresh] Refresh failed for ${eventType}:`, err);
          }
        })
      );
    }

    return () => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [eventTypes, refetchFn]);
}

export default useSocketConnection;
