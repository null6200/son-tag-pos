import type { Response } from 'express';
export declare class UploadsController {
    serveProductImage(filename: string, res: Response): Response<any, Record<string, any>> | undefined;
}
