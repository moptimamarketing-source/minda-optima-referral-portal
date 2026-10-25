import { createHash, randomBytes } from 'node:crypto';
import { sendEmail, esc, SITE, TELEGRAM_LINK } from '../lib/email.mjs';

const SESSION_DAYS = 30;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

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

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

async function createSession(phone, email) {
  const token = randomBytes(32).toString('base64url');
  const res = await sb('referrer_sessions', {
    method: 'POST',
    body: {
      token_hash: hashToken(token),
      phone,
      email,
      expires_at: new Date(Date.now() + SESSION_DAYS * 864e5).toISOString(),
    },
  });
  return res.ok ? token : null;
}

async function sessionFor(token) {
  if (typeof token !== 'string' || token.length < 20) return null;
  const res = await sb(`referrer_sessions?select=phone,email,expires_at&token_hash=eq.${hashToken(token)}`);
  const row = res.data?.[0];
  if (!res.ok || !row || new Date(row.expires_at) < new Date()) return null;
  return row;
}

function confirmationEmail({ name, code, phone, email, bankName, bankAccount, occupation }) {
  const share = `Anak aku dah pandai baca dengan Minda Optima! Guna kod *${code}* bila daftar, kau dapat 1 kelas PERCUMA & aku dapat RM100 🎉 👉 ${SITE}/daftar.html?ref=${code}`;
  const waLink = `https://wa.me/?text=${encodeURIComponent(share)}`;
  const tgLink = TELEGRAM_LINK;
  const row = (label, value) => `<tr><td style="padding:6px 0;color:#64748b;width:40%">${label}</td><td style="padding:6px 0;font-weight:600">${esc(value || '—')}</td></tr>`;
  const masked = bankAccount ? `•••• ${String(bankAccount).slice(-4)}` : '—';

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b">
      <h2 style="color:#0D2A5C">Pendaftaran berjaya</h2>
      <p>Halo ${esc(name)}, terima kasih kerana mendaftar sebagai rujukan Minda Optima.</p>

      <p style="font-size:14px;color:#64748b;margin-bottom:4px">Kod rujukan anda</p>
      <p style="font-size:28px;font-weight:800;letter-spacing:2px;color:#0D2A5C;margin-top:0">${esc(code)}</p>

      <h3 style="color:#0D2A5C;margin-bottom:4px">Butiran anda</h3>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        ${row('Nama', name)}
        ${row('Nombor telefon', phone)}
        ${row('Emel', email)}
        ${row('Nama bank', bankName)}
        ${row('Nombor akaun', masked)}
        ${row('Pekerjaan', occupation)}
      </table>
      <p style="font-size:13px;color:#64748b">Untuk mengubah butiran, sila hubungi sokongan melalui WhatsApp.</p>

      <h3 style="color:#0D2A5C;margin-bottom:4px">Kongsi kod anda</h3>
      <p style="font-size:14px;color:#64748b;margin-top:0">Salin mesej di bawah dan hantar kepada rakan anda:</p>
      <div style="background:#ecfdf5;padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-word">${esc(share)}</div>
      <p style="margin:16px 0">
        <a href="${waLink}" style="display:inline-block;background:#25D366;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Kongsi di WhatsApp</a>
      </p>

      ${tgLink ? `
      <h3 style="color:#0D2A5C;margin-bottom:4px">Komuniti Telegram</h3>
      <p style="font-size:14px;color:#64748b;margin-top:0">Dapatkan update, tips dan pengumuman rasmi di sini.</p>
      <p><a href="${esc(tgLink)}" style="display:inline-block;background:#229ED9;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Sertai Komuniti Telegram</a></p>` : ''}

      <p style="margin-top:24px"><a href="${SITE}/dashboard.html" style="color:#0D2A5C">Buka dashboard anda</a></p>
    </div>`;
}

const OTP_ERRORS = {
  invalid_phone: 'Nombor telefon tidak sah. Contoh: 012-3456789',
  invalid_email: 'Emel tidak sah.',
};

async function sendOtp(body) {
  const otpRes = await sb('rpc/send_otp', {
    method: 'POST',
    body: { p_phone: String(body.phone ?? '').trim(), p_email: String(body.email ?? '').trim() },
  });
  const r = otpRes.data;
  if (!otpRes.ok || !r?.ok) {
    return json(422, { error: OTP_ERRORS[r?.reason] || 'Gagal hantar OTP. Sila cuba lagi.' });
  }

  const emailRes = await sendEmail(
    r.email,
    'Kod OTP — Minda Optima',
    `<h2>Kod OTP Anda</h2>
    <p>Masukkan kod di bawah untuk mengesahkan pendaftaran Minda Optima:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${r.otp}</p>
    <p>Kod ini akan luput dalam 10 minit.</p>`,
  );
  if (!emailRes.ok) return json(502, { error: emailRes.error });

  return json(200, { ok: true, phone: r.phone, email: r.email });
}

async function verifyOtp(body) {
  const phone = String(body.phone ?? '').trim();
  const otp = String(body.otp ?? '').trim();
  if (!phone || !otp) return json(422, { error: 'Nombor telefon dan OTP diperlukan.' });

  const verifyRes = await sb('rpc/verify_otp', {
    method: 'POST',
    body: { p_phone: phone, p_otp: otp },
  });
  if (!verifyRes.ok) {
    console.error('verify_otp error:', verifyRes.data);
    return json(502, { error: 'Gagal sahkan OTP.' });
  }

  const result = verifyRes.data;
  if (!result.ok) {
    if (result.reason === 'otp_invalid') return json(422, { error: 'Kod OTP salah atau sudah digunakan.' });
    if (result.reason === 'otp_expired') return json(422, { error: 'Kod OTP telah luput. Minta kod baru.' });
    return json(422, { error: 'Sila minta kod OTP baru.' });
  }

  const token = await createSession(result.phone, result.email);
  if (!token) return json(502, { error: 'Gagal mulakan sesi. Sila cuba lagi.' });

  return json(200, {
    ok: true,
    token,
    phone: result.phone,
    email: result.email,
    isNewUser: result.isNewUser,
  });
}

async function register(body) {
  const s = await sessionFor(body.token);
  if (!s) return json(401, { error: 'Sesi tamat. Sila log masuk semula.' });

  const r = await sb('rpc/register_referrer', {
    method: 'POST',
    body: {
      p_phone: s.phone,
      p_name: body.name ?? null,
      p_email: s.email,
      p_bank_account: body.bank_account ?? null,
      p_bank_name: body.bank_name ?? null,
      p_occupation: body.occupation ?? null,
    },
  });
  if (!r.ok) return json(502, { error: 'Gagal daftar. Sila cuba lagi.' });

  const REG_ERRORS = {
    name_required: 'Nama penuh diperlukan (2-80 aksara).',
    email_invalid: 'Emel tidak sah.',
    bank_account_invalid: 'Nombor akaun bank tidak sah (6-20 digit).',
    bank_name_required: 'Sila isi nama bank.',
    invalid_phone: 'Nombor telefon tidak sah.',
  };
  if (!r.data?.ok) {
    return json(422, { error: REG_ERRORS[r.data?.reason] || 'Tidak dapat meneruskan. Sila cuba lagi.' });
  }

  const details = {
    name: String(body.name ?? '').trim(),
    code: r.data.code,
    phone: s.phone,
    email: s.email,
    bankName: String(body.bank_name ?? '').trim(),
    bankAccount: String(body.bank_account ?? '').replace(/\D/g, ''),
    occupation: String(body.occupation ?? '').trim(),
  };
  await sendEmail(s.email, `Pendaftaran Berjaya — Kod Rujukan ${r.data.code}`, confirmationEmail(details));

  return json(200, { ok: true, code: r.data.code });
}

async function dashboard(body) {
  const s = await sessionFor(body.token);
  if (!s) return json(401, { error: 'Sila log masuk.' });

  const r = await sb('rpc/referrer_dashboard', { method: 'POST', body: { p_phone: s.phone } });
  if (!r.ok || !r.data?.ok) return json(401, { error: 'Sila log masuk.' });
  return json(200, r.data);
}

async function logout(body) {
  if (typeof body.token === 'string') {
    await sb(`referrer_sessions?token_hash=eq.${hashToken(body.token)}`, { method: 'DELETE' });
  }
  return json(200, { ok: true });
}

export default async (req) => {
  try {
    if (req.method !== 'POST') return json(405, { error: 'Kaedah tidak dibenarkan.' });

    const missing = [];
    if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (missing.length > 0) {
      console.error('Env vars missing:', missing);
      return json(500, { error: `Konfigurasi tidak lengkap: ${missing.join(', ')}` });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('JSON parse error:', e);
      return json(400, { error: 'Data tidak sah.' });
    }

    if (body.action === 'send-otp') return await sendOtp(body);
    if (body.action === 'verify-otp') return await verifyOtp(body);
    if (body.action === 'register') return await register(body);
    if (body.action === 'dashboard') return await dashboard(body);
    if (body.action === 'logout') return await logout(body);

    return json(400, { error: 'Tindakan tidak dikenali.' });
  } catch (e) {
    console.error('Unhandled error:', e);
    return json(500, { error: `Ralat pelayan: ${e.message}` });
  }
};
