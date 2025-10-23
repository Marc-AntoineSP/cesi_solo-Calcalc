import http from 'node:http';

const PORT = Number(process.env.PORT || 5173);

const server = http.createServer((req, res) => {
    const { method, url } = req;
    const passedUrl = new URL(url!, `http://${req.headers.host}`);
    const pathname = passedUrl.pathname;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    if (method === 'GET' && pathname === '/') {
        console.log('OUI');
        res.writeHead(200, {
            'content-type': 'text/html; charset=utf-8'
        });
        res.end('<h1>test</h1>');
        return;
    }

    if (method === 'POST' && pathname === '/'){
        console.log('POST OUI');
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            console.log(body);
          }catch(e){console.error(e)}
        });
        res.writeHead(204);
        res.end();
        return;
    }
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
