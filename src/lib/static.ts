import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'node:fs';
import fss from 'node:fs/promises';
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
    if (method !== 'GET' && method !== 'HEAD') return false; // QUE get et head
    if (!pathname.startsWith('/public/')) return false; // QUE public

    let relatifPath = pathname.slice('/public/'.length);
    if (relatifPath === '' || relatifPath.endsWith('/')) relatifPath += 'index.html';

    const filePath = path.join(publicPath, relatifPath);

    try {
      await fss.access(filePath, fs.constants.R_OK);
    } catch (e) {
      console.error(e);
      return false;
    }

    const extension = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[extension] ?? 'application/octet-stream');

    if (method === 'HEAD') {
      res.end();
      return true;
    }
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Read fail');
      }
    });
    stream.pipe(res);
    return true;
  };
}
