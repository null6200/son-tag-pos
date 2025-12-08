import { Injectable } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

/**
 * Event types that can be broadcast to connected clients.
 * These are purely informational - they tell clients to refresh their data.
 */
export type PosEventType =
  // Order/Sale events
  | 'sale:created'
  | 'sale:updated'
  | 'sale:status_changed'
  | 'sale:payment_added'
  | 'sale:cancelled'
  | 'sale:refunded'
  // Draft/Cart events
  | 'draft:created'
  | 'draft:updated'
  | 'draft:deleted'
  // Inventory events
  | 'inventory:updated'
  | 'stock:adjusted'
  // Product events
  | 'product:created'
  | 'product:updated'
  | 'product:deleted'
  // Table events
  | 'table:status_changed'
  // Shift events
  | 'shift:opened'
  | 'shift:closed'
  // Pricing events
  | 'price:updated'
  // Customer events
  | 'customer:created'
  | 'customer:updated'
  | 'customer:deleted'
  // Discount events
  | 'discount:created'
  | 'discount:updated'
  | 'discount:deleted'
  // Section events
  | 'section:created'
  | 'section:updated'
  | 'section:deleted';

export interface PosEvent {
  type: PosEventType;
  branchId: string;
  payload: {
    id?: string;
    [key: string]: any;
  };
  timestamp: string;
  // Optional: who triggered this event (for filtering own actions)
  actorUserId?: string;
}

/**
 * Service for emitting real-time events to connected clients.
 * 
 * SAFETY: This service is designed to be fail-safe:
 * - All emit calls are wrapped in try-catch
 * - Failures are logged but never thrown
 * - Core business logic is never blocked by event emission failures
 * 
 * Usage in other services:
 * ```
 * // After successful database operation:
 * this.events.emit({
 *   type: 'sale:created',
 *   branchId: order.branchId,
 *   payload: { id: order.id, status: order.status }
 * });
 * ```
 */
@Injectable()
export class EventsService {
  constructor(private readonly gateway: EventsGateway) {}

  /**
   * Emit an event to all clients subscribed to the relevant branch.
   * This is fire-and-forget - failures are logged but never thrown.
   */
  emit(event: Omit<PosEvent, 'timestamp'>): void {
    try {
      const fullEvent: PosEvent = {
        ...event,
        timestamp: new Date().toISOString(),
      };

      this.gateway.emitToBranch(event.branchId, event.type, fullEvent);
    } catch (err) {
      // Never let event emission break the main flow
      console.error('[EventsService] Failed to emit event:', event.type, err);
    }
  }

  /**
   * Emit an event to ALL connected clients (use sparingly).
   */
  emitGlobal(type: PosEventType, payload: any): void {
    try {
      const event = {
        type,
        payload,
        timestamp: new Date().toISOString(),
      };
      this.gateway.emitToAll(type, event);
    } catch (err) {
      console.error('[EventsService] Failed to emit global event:', type, err);
    }
  }

  /**
   * Convenience method for order/sale events.
   */
  emitSaleEvent(
    type: Extract<PosEventType, `sale:${string}`>,
    branchId: string,
    orderId: string,
    extra?: Record<string, any>,
    actorUserId?: string,
  ): void {
    this.emit({
      type,
      branchId,
      payload: { id: orderId, ...extra },
      actorUserId,
    });
  }

  /**
   * Convenience method for draft events.
   */
  emitDraftEvent(
    type: Extract<PosEventType, `draft:${string}`>,
    branchId: string,
    draftId: string,
    extra?: Record<string, any>,
    actorUserId?: string,
  ): void {
    this.emit({
      type,
      branchId,
      payload: { id: draftId, ...extra },
      actorUserId,
    });
  }

  /**
   * Convenience method for inventory events.
   */
  emitInventoryEvent(
    branchId: string,
    productId: string,
    newQuantity: number,
    reason?: string,
    actorUserId?: string,
  ): void {
    this.emit({
      type: 'inventory:updated',
      branchId,
      payload: { productId, quantity: newQuantity, reason },
      actorUserId,
    });
  }

  /**
   * Convenience method for product events.
   */
  emitProductEvent(
    type: Extract<PosEventType, `product:${string}`>,
    branchId: string,
    productId: string,
    extra?: Record<string, any>,
    actorUserId?: string,
  ): void {
    this.emit({
      type,
      branchId,
      payload: { id: productId, ...extra },
      actorUserId,
    });
  }

  /**
   * Convenience method for table status events.
   */
  emitTableEvent(
    branchId: string,
    tableId: string,
    status: string,
    actorUserId?: string,
  ): void {
    this.emit({
      type: 'table:status_changed',
      branchId,
      payload: { id: tableId, status },
      actorUserId,
    });
  }

  /**
   * Get WebSocket connection stats (for health endpoint).
   */
  getStats(): { connectedClients: number } {
    return {
      connectedClients: this.gateway.getConnectedCount(),
    };
  }
}
