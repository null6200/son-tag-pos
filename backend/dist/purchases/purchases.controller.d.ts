import { PurchasesService } from './purchases.service';
export declare class PurchasesController {
    private readonly svc;
    constructor(svc: PurchasesService);
    listAll(): void;
    listMine(): void;
    create(_dto: any, _req: any): void;
    update(_id: string, _dto: any): void;
    remove(_id: string): void;
    addPayment(_id: string, _dto: any): void;
    editPayment(_id: string, _pid: string, _dto: any): void;
    deletePayment(_id: string, _pid: string): void;
    updateStatus(_id: string, _dto: any): void;
    receive(_id: string, _dto: any): void;
}
