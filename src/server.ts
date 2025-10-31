/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable consistent-return */
/* eslint-disable max-len */
import http, { ServerResponse } from 'node:http';
import path from 'node:path';

import bcrypt from 'bcrypt';
import { configDotenv } from 'dotenv';
import { Pool } from 'pg';

import Requests from '@lib/request.js';
import { validatePatchProduct } from '@lib/schemas/patchProductSchema.js';
import { validatePostProduct } from '@lib/schemas/postProductSchema.js';
import {
  clearSessionCookie,
  COOKIE, createSession, destroySession, getSession, makeSessionCookie, parseCookies,
} from '@lib/sessionHelper.js';
import staticServing from '@lib/static.js';
import type { Country, Product } from '@lib/types.js';
import ViewRender from '@lib/view.js';

configDotenv();
const PORT = Number(process.env.PORT || 8000);
const VIEWS_DIR = path.resolve(process.cwd(), 'src/views');
const dbReq = new Requests();

const serveStatic = staticServing(path.resolve(process.cwd(), 'public'));
const pool = new Pool({ connectionString: process.env.PGCONNSTRING });
pool.on('error', (e) => console.error('[pg pool error]', e));

const view = new ViewRender({
  viewsDir: VIEWS_DIR,
  cache: false, // Au pire il sera jamais à true => mettre en true si prod ou .env plutar
  globals: { thisTest: 'test d ejs depuis global :3' },
});

const httpOk = (res:ServerResponse, statusCode:number, data:Array<Product>|Product|Array<Country>|null = null, ct:string = 'application/json; charset=utf-8') => {
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

const redirect = (res: http.ServerResponse, location: string, cookies: string[] = []) => {
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
};

const readForm = (req: http.IncomingMessage): Promise<Record<string, string>> => new Promise((resolve, reject) => {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const obj = Object.fromEntries(new URLSearchParams(body)) as Record<string, string>;
    resolve(obj);
  });
  req.on('error', reject);
});

const server = http.createServer(async (req, res) => {
  try {
    const { method, url } = req;
    const passedUrl = new URL(url!, `http://${req.headers.host}`);
    const { pathname } = passedUrl;
    const slug = passedUrl.pathname.split('/').filter(Boolean);

    console.log(slug);

    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies[COOKIE];
    const user = await getSession(pool, sid);

    const isPublic = pathname === '/login'
      || pathname === '/register'
      || pathname.startsWith('/public/')
      || pathname === '/favicon.ico';

    if (!user && !isPublic) {
      return redirect(res, '/login');
    }

    const isApi = pathname.startsWith('/api/') || pathname.startsWith('/auth/');
    if (!user && !isPublic && !isApi) {
      return redirect(res, '/login');
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const contentType = req.headers['content-type'] ?? '';
    const isJson = contentType.includes('application/json');
    const POST_MAX = 1_000_000;
    let size = 0;

    // OPTIONS

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // --------------------------- AUTH ---------------------------
    if (method === 'GET' && pathname === '/login') {
      if (user) { return redirect(res, '/admin'); }
      const html = await view.render('layouts/layout.ejs', 'pages/login.ejs', {
        user,
        title: 'Login',
        countryList: [],
        gridItemList: [],
      });
      res.setHeader('content-type', 'text/html; charset=utf-8');
      return res.end(html);
    }

    if (method === 'POST' && pathname === '/login') {
      const form = await readForm(req);
      const { username = '', password = '' } = form;

      const q = 'SELECT id, username, role, hash_password FROM users WHERE username = $1 LIMIT 1';
      const { rows } = await pool.query(q, [username]);
      const row = rows[0];
      if (!row) return redirect(res, '/login');

      const ok = await bcrypt.compare(password, row.hash_password);
      if (!ok) return redirect(res, '/login');

      if (sid) await destroySession(pool, sid);

      const { sid: newSid } = await createSession(pool, row.id);
      const setCookie = makeSessionCookie(newSid);
      return redirect(res, '/admin', [setCookie]);
    }

    if (method === 'POST' && pathname === '/register') {
      const form = await readForm(req);
      const { username = '', password = '' } = form;
      if (!username || !password) return redirect(res, '/login');

      const hash = await bcrypt.hash(password, 12);
      const role: 'admin' | 'user' = /^(on|true|1)$/i.test(form.is_admin ?? '') ? 'admin' : 'user';
      const ins = 'INSERT INTO users (username, hash_password, role) VALUES ($1,$2,$3) RETURNING id';
      const { rows } = await pool.query(ins, [username, hash, role]);
      const userId = rows[0].id;

      const { sid: newSid } = await createSession(pool, userId);
      const setCookie = makeSessionCookie(newSid);
      return redirect(res, '/', [setCookie]);
    }

    if (method === 'POST' && pathname === '/logout') {
      if (sid) await destroySession(pool, sid);
      const clear = clearSessionCookie();
      return redirect(res, '/login', [clear]);
    }

    if (method === 'GET' && pathname === '/admin') {
      if (!user) return redirect(res, '/login');
      return redirect(res, '/');
    }
    // --------------------------- GET ----------------------------

    if (method === 'GET' && pathname === '/') {
      try {
        if (!user) return redirect(res, '/login');
        if (user.role !== 'admin') {
          const html = await view.render('layouts/layout.ejs', 'pages/errors/forbidden.ejs', { title: 'Accès refusé', user });
          res.setHeader('content-type', 'text/html; charset=utf-8');
          return res.end(html);
        }
        const html = await view.render('layouts/layout.ejs', 'pages/dashboard.ejs', {
          user,
          title: 'Dashboard',
          ejsTest: 'testEjs',
          gridItemList: await dbReq.getAllItems(),
          countryList: await dbReq.getAllCountries(),
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

    if (method === 'GET' && pathname === '/api/countries') {
      try {
        const countries = await dbReq.getAllCountries();
        console.log(countries);
        httpOk(res, 200, countries);
        return;
      } catch (e) {
        console.error(e);
        httpFail(res, 500, 'Oopsie :3');
      }
      return;
    }

    // --------------------------- POST ---------------------------

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
            const product = await dbReq.addProduct(schemaValidate.productPost);
            httpOk(res, 201, product);
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

    // --------------------------- PATCH --------------------------

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

    // --------------------------- DELETE -------------------------

    if (method === 'DELETE' && pathname.startsWith('/api/products') && slug.length === 3) {
      let productId;
      try {
        productId = parseInt(slug[2]!, 10);
        await dbReq.deleteProduct(productId);
        httpOk(res, 200);
        return;
      } catch (e) {
        httpFail(res, 500, `Product with id ${productId}. Error : ${e}`);
        return;
      }
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
