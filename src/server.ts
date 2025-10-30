import http from 'node:http';
import path from 'node:path';

import { configDotenv } from 'dotenv';

import Requests from '@lib/request.js';
import staticServing from '@lib/static.js';
import ViewRender from '@lib/view.js';

configDotenv();
const PORT = Number(process.env.PORT || 8000);
const VIEWS_DIR = path.resolve(process.cwd(), 'src/views');
const dbReq = new Requests();

const serveStatic = staticServing(path.resolve(process.cwd(), 'public'));
const view = new ViewRender({
  viewsDir: VIEWS_DIR,
  cache: false, // Au pire il sera jamais à true => mettre en true si prod ou .env plutar
  globals: { thisTest: 'test d ejs depuis global :3' },
});

const server = http.createServer(async (req, res) => {
  try {
    const { method, url } = req;
    const passedUrl = new URL(url!, `http://${req.headers.host}`);
    const { pathname } = passedUrl;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const contentType = req.headers['content-type'] ?? '';
    const isJson = contentType.includes('application/json');
    const POST_MAX = 1_000_000;
    let size = 0;

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (method === 'GET' && pathname === '/') {
      try {
        const html = await view.render('layouts/layout.ejs', 'pages/dashboard.ejs', {
          title: 'Dashboard',
          ejsTest: 'testEjs',
          gridItemList: await dbReq.getAllItems(),
        });
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (err) {
        console.error('[EJS] render failed:', err);
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Template error');
      }
      return;
    }

    if (method === 'GET' && pathname === '/api/products') {
      try {
        const products = await dbReq.getAllItems();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: false, data: products }));
        return;
      } catch (e) {
        console.error(e);
      }
    }

    if (method === 'POST' && pathname === '/') {
      if (!isJson) {
        res.writeHead(415, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: `Unsupported type: ${contentType}` }));
        return;
      }
      let body = '';
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > POST_MAX) {
          res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Too large, max 1MB' }));
          req.destroy();
        } else {
          body += chunk;
        }
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          console.log('[POST /] data:', data);
          res.writeHead(204);
          res.end();
        } catch {
          res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      req.on('error', () => {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      });
      return;
    }

    const served = await serveStatic(req, res, pathname);
    if (served) return;

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
    } else {
      try { res.end(); } catch (e) { console.error(e); }
    }
  }
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
