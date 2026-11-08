// Server local ringkas untuk preview/test sebenar tanpa deploy: sajikan web/ statik,
// dan laluan /.netlify/functions/<nama> terus panggil netlify/functions/<nama>.mjs asal
// (guna Request/Response standard yang sama macam Netlify/Cloudflare). Guna .env untuk
// SUPABASE_URL dll — jalankan dengan: node --env-file=.env scripts/dev-server.mjs
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WEB_DIR = join(ROOT, 'web');
const FUNCTIONS_DIR = join(ROOT, 'netlify', 'functions');
const PORT = Number(process.env.PORT) || 8888;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

function nodeReqToWebRequest(req, body) {
  const url = `http://localhost:${PORT}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (v) headers.set(k, Array.isArray(v) ? v.join(',') : v);
  return new Request(url, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function serveStatic(req, res) {
  let path = normalize(decodeURIComponent(req.url.split('?')[0]));
  if (path === '/') path = '/index.html';
  let filePath = join(WEB_DIR, path);
  if (!filePath.startsWith(WEB_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    const htmlTry = `${filePath}.html`;
    if (existsSync(htmlTry)) filePath = htmlTry;
    else { filePath = join(WEB_DIR, '404.html'); res.statusCode = 404; }
  }
  if (!existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
  res.setHeader('Content-Type', MIME[extname(filePath)] || 'application/octet-stream');
  createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const m = req.url.match(/^\/\.netlify\/functions\/([a-z-]+)/);
  if (m) {
    const fnPath = join(FUNCTIONS_DIR, `${m[1]}.mjs`);
    if (!existsSync(fnPath)) { res.writeHead(404); res.end('Function not found'); return; }
    try {
      const body = await readBody(req);
      const { default: handler } = await import(`${fnPath}?t=${Date.now()}`);
      const webRes = await handler(nodeReqToWebRequest(req, body));
      res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));
      res.end(Buffer.from(await webRes.arrayBuffer()));
    } catch (e) {
      console.error(`[fn:${m[1]}]`, e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }
  await serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Dev server (local, functions live): http://localhost:${PORT}`);
});
