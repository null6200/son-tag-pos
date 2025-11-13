import { PrismaService } from '../prisma/prisma.service';
type CreateItem = {
    productId: string;
    qty: number;
    price: string;
};
type PaymentDto = {
    method: string;
    amount: string;
    reference?: string;
};
export declare class PurchasesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    notImplemented(): void;
    listAll(): Promise<any>;
    listMine(): Promise<any>;
    create(dto: {
        branchId: string;
        supplierId?: string | null;
        items?: CreateItem[];
        payments?: PaymentDto[];
    }): Promise<any>;
    update(id: string, dto: any): Promise<any>;
    remove(id: string): Promise<any>;
    addPayment(id: string, dto: PaymentDto): Promise<any>;
    editPayment(id: string, paymentId: string, dto: PaymentDto): Promise<any>;
    deletePayment(id: string, paymentId: string): Promise<any>;
}
export {};
