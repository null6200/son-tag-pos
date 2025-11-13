import { ProductsService } from './products.service';
declare class CreateProductDto {
    name: string;
    category?: string;
    subCategory?: string;
    price: string;
    taxRate?: string;
    branchId?: string;
    productTypeId?: string;
    productTypeName?: string;
    initialSectionId?: string;
    initialQty?: string;
}
declare class UpdateProductDto {
    name?: string;
    category?: string;
    subCategory?: string;
    price?: string;
    taxRate?: string;
    productTypeId?: string | null;
    productTypeName?: string | null;
}
export declare class ProductsController {
    private readonly products;
    constructor(products: ProductsService);
    list(branchId?: string, includeArchived?: string): Promise<{
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
    create(dto: CreateProductDto, req: any): Promise<any>;
    update(id: string, dto: UpdateProductDto, req: any): Promise<{
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
    uploadImage(id: string, file: Express.Multer.File, req: any): Promise<any>;
    remove(id: string, req: any): Promise<{
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
