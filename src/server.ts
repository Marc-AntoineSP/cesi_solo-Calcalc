import http from 'node:http';

const PORT = Number(process.env.PORT || 5173);

const server = http.createServer((_req, res) => {
  res.statusCode = 200;
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.end('Hello from Node + TypeScript + pnpm 👋');
});

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
