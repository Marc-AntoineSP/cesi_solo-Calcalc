import http, { ServerResponse } from 'node:http';
import path from 'node:path';

import { configDotenv } from 'dotenv';

import Requests from '@lib/request.js';
import { validatePostProduct } from '@lib/schemas/postProductSchema.js';
import staticServing from '@lib/static.js';
import type { Product } from '@lib/types.js';
import ViewRender from '@lib/view.js';
import { validatePatchProduct } from '@lib/schemas/patchProductSchema.js';

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

const httpOk = (res:ServerResponse, statusCode:number, data:Array<Product>|Product|null = null, ct:string = 'application/json; charset=utf-8') => {
  res.writeHead(statusCode, { 'Content-Type': ct });
  if (data === null) {
    res.end();
  } else {
    res.end(JSON.stringify({ error: false, data }));
  }
};

const httpFail = (res:ServerResponse, statusCode:number, reason:string, ct:string = 'application/json; charset=utf-8') => {
  res.writeHead(statusCode, { 'Content-Type': ct });
  res.end(JSON.stringify({ error: true, reason }));
};

const server = http.createServer(async (req, res) => {
  try {
    const { method, url } = req;
    const passedUrl = new URL(url!, `http://${req.headers.host}`);
    const { pathname } = passedUrl;
    const slug = passedUrl.pathname.split('/').filter(Boolean);
    console.log(slug);

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
        httpFail(res, 500, 'Template Error');
      }
      return;
    }

    if (method === 'GET' && pathname === '/api/products') {
      try {
        const products = await dbReq.getAllItems();
        httpOk(res, 200, products);
        return;
      } catch (e) {
        console.error(e);
        httpFail(res, 500, 'Oopsie :3');
      }
      return;
    }

    if (method === 'GET' && pathname.startsWith('/api/products') && slug.length === 3) {
      let productId;
      try {
        productId = parseInt(slug[2]!, 10);
        const product = await dbReq.getOneProduct(productId);
        httpOk(res, 200, product);
        return;
      } catch (e) {
        httpFail(res, 500, `Product with id ${productId}. Error : ${e}`);
        return;
      }
    }

    if (method === 'POST' && pathname.startsWith('/api/products')) {
      if (!isJson) {
        httpFail(res, 415, `Unsupported type: ${contentType}`);
        return;
      }
      let body = '';
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > POST_MAX) {
          httpFail(res, 413, 'Too large, max 1MB');
          req.destroy();
        } else {
          body += chunk;
        }
      });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          console.log('[POST /] data:', data);
          const schemaValidate = validatePostProduct(data);
          if (schemaValidate.ok === false) {
            httpFail(res, 405, 'Bad body');
          } else {
            await dbReq.addProduct(schemaValidate.productPost);
            httpOk(res, 201);
          }
        } catch {
          httpFail(res, 400, 'Invalid JSON');
        }
      });
      req.on('error', () => {
        httpFail(res, 400, 'Bad request');
      });
      return;
    }

    if (method === 'PATCH' && pathname.startsWith('/api/products') && slug.length === 3) {
      if (!isJson) {
        httpFail(res, 415, `Unsupported type: ${contentType}`);
        return;
      }
      let body = '';
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > POST_MAX) {
          httpFail(res, 413, 'Too large, max 1MB');
          req.destroy();
        } else {
          body += chunk;
        }
      });
      req.on('end', async () => {
        let productId;
        try {
          productId = parseInt(slug[2]!, 10);
          const data = JSON.parse(body);
          console.log('[POST /] data:', data);
          const schemaValidate = validatePatchProduct(data);
          if (schemaValidate.ok === false) {
            httpFail(res, 405, 'Bad body');
          } else {
            await dbReq.modifyProduct(schemaValidate.productPatch, productId);
            httpOk(res, 201);
          }
        } catch {
          httpFail(res, 400, 'Invalid JSON');
        }
      });
      req.on('error', () => {
        httpFail(res, 400, 'Bad request');
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
