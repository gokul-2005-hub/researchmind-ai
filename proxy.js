const http = require('http');

const PORT = 9000;
const FRONTEND_TARGET = 'http://localhost:5173';
const BACKEND_TARGET = 'http://localhost:8000';

const server = http.createServer((req, res) => {
  const isApi = req.url.startsWith('/api/') || req.url.startsWith('/health');
  const target = isApi ? BACKEND_TARGET : FRONTEND_TARGET;
  
  const targetUrl = new URL(req.url, target);
  
  // Overwrite host header to match target URL
  req.headers.host = targetUrl.host;
  
  const proxyReq = http.request({
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: req.headers
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`Proxy error connecting to ${target}:`, err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`Bad Gateway: Could not connect to target service at ${target}. Make sure it is running.`);
  });

  req.pipe(proxyReq, { end: true });
});

// Handle WebSocket proxying for Vite HMR
server.on('upgrade', (req, socket, head) => {
  const isApi = req.url.startsWith('/api/') || req.url.startsWith('/health');
  const target = isApi ? BACKEND_TARGET : FRONTEND_TARGET;
  const targetUrl = new URL(req.url, target);

  req.headers.host = targetUrl.host;

  const proxyReq = http.request({
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: req.headers
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    let responseHeaders = `HTTP/1.1 101 Switching Protocols\r\n`;
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      if (Array.isArray(value)) {
        value.forEach(v => {
          responseHeaders += `${key}: ${v}\r\n`;
        });
      } else {
        responseHeaders += `${key}: ${value}\r\n`;
      }
    }
    responseHeaders += '\r\n';
    socket.write(responseHeaders);
    socket.write(proxyHead);

    proxySocket.pipe(socket).pipe(proxySocket);
  });

  proxyReq.on('error', (err) => {
    console.error('WebSocket proxy error:', err.message);
    socket.end();
  });

  proxyReq.end();
});

server.listen(PORT, () => {
  console.log(`ResearchMind Proxy Server is running on http://localhost:${PORT}`);
  console.log(`- Proxying API requests to ${BACKEND_TARGET}`);
  console.log(`- Proxying UI requests to ${FRONTEND_TARGET}`);
});
