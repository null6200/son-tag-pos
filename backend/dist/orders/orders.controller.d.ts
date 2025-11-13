import { OrdersService } from './orders.service';
declare class CreateOrderItemDto {
    productId: string;
    qty: string;
    price: string;
}
declare class PaymentDto {
    method: string;
    amount: string;
    reference?: string;
}
interface RefundItemDto {
    productId: string;
    qty: number;
}
type OrderStatus = 'DRAFT' | 'ACTIVE' | 'PENDING_PAYMENT' | 'SUSPENDED' | 'PAID' | 'CANCELLED' | 'VOIDED' | 'REFUNDED';
declare class CreateOrderDto {
    branchId: string;
    sectionId?: string;
    sectionName?: string;
    tableId?: string | null;
    status?: OrderStatus;
    items: CreateOrderItemDto[];
    payment?: PaymentDto;
    allowOverselling?: boolean;
    subtotal?: string;
    discount?: string;
    tax?: string;
    total?: string;
    taxRate?: string;
    serviceType?: string;
    waiterId?: string;
    reservationKey?: string;
}
declare class UpdateOrderStatusDto {
    status: OrderStatus;
}
export declare class OrdersController {
    private readonly orders;
    constructor(orders: OrdersService);
    list(branchId?: string, from?: string, to?: string, req?: any): Promise<any>;
    get(id: string): Promise<any>;
    create(dto: CreateOrderDto, req: any): Promise<({
        [x: string]: ({
            serviceType: string;
            branchId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            waiterId: string | null;
            total: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            tax: import("@prisma/client/runtime/library").Decimal;
            sectionId: string | null;
            tableId: string | null;
            reservationKey: string | null;
            orderId: string | null;
            customerName: string | null;
            customerPhone: string | null;
            cart: import("@prisma/client/runtime/library").JsonValue;
        } | {
            serviceType: string;
            branchId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            waiterId: string | null;
            total: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            tax: import("@prisma/client/runtime/library").Decimal;
            sectionId: string | null;
            tableId: string | null;
            reservationKey: string | null;
            orderId: string | null;
            customerName: string | null;
            customerPhone: string | null;
            cart: import("@prisma/client/runtime/library").JsonValue;
        })[] | ({
            id: string;
            createdAt: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
            qty: number;
        } | {
            id: string;
            createdAt: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
            qty: number;
        })[] | ({
            meta: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            orderId: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
        } | {
            meta: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            orderId: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
        })[] | ({
            id: string;
            createdAt: Date;
            orderId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
        } | {
            id: string;
            createdAt: Date;
            orderId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
        })[] | {
            serviceType: string;
            branchId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            waiterId: string | null;
            total: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            tax: import("@prisma/client/runtime/library").Decimal;
            sectionId: string | null;
            tableId: string | null;
            reservationKey: string | null;
            orderId: string | null;
            customerName: string | null;
            customerPhone: string | null;
            cart: import("@prisma/client/runtime/library").JsonValue;
        }[] | {
            id: string;
            createdAt: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
            qty: number;
        }[] | {
            meta: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            orderId: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
        }[] | {
            id: string;
            createdAt: Date;
            orderId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
        }[];
        [x: number]: never;
        [x: symbol]: never;
    } & {
        serviceType: string | null;
        userId: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        taxRate: import("@prisma/client/runtime/library").Decimal | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        waiterId: string | null;
        waiterName: string | null;
        total: import("@prisma/client/runtime/library").Decimal;
        orderNumber: number;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discount: import("@prisma/client/runtime/library").Decimal;
        tax: import("@prisma/client/runtime/library").Decimal;
        sectionId: string | null;
        tableId: string | null;
    }) | null>;
    updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<{
        serviceType: string | null;
        userId: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        taxRate: import("@prisma/client/runtime/library").Decimal | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        waiterId: string | null;
        waiterName: string | null;
        total: import("@prisma/client/runtime/library").Decimal;
        orderNumber: number;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discount: import("@prisma/client/runtime/library").Decimal;
        tax: import("@prisma/client/runtime/library").Decimal;
        sectionId: string | null;
        tableId: string | null;
    }>;
    refund(id: string): Promise<{
        serviceType: string | null;
        userId: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        taxRate: import("@prisma/client/runtime/library").Decimal | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        waiterId: string | null;
        waiterName: string | null;
        total: import("@prisma/client/runtime/library").Decimal;
        orderNumber: number;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discount: import("@prisma/client/runtime/library").Decimal;
        tax: import("@prisma/client/runtime/library").Decimal;
        sectionId: string | null;
        tableId: string | null;
    }>;
    refundItems(id: string, body: {
        items: RefundItemDto[];
    }): Promise<({
        [x: string]: ({
            serviceType: string;
            branchId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            waiterId: string | null;
            total: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            tax: import("@prisma/client/runtime/library").Decimal;
            sectionId: string | null;
            tableId: string | null;
            reservationKey: string | null;
            orderId: string | null;
            customerName: string | null;
            customerPhone: string | null;
            cart: import("@prisma/client/runtime/library").JsonValue;
        } | {
            serviceType: string;
            branchId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            waiterId: string | null;
            total: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            tax: import("@prisma/client/runtime/library").Decimal;
            sectionId: string | null;
            tableId: string | null;
            reservationKey: string | null;
            orderId: string | null;
            customerName: string | null;
            customerPhone: string | null;
            cart: import("@prisma/client/runtime/library").JsonValue;
        })[] | ({
            id: string;
            createdAt: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
            qty: number;
        } | {
            id: string;
            createdAt: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
            qty: number;
        })[] | ({
            meta: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            orderId: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
        } | {
            meta: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            orderId: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
        })[] | ({
            id: string;
            createdAt: Date;
            orderId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
        } | {
            id: string;
            createdAt: Date;
            orderId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
        })[] | {
            serviceType: string;
            branchId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            waiterId: string | null;
            total: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            tax: import("@prisma/client/runtime/library").Decimal;
            sectionId: string | null;
            tableId: string | null;
            reservationKey: string | null;
            orderId: string | null;
            customerName: string | null;
            customerPhone: string | null;
            cart: import("@prisma/client/runtime/library").JsonValue;
        }[] | {
            id: string;
            createdAt: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
            qty: number;
        }[] | {
            meta: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            orderId: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
        }[] | {
            id: string;
            createdAt: Date;
            orderId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
        }[];
        [x: number]: never;
        [x: symbol]: never;
    } & {
        serviceType: string | null;
        userId: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        taxRate: import("@prisma/client/runtime/library").Decimal | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        waiterId: string | null;
        waiterName: string | null;
        total: import("@prisma/client/runtime/library").Decimal;
        orderNumber: number;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discount: import("@prisma/client/runtime/library").Decimal;
        tax: import("@prisma/client/runtime/library").Decimal;
        sectionId: string | null;
        tableId: string | null;
    }) | null>;
    addPayment(id: string, body: PaymentDto): Promise<({
        [x: string]: ({
            serviceType: string;
            branchId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            waiterId: string | null;
            total: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            tax: import("@prisma/client/runtime/library").Decimal;
            sectionId: string | null;
            tableId: string | null;
            reservationKey: string | null;
            orderId: string | null;
            customerName: string | null;
            customerPhone: string | null;
            cart: import("@prisma/client/runtime/library").JsonValue;
        } | {
            serviceType: string;
            branchId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            waiterId: string | null;
            total: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            tax: import("@prisma/client/runtime/library").Decimal;
            sectionId: string | null;
            tableId: string | null;
            reservationKey: string | null;
            orderId: string | null;
            customerName: string | null;
            customerPhone: string | null;
            cart: import("@prisma/client/runtime/library").JsonValue;
        })[] | ({
            id: string;
            createdAt: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
            qty: number;
        } | {
            id: string;
            createdAt: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
            qty: number;
        })[] | ({
            meta: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            orderId: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
        } | {
            meta: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            orderId: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
        })[] | ({
            id: string;
            createdAt: Date;
            orderId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
        } | {
            id: string;
            createdAt: Date;
            orderId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
        })[] | {
            serviceType: string;
            branchId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: string;
            waiterId: string | null;
            total: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            discount: import("@prisma/client/runtime/library").Decimal;
            tax: import("@prisma/client/runtime/library").Decimal;
            sectionId: string | null;
            tableId: string | null;
            reservationKey: string | null;
            orderId: string | null;
            customerName: string | null;
            customerPhone: string | null;
            cart: import("@prisma/client/runtime/library").JsonValue;
        }[] | {
            id: string;
            createdAt: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
            qty: number;
        }[] | {
            meta: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            createdAt: Date;
            orderId: string;
            method: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            reference: string | null;
        }[] | {
            id: string;
            createdAt: Date;
            orderId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
        }[];
        [x: number]: never;
        [x: symbol]: never;
    } & {
        serviceType: string | null;
        userId: string | null;
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        taxRate: import("@prisma/client/runtime/library").Decimal | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        waiterId: string | null;
        waiterName: string | null;
        total: import("@prisma/client/runtime/library").Decimal;
        orderNumber: number;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discount: import("@prisma/client/runtime/library").Decimal;
        tax: import("@prisma/client/runtime/library").Decimal;
        sectionId: string | null;
        tableId: string | null;
    }) | null>;
}
export {};
