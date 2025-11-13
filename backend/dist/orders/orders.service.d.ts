import { PrismaService } from '../prisma/prisma.service';
interface CreateOrderItem {
    productId: string;
    qty: string;
    price: string;
}
interface PaymentDto {
    method: string;
    amount: string;
    reference?: string;
}
type OrderStatus = 'DRAFT' | 'ACTIVE' | 'PENDING_PAYMENT' | 'SUSPENDED' | 'PAID' | 'CANCELLED' | 'VOIDED' | 'REFUNDED';
interface CreateOrderDto {
    branchId: string;
    sectionId?: string;
    sectionName?: string;
    tableId?: string | null;
    status?: OrderStatus;
    items: CreateOrderItem[];
    payment?: PaymentDto;
    allowOverselling?: boolean;
    reservationKey?: string;
    subtotal?: string | number;
    discount?: string | number;
    tax?: string | number;
    total?: string | number;
    taxRate?: string | number;
    serviceType?: string;
    waiterId?: string;
}
export declare class OrdersService {
    private prisma;
    constructor(prisma: PrismaService);
    private isLockingStatus;
    list(branchId?: string, from?: string, to?: string): Promise<any>;
    list(branchId: string | undefined, from: string | undefined, to: string | undefined, userId?: string, perms?: string[]): Promise<any>;
    getOne(id: string): Promise<any>;
    create(dto: CreateOrderDto, userId?: string): Promise<({
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
    updateStatus(orderId: string, status: OrderStatus): Promise<{
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
    refund(orderId: string): Promise<{
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
    addPayment(orderId: string, dto: PaymentDto): Promise<({
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
    refundItems(orderId: string, items: {
        productId: string;
        qty: number;
    }[]): Promise<({
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
