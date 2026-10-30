import { randomBytes } from 'node:crypto';
import { sendEmail, esc, SITE } from '../lib/email.mjs';

const ADMIN_NOTIFY_EMAIL = 'moptima.marketing@gmail.com';

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
    const code = clean(body.code, 20);
    const phone = clean(body.phone, 20);
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
      body: { name, code: code || null, phone: phone || null, problem, screenshot_path: screenshotPath },
    });
    if (!ins.ok) {
      console.error('support_requests insert error:', ins.data);
      return json(502, { error: 'Gagal hantar. Sila cuba lagi.' });
    }

    const notifyHtml = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b">
        <h2 style="color:#0D2A5C">🔔 Permintaan Sokongan Baharu</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">
          <tr><td style="padding:6px 0;color:#64748b;width:30%">Nama</td><td style="padding:6px 0;font-weight:600">${esc(name)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Kod Rujukan</td><td style="padding:6px 0;font-weight:600">${esc(code || '—')}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Telefon</td><td style="padding:6px 0;font-weight:600">${esc(phone || '—')}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;vertical-align:top">Masalah</td><td style="padding:6px 0;font-weight:600">${esc(problem)}</td></tr>
          ${screenshotPath ? '<tr><td style="padding:6px 0;color:#64748b">Screenshot</td><td style="padding:6px 0;font-weight:600">Ada (lihat di admin panel)</td></tr>' : ''}
        </table>
        <p style="margin-top:20px"><a href="${SITE}/admin" style="display:inline-block;background:#0D2A5C;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Buka Admin Panel</a></p>
      </div>`;
    // Awaited (not fire-and-forget): a Netlify Function's background work can be
    // killed the moment the response is returned, so the send must finish first.
    // A failed notification should never fail the user's submission, though.
    try {
      await sendEmail(ADMIN_NOTIFY_EMAIL, `🔔 Permintaan Sokongan Baharu — ${name}`, notifyHtml);
    } catch (e) {
      console.error('Admin notify email failed:', e);
    }

    return json(200, { ok: true });
  } catch (e) {
    console.error('Unhandled error:', e);
    return json(500, { error: `Ralat pelayan: ${e.message}` });
  }
};
