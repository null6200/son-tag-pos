import { UnitsService } from './units.service';
export declare class UnitsController {
    private readonly svc;
    constructor(svc: UnitsService);
    list(): void;
    create(_dto: any): void;
    update(_id: string, _dto: any): void;
    remove(_id: string): void;
}
