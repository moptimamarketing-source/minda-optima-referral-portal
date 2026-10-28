import nodemailer from 'nodemailer';

export const SITE = (process.env.PUBLIC_SITE_URL || 'https://minda-optima-referral.netlify.app').replace(/\/+$/, '');
export const TELEGRAM_LINK = process.env.TELEGRAM_LINK || 'https://t.me/mindaoptimaofficial';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

/** Blok 2 gambar marketing (pilihan) untuk templat email. Pulangkan '' bila takde
 * gambar langsung supaya email tak ada ruang kosong. Boleh satu atau dua gambar. */
export function imagesBlock(image1, image2) {
  const imgs = [image1, image2].filter(Boolean);
  if (!imgs.length) return '';
  const tags = imgs.map((src, i) => `<img src="${esc(src)}" alt="Minda Optima" style="width:100%;max-width:500px;border-radius:8px;${i < imgs.length - 1 ? 'margin-bottom:16px' : ''}">`).join('\n          ');
  return `
        <div style="margin:40px 0;text-align:center">
          ${tags}
        </div>`;
}

/** Ambil tetapan (key/value) dari jadual public.settings, untuk kandungan email yang
 * boleh diedit via admin (gambar header, tajuk, dll). Pulangkan {} bila gagal/offline
 * supaya email masih boleh dihantar dengan nilai lalai (fallback) dalam templat. */
export async function fetchSettings(keys) {
  try {
    const url = process.env.SUPABASE_URL.replace(/\/+$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(`${url}/rest/v1/settings?select=key,value&key=in.(${keys.join(',')})`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return {};
    const rows = await res.json();
    const out = {};
    for (const row of rows) out[row.key] = row.value;
    return out;
  } catch {
    return {};
  }
}

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

async function sendViaResend(to, subject, html) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM, to: [to], subject, html }),
    });
    if (res.ok) return true;
    console.error('Resend rejected:', res.status, await res.text().catch(() => ''));
  } catch (e) {
    console.error('Resend fetch failed:', e.message);
  }
  return false;
}

async function sendViaGmail(to, subject, html) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return false;
  try {
    await getTransporter().sendMail({ from: `Minda Optima <${process.env.GMAIL_USER}>`, to, subject, html });
    return true;
  } catch (e) {
    console.error('Gmail send failed:', e.code, e.message);
    return false;
  }
}

export async function sendEmail(to, subject, html) {
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM && await sendViaResend(to, subject, html)) {
    return { ok: true };
  }
  if (await sendViaGmail(to, subject, html)) return { ok: true };
  return { ok: false, error: 'Gagal hantar email. Sila cuba lagi.' };
}
