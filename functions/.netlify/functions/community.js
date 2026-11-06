// Adapter Cloudflare Pages Functions -> netlify/functions/community.mjs. Lihat auth.js untuk nota.
import handler from '../../../netlify/functions/community.mjs';

export async function onRequest({ request, env }) {
  globalThis.process = globalThis.process || {};
  globalThis.process.env = env;
  return handler(request);
}
