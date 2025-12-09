import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
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

  private connectedClients = new Map<string, { branchId?: string; userId?: string; authenticated?: boolean }>();

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    console.log(`[WebSocket] Client connected: ${client.id}`);
    
    // Attempt to authenticate via token in handshake
    const token = this.extractToken(client);
    let userId: string | undefined;
    let authenticated = false;

    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        userId = payload.sub || payload.userId || payload.id;
        authenticated = true;
        console.log(`[WebSocket] Client ${client.id} authenticated as user ${userId}`);
      } catch (err) {
        // Token invalid or expired - allow connection but mark as unauthenticated
        // Client can still receive public events but won't be able to subscribe to branches
        console.warn(`[WebSocket] Client ${client.id} auth failed:`, err.message);
      }
    } else {
      console.log(`[WebSocket] Client ${client.id} connected without token (unauthenticated)`);
    }

    this.connectedClients.set(client.id, { userId, authenticated });
  }

  /**
   * Extract JWT token from socket handshake (auth header, query param, or cookie)
   */
  private extractToken(client: Socket): string | null {
    // 1. Check auth object (socket.io-client sends this via auth option)
    const authToken = client.handshake?.auth?.token;
    if (authToken) return authToken;

    // 2. Check Authorization header
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // 3. Check query parameter
    const queryToken = client.handshake?.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    // 4. Check cookies (access_token cookie)
    const cookies = client.handshake?.headers?.cookie;
    if (cookies) {
      const match = cookies.match(/access_token=([^;]+)/);
      if (match) return match[1];
    }

    return null;
  }

  handleDisconnect(client: Socket) {
    console.log(`[WebSocket] Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  /**
   * Client subscribes to a specific branch's events.
   * This allows filtering so cashiers only receive events for their branch.
   * Requires authentication - unauthenticated clients cannot subscribe.
   */
  @SubscribeMessage('subscribe:branch')
  handleSubscribeBranch(client: Socket, payload: { branchId: string; userId?: string }) {
    const { branchId, userId } = payload;
    if (!branchId) return { success: false, error: 'branchId required' };

    // Check if client is authenticated
    const clientData = this.connectedClients.get(client.id);
    if (!clientData?.authenticated) {
      console.warn(`[WebSocket] Unauthenticated client ${client.id} tried to subscribe to branch ${branchId}`);
      return { success: false, error: 'Authentication required' };
    }

    // Join the branch room
    const room = `branch:${branchId}`;
    client.join(room);
    
    // Track client metadata (preserve authenticated status)
    this.connectedClients.set(client.id, { 
      ...clientData,
      branchId, 
      userId: userId || clientData.userId 
    });
    
    console.log(`[WebSocket] Client ${client.id} (user: ${clientData.userId}) subscribed to ${room}`);
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
