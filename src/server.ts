import http from 'node:http';
import path from 'node:path';

import { configDotenv } from 'dotenv';

import staticServing from '@lib/static.js';
import ViewRender from '@lib/view.js';

configDotenv();
const PORT = Number(process.env.PORT || 8000);
const VIEWS_DIR = path.resolve(process.cwd(), 'src/views');

const serveStatic = staticServing(path.resolve(process.cwd(), 'public'));
const view = new ViewRender({
  viewsDir: VIEWS_DIR,
  cache: false, // Au pire il sera jamais à true => mettre en true si prod ou .env plutar
  globals: { thisTest: 'test d ejs depuis global :3' },
});

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  const passedUrl = new URL(url!, `http://${req.headers.host}`);
  const { pathname } = passedUrl;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const contentType = req.headers['content-type'] ?? '';
  const isJson = contentType.includes('application/json');
  const POST_MAX = 1000000;
  let size = 0;

  if (await serveStatic(req, res, pathname)) return;

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (method === 'GET' && pathname === '/') {
    const html = await view.render('layouts/layout.ejs', 'pages/dashboard.ejs', {
      title: 'Dahsboard',
      ejsTest: 'testEjs',
    });
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (method === 'POST' && pathname === '/') {
    console.log('POST OUI');
    if (!isJson) {
      res.writeHead(415, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ data: `Unsupported type : use application/json. Used : ${contentType}` }));
      return;
    }
    let body = '';
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > POST_MAX) {
        res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Too large, size max 1Mo' }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log(data);
        res.writeHead(204);
        res.end();
      } catch (e) {
        console.error(e);
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    req.on('error', () => {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Bad request' }));
    });
  }
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
