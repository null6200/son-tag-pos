import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join, resolve, extname } from 'path';
import { existsSync, createReadStream, statSync } from 'fs';

@Controller('uploads')
export class UploadsController {
  @Get('products/:filename')
  serveProductImage(@Param('filename') filename: string, @Res() res: Response) {
    try {
      const safe = String(filename || '').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const dir = resolve(process.cwd(), 'uploads', 'products');
      const filePath = join(dir, safe);
      if (!existsSync(filePath)) {
        return res.status(404).send('Not Found');
      }
      const type = (() => {
        const ext = extname(filePath).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
        if (ext === '.png') return 'image/png';
        if (ext === '.gif') return 'image/gif';
        if (ext === '.webp') return 'image/webp';
        if (ext === '.svg') return 'image/svg+xml';
        return 'application/octet-stream';
      })();
      try { res.setHeader('Content-Type', type); } catch {}
      try { const st = statSync(filePath); if (st?.size >= 0) res.setHeader('Content-Length', String(st.size)); } catch {}
      const stream = createReadStream(filePath);
      stream.on('error', () => { try { res.status(500).end(); } catch {} });
      return stream.pipe(res);
    } catch (e) {
      try { return res.status(500).send('Internal error'); } catch { return; }
    }
  }
}
