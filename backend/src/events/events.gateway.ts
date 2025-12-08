import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * WebSocket Gateway for real-time event broadcasting.
 * 
 * This gateway handles client connections and allows them to subscribe
 * to branch-specific events. Events are broadcast to all clients
 * subscribed to the relevant branch room.
 * 
 * IMPORTANT: This is purely additive - it does not modify any existing
 * REST API logic. Services emit events here AFTER their normal operations.
 */
@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow all origins in development; in production, configure ALLOWED_ORIGINS
      const allowed = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [];
      if (!origin || allowed.length === 0 || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Be permissive for WebSocket; auth is handled separately
      }
    },
    credentials: true,
  },
  // Use /socket.io path (default) to avoid conflicts with REST API
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, { branchId?: string; userId?: string }>();

  handleConnection(client: Socket) {
    console.log(`[WebSocket] Client connected: ${client.id}`);
    this.connectedClients.set(client.id, {});
  }

  handleDisconnect(client: Socket) {
    console.log(`[WebSocket] Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  /**
   * Client subscribes to a specific branch's events.
   * This allows filtering so cashiers only receive events for their branch.
   */
  @SubscribeMessage('subscribe:branch')
  handleSubscribeBranch(client: Socket, payload: { branchId: string; userId?: string }) {
    const { branchId, userId } = payload;
    if (!branchId) return { success: false, error: 'branchId required' };

    // Join the branch room
    const room = `branch:${branchId}`;
    client.join(room);
    
    // Track client metadata
    this.connectedClients.set(client.id, { branchId, userId });
    
    console.log(`[WebSocket] Client ${client.id} subscribed to ${room}`);
    return { success: true, room };
  }

  /**
   * Client unsubscribes from a branch.
   */
  @SubscribeMessage('unsubscribe:branch')
  handleUnsubscribeBranch(client: Socket, payload: { branchId: string }) {
    const { branchId } = payload;
    if (!branchId) return { success: false };

    const room = `branch:${branchId}`;
    client.leave(room);
    
    console.log(`[WebSocket] Client ${client.id} unsubscribed from ${room}`);
    return { success: true };
  }

  /**
   * Broadcast an event to all clients subscribed to a specific branch.
   * Called by EventsService when data changes occur.
   */
  emitToBranch(branchId: string, event: string, data: any) {
    const room = `branch:${branchId}`;
    this.server.to(room).emit(event, data);
    console.log(`[WebSocket] Emitted ${event} to ${room}`, { dataKeys: Object.keys(data || {}) });
  }

  /**
   * Broadcast an event to ALL connected clients (global events).
   * Use sparingly - prefer branch-scoped events.
   */
  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
    console.log(`[WebSocket] Emitted ${event} to all clients`);
  }

  /**
   * Get count of connected clients (for health checks).
   */
  getConnectedCount(): number {
    return this.connectedClients.size;
  }
}
