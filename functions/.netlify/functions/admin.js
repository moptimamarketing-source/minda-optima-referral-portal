// Adapter Cloudflare Pages Functions -> netlify/functions/admin.mjs. Lihat auth.js untuk nota.
import handler from '../../../netlify/functions/admin.mjs';

export async function onRequest({ request, env }) {
  globalThis.process = globalThis.process || {};
  globalThis.process.env = env;
  return handler(request);
}
