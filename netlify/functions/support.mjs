import { randomBytes } from 'node:crypto';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const MAX_SCREENSHOT_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

async function sb(path, { method = 'GET', body } = {}) {
  const url = process.env.SUPABASE_URL.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { ok: res.ok, data };
}

async function uploadScreenshot(base64, mimeType) {
  const ext = ALLOWED_TYPES[mimeType];
  if (!ext) return { error: 'Jenis fail tak disokong. Guna PNG, JPG atau WEBP.' };

  let buf;
  try {
    buf = Buffer.from(base64, 'base64');
  } catch {
    return { error: 'Gambar tak sah.' };
  }
  if (buf.length > MAX_SCREENSHOT_BYTES) return { error: 'Saiz gambar terlalu besar (maks 4MB).' };

  const path = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
  const url = process.env.SUPABASE_URL.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/storage/v1/object/support-screenshots/${path}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': mimeType },
    body: buf,
  });
  if (!res.ok) {
    console.error('screenshot upload failed:', res.status, await res.text().catch(() => ''));
    return { error: 'Gagal muat naik gambar. Sila cuba lagi.' };
  }
  return { path };
}

export default async (req) => {
  try {
    if (req.method !== 'POST') return json(405, { error: 'Kaedah tak dibenarkan.' });

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Env vars missing for support.mjs');
      return json(500, { error: 'Konfigurasi server belum lengkap.' });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'Data tak sah.' });
    }

    const name = clean(body.name, 80);
    const accountCode = clean(body.accountCode, 40);
    const problem = clean(body.problem, 1000);

    if (name.length < 2) return json(422, { error: 'Nama penuh diperlukan.' });
    if (problem.length < 5) return json(422, { error: 'Sila terangkan masalah anda.' });

    let screenshotPath = null;
    if (body.screenshotBase64 && body.screenshotType) {
      const up = await uploadScreenshot(body.screenshotBase64, body.screenshotType);
      if (up.error) return json(422, { error: up.error });
      screenshotPath = up.path;
    }

    const ins = await sb('support_requests', {
      method: 'POST',
      body: { name, account_code: accountCode || null, problem, screenshot_path: screenshotPath },
    });
    if (!ins.ok) {
      console.error('support_requests insert error:', ins.data);
      return json(502, { error: 'Gagal hantar. Sila cuba lagi.' });
    }

    return json(200, { ok: true });
  } catch (e) {
    console.error('Unhandled error:', e);
    return json(500, { error: `Ralat pelayan: ${e.message}` });
  }
};
