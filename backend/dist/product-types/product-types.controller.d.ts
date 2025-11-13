import { ProductTypesService } from './product-types.service';
export declare class ProductTypesController {
    private readonly svc;
    constructor(svc: ProductTypesService);
    list(branchId: string, page?: string, pageSize?: string, req?: any): Promise<{
        items: ({
            productTypeLinks: ({
                sectionFunction: {
                    branchId: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    name: string;
                    description: string | null;
                };
            } & {
                sectionFunctionId: string;
                productTypeId: string;
            })[];
        } & {
            branchId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
        })[];
        page: number;
        pageSize: number;
        total: number;
        pages: number;
    }>;
    create(dto: {
        branchId?: string;
        name: string;
        description?: string;
        allowedFunctionIds?: string[];
    }, req: any): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    update(id: string, dto: {
        name?: string;
        description?: string;
        allowedFunctionIds?: string[];
    }, req: any): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
    remove(id: string, req: any): Promise<{
        branchId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
    }>;
}
