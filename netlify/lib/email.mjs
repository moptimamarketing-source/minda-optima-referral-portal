import nodemailer from 'nodemailer';

export const SITE = (process.env.PUBLIC_SITE_URL || 'https://minda-optima-referral.netlify.app').replace(/\/+$/, '');
export const TELEGRAM_LINK = process.env.TELEGRAM_LINK || 'https://t.me/mindaoptimaofficial';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

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
