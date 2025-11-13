import { TaxRatesService } from './taxrates.service';
export declare class TaxRatesController {
    private readonly svc;
    constructor(svc: TaxRatesService);
    list(): void;
    create(_dto: any): void;
    update(_id: string, _dto: any): void;
    remove(_id: string): void;
}
