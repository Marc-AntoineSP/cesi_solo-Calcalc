import http from 'node:http';

const PORT = Number(process.env.PORT || 5173);

const server = http.createServer((req, res) => {
    const { method, url } = req;
    const passedUrl = new URL(url!, `http://${req.headers.host}`);
    const pathname = passedUrl.pathname;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');


    const contentType = req.headers['content-type'] ?? '';
    const isJson = contentType.includes('application/json');
    const POST_MAX = 1000000;
    let size = 0;

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
      if(!isJson){
        res.writeHead(415, {"Content-Type":"application/json; charset=utf-8"});
        res.end(JSON.stringify({data:`Unsupported type : use application/json. Used : ${contentType}`}));
        return;
      }
      let body = '';
      req.on('data', chunk => {
        size += chunk.length;
        if(size > POST_MAX){
          res.writeHead(413, {"Content-Type":"application/json; charset=utf-8"});
          res.end(JSON.stringify({error:'Too large, size max 1Mo'}));
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
        }catch(e){
          console.error(e);
          res.writeHead(400, {'content-type':'application/json; charset=utf-8'});
          res.end(JSON.stringify({error:'Invalid JSON'}));
        }
      });
      req.on('error', () => {
        res.writeHead(400, {'Content-Type':'application/json; charset=utf-8'});
        res.end(JSON.stringify({error:'Bad request'}));
      })
      return;
    }
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
