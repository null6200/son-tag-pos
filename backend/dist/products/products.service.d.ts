import { PrismaService } from '../prisma/prisma.service';
interface CreateProductDto {
    name: string;
    category?: string;
    subCategory?: string;
    price: string;
    taxRate?: string;
    branchId: string;
    productTypeId?: string;
    productTypeName?: string;
    initialSectionId?: string;
    initialQty?: string;
}
interface UpdateProductDto {
    name?: string;
    category?: string;
    subCategory?: string;
    price?: string;
    taxRate?: string;
    productTypeId?: string | null;
    productTypeName?: string | null;
}
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    list(branchId?: string, includeArchived?: boolean): Promise<{
        category: string | null;
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        taxRate: import("@prisma/client/runtime/library").Decimal | null;
        sku: string;
        imageUrl: string | null;
        subCategory: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        productTypeId: string | null;
    }[]>;
    create(dto: CreateProductDto, role: string): Promise<any>;
    update(id: string, dto: UpdateProductDto, role: string): Promise<{
        category: string | null;
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        taxRate: import("@prisma/client/runtime/library").Decimal | null;
        sku: string;
        imageUrl: string | null;
        subCategory: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        productTypeId: string | null;
    }>;
    remove(id: string, role: string): Promise<{
        category: string | null;
        branchId: string;
        id: string;
        archived: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        taxRate: import("@prisma/client/runtime/library").Decimal | null;
        sku: string;
        imageUrl: string | null;
        subCategory: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        productTypeId: string | null;
    }>;
}
export {};
