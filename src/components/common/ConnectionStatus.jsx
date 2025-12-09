import React from 'react';
import { useSocketConnection } from '../../lib/useSocketConnection';

/**
 * Connection status indicator component.
 * Shows a small indicator when connection is lost or data may be stale.
 * 
 * @param {Object} props
 * @param {function} props.onRefresh - Optional callback to refresh data when clicked
 * @param {string} props.className - Additional CSS classes
 * 
 * @example
 * <ConnectionStatus onRefresh={() => refetchAllData()} />
 */
export function ConnectionStatus({ onRefresh, className = '' }) {
  const {
    isConnected,
    isReconnecting,
    isStale,
    disconnectedFor,
    reconnect,
  } = useSocketConnection({
    onStaleData: () => {
      // Auto-refresh when data may be stale
      if (onRefresh) {
        onRefresh();
      }
    },
  });

  // Don't show anything if connected and not stale
  if (isConnected && !isStale) {
    return null;
  }

  const formatDuration = (ms) => {
    if (ms < 1000) return 'just now';
    if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    return `${Math.floor(ms / 3600000)}h ago`;
  };

  const handleClick = () => {
    if (!isConnected) {
      reconnect();
    }
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <div
      className={`connection-status ${className}`}
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        padding: '8px 16px',
        borderRadius: '8px',
        backgroundColor: isReconnecting ? '#f59e0b' : isConnected ? '#eab308' : '#ef4444',
        color: 'white',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 9999,
        transition: 'all 0.2s ease',
      }}
      title={isConnected ? 'Click to refresh data' : 'Click to reconnect'}
    >
      {/* Status dot */}
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'white',
          animation: isReconnecting ? 'pulse 1s infinite' : 'none',
        }}
      />
      
      {/* Status text */}
      <span>
        {isReconnecting && 'Reconnecting...'}
        {!isConnected && !isReconnecting && `Offline (${formatDuration(disconnectedFor)})`}
        {isConnected && isStale && 'Data may be outdated'}
      </span>

      {/* Refresh icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: isReconnecting ? 'spin 1s linear infinite' : 'none',
        }}
      >
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 21h5v-5" />
      </svg>

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Minimal connection dot indicator.
 * Shows just a colored dot indicating connection status.
 */
export function ConnectionDot({ className = '' }) {
  const { isConnected, isReconnecting } = useSocketConnection();

  const color = isConnected ? '#22c55e' : isReconnecting ? '#f59e0b' : '#ef4444';
  const title = isConnected ? 'Connected' : isReconnecting ? 'Reconnecting...' : 'Disconnected';

  return (
    <span
      className={`connection-dot ${className}`}
      title={title}
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
        animation: isReconnecting ? 'pulse 1s infinite' : 'none',
      }}
    />
  );
}

export default ConnectionStatus;
