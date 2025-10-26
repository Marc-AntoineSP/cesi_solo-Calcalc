import fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export default function staticServing(publicDir: string) {
  const publicPath = path.resolve(publicDir); // A modif pour plus tard en + secu
  return async function serveStatic(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
  ): Promise<boolean> {
    const method = req.method ?? 'GET';
    const filePath = path.join(publicPath, pathname);
    try {
      const extension = path.extname(filePath).toLowerCase();
      res.statusCode = 200;
      res.setHeader('Content-Type', MIME[extension] ?? 'application/octet-stream');
      if (method === 'HEAD') {
        res.end(); return true;
      }
      const stream = await fs.createReadStream(filePath);
      stream.on('error', () => {
        res.statusCode = 500;
        res.end('Read fail !');
      });
      stream.pipe(res);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };
}
