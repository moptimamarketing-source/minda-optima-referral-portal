// Adapter Cloudflare Pages Functions -> netlify/functions/auth.mjs.
// Logik asal tak disentuh (satu source of truth); kita cuma polyfill
// process.env (Cloudflare bagi env melalui context.env, bukan process.env)
// supaya handler asal boleh jalan tanpa ubah.
import handler from '../../../netlify/functions/auth.mjs';

export async function onRequest({ request, env }) {
  globalThis.process = globalThis.process || {};
  globalThis.process.env = env;
  return handler(request);
}
