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

export function confirmationEmail({ name, code, phone, email, occupation }) {
  const share = `Anak saya dah pandai baca dengan Minda Optima! Guna kod *${code}* bila daftar, anak dapat 1 kelas PERCUMA & saya dapat RM100 🎉 👉 ${SITE}/daftar.html?ref=${code}`;
  const waLink = `https://wa.me/?text=${encodeURIComponent(share)}`;
  const waGroupLink = 'https://chat.whatsapp.com/Ech6q73TWPH9qFC5en8gDm';

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;background:#ffffff;padding:0;color:#1e293b">
      <!-- Header Image -->
      <div style="text-align:center">
        <img src="https://drive.google.com/uc?id=15gWaMZTfS9d8-z1yN7dKLmvDgjPYGbud" alt="Minda Optima" style="width:100%;max-width:560px;display:block">
      </div>

      <!-- Content -->
      <div style="padding:40px 24px">
        <!-- Greeting -->
        <h1 style="font-size:24px;font-weight:700;color:#1e293b;margin:0 0 8px 0;text-align:center">🎉 Selamat Datang!</h1>
        <p style="font-size:14px;color:#64748b;margin:0 0 40px 0;text-align:center;line-height:1.6">Terima kasih telah mendaftar. Kod rujukan anda sudah siap untuk dikongsi.</p>

        <!-- User Details -->
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:32px 0;font-size:13px">
          <table style="width:100%;border-collapse:collapse">
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:8px 0;color:#64748b;width:40%">Nama</td>
              <td style="padding:8px 0;font-weight:600;text-align:right">${esc(name || '—')}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:8px 0;color:#64748b">Telefon</td>
              <td style="padding:8px 0;font-weight:600;text-align:right">${esc(phone || '—')}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b">Emel</td>
              <td style="padding:8px 0;font-weight:600;text-align:right">${esc(email || '—')}</td>
            </tr>
          </table>
        </div>

        <!-- Share Code Section -->
        <div style="text-align:center;margin:40px 0">
          <h2 style="font-size:14px;font-weight:700;color:#0D2A5C;margin:0 0 16px 0">Kongsi Rujukan Anda Sekarang</h2>
          <div style="background:linear-gradient(135deg,#0D2A5C 0%,#1a3a7a 100%);border-radius:10px;padding:16px 20px;margin:0;text-align:center;color:white">
            <p style="font-size:26px;font-weight:900;letter-spacing:2px;color:#fff;margin:0;font-family:monospace">${esc(code)}</p>
          </div>
          <a href="${waLink}" class="button" style="display:inline-block;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-top:16px;background:linear-gradient(135deg,#25D366 0%,#1fa854 100%);color:white">💚 Kongsi di WhatsApp</a>
        </div>

        <!-- Dashboard Button -->
        <div style="text-align:center;margin:32px 0">
          <a href="${SITE}/dashboard.html" style="display:block;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;background:linear-gradient(135deg,#0D2A5C 0%,#1a3a7a 100%);color:white">Buka Dashboard</a>
        </div>

        <!-- Marketing Images -->
        <div style="margin:40px 0;text-align:center">
          <img src="https://drive.google.com/uc?id=12BtXDOAxv_ofGCpDuTdUQHPhWt6ZMtL2" alt="3 Langkah Mudah Dapat Ganjaran" style="width:100%;max-width:500px;border-radius:8px;margin-bottom:16px">
          <img src="https://drive.google.com/uc?id=1PzIvylgBQPfawl2JxyHRAKGH_gdEOBmE" alt="Selamat Datang ke Komuniti Minda Optima" style="width:100%;max-width:500px;border-radius:8px">
        </div>

        <!-- WhatsApp Community Button -->
        <div style="text-align:center;margin:32px 0">
          <a href="${waGroupLink}" style="display:inline-block;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;background:linear-gradient(135deg,#25D366 0%,#1fa854 100%);color:white;box-shadow:0 4px 12px rgba(37,211,102,0.3)">💚 Sertai Komuniti WhatsApp</a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#1a1a1a;color:white;padding:24px;text-align:center;font-size:12px">
        <div style="margin-bottom:12px">
          <a href="https://www.facebook.com/MindaOptimaOfficial" style="color:white;text-decoration:none;margin:0 6px">Facebook</a> •
          <a href="https://www.instagram.com/mindaoptima/" style="color:white;text-decoration:none;margin:0 6px">Instagram</a> •
          <a href="https://www.tiktok.com/@minda_optima" style="color:white;text-decoration:none;margin:0 6px">TikTok</a> •
          <a href="https://www.youtube.com/@mindaoptimahq" style="color:white;text-decoration:none;margin:0 6px">YouTube</a> •
          <a href="https://www.threads.com/@mindaoptima" style="color:white;text-decoration:none;margin:0 6px">Threads</a>
        </div>
        <p style="color:#999;font-size:11px;margin:0">© 2026 Minda Optima</p>
      </div>
    </div>`;
}

const OTP_ERRORS = {
  invalid_phone: 'Nombor telefon tidak sah. Contoh: 012-3456789',
  invalid_email: 'Emel tidak sah.',
};

export function otpEmail({ otp }) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;background:#ffffff;padding:0;color:#1e293b">
      <!-- Logo Header -->
      <div style="padding:24px 20px;text-align:center;border-bottom:1px solid #e2e8f0">
        <img src="${SITE}/logo-mindaoptima.webp" alt="Minda Optima" style="height:70px;max-width:100%">
      </div>

      <!-- Content -->
      <div style="padding:40px 24px">
        <!-- Label -->
        <p style="font-size:12px;color:#0D2A5C;text-transform:uppercase;font-weight:700;letter-spacing:1px;margin:0 0 12px 0;text-align:center">Pengesahan Akaun</p>

        <!-- Headline -->
        <h1 style="font-size:24px;font-weight:700;color:#1e293b;margin:0 0 12px 0;text-align:center;line-height:1.3">Sahkan Kod OTP Anda</h1>

        <!-- Description -->
        <p style="font-size:14px;color:#64748b;margin:0 0 32px 0;text-align:center;line-height:1.6">Masukkan kod di bawah untuk mengesahkan pendaftaran anda sebagai referrer Minda Optima.</p>

        <!-- OTP Code Box -->
        <div style="background:#f0f4ff;border:2px solid #0D2A5C;border-radius:12px;padding:32px 24px;margin:32px 0;text-align:center">
          <p style="font-size:12px;color:#0D2A5C;text-transform:uppercase;font-weight:700;letter-spacing:1.5px;margin:0 0 16px 0">Kod OTP</p>
          <p style="font-size:48px;font-weight:900;letter-spacing:6px;color:#0D2A5C;margin:0;font-family:'Courier New',monospace;word-break:break-all">${otp}</p>
          <p style="font-size:12px;color:#64748b;margin:16px 0 0 0">Tamat tempoh dalam <strong>10 minit</strong></p>
        </div>

        <!-- Copy Instruction -->
        <div style="background:#f9fafb;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:24px 0;text-align:center;font-size:13px;color:#64748b">
          Salin kod di atas dan masukkan semasa mendaftar. Kod ini adalah peribadi — jangan berkongsi dengan orang lain.
        </div>

        <!-- Security Notice -->
        <div style="background:#fff9e6;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:4px;margin:24px 0;font-size:12px;color:#78350f;line-height:1.6">
          <strong style="display:block;margin-bottom:6px">⚠️ Penting:</strong>
          Minda Optima tidak akan meminta kod OTP ini melalui emel, WhatsApp, atau saluran lain. Jika menerima permintaan seumpamanya, ia adalah penipuan.
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#1a1a1a;color:#ffffff;padding:32px 24px;text-align:center">
        <!-- Social Links -->
        <div style="margin:0 0 24px 0;font-size:13px">
          <a href="https://www.facebook.com/MindaOptimaOfficial" style="display:inline-block;margin:0 8px;text-decoration:none;color:#ffffff">Facebook</a>
          <span style="color:#666">•</span>
          <a href="https://www.instagram.com/mindaoptima/" style="display:inline-block;margin:0 8px;text-decoration:none;color:#ffffff">Instagram</a>
          <span style="color:#666">•</span>
          <a href="https://www.tiktok.com/@minda_optima" style="display:inline-block;margin:0 8px;text-decoration:none;color:#ffffff">TikTok</a>
          <span style="color:#666">•</span>
          <a href="https://www.youtube.com/@mindaoptimahq" style="display:inline-block;margin:0 8px;text-decoration:none;color:#ffffff">YouTube</a>
          <span style="color:#666">•</span>
          <a href="https://www.threads.com/@mindaoptima" style="display:inline-block;margin:0 8px;text-decoration:none;color:#ffffff">Threads</a>
        </div>

        <!-- Links -->
        <p style="font-size:12px;margin:0 0 12px 0;line-height:1.8">
          <a href="https://pantasbaca.com/" style="color:#ffffff;text-decoration:none">Tentang Kami</a>
          &nbsp;•&nbsp;
          <a href="https://pantasbaca.com/" style="color:#ffffff;text-decoration:none">Hubungi Kami</a>
        </p>

        <!-- Copyright -->
        <p style="font-size:11px;color:#999999;margin:0">© 2026 Minda Optima. Semua hak dipelihara.</p>
      </div>
    </div>
  `;
}

async function sendOtp(body) {
  const otpRes = await sb('rpc/send_otp', {
    method: 'POST',
    body: { p_phone: String(body.phone ?? '').trim(), p_email: String(body.email ?? '').trim() },
  });
  const r = otpRes.data;
  if (!otpRes.ok || !r?.ok) {
    return json(422, { error: OTP_ERRORS[r?.reason] || 'Gagal hantar OTP. Sila cuba lagi.' });
  }

  const emailRes = await sendEmail(r.email, 'Kod OTP Referral Anda — Minda Optima', otpEmail({ otp: r.otp }));
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
      p_occupation: body.occupation ?? null,
    },
  });
  if (!r.ok) return json(502, { error: 'Gagal daftar. Sila cuba lagi.' });

  const REG_ERRORS = {
    name_required: 'Nama penuh diperlukan (2-80 aksara).',
    email_invalid: 'Emel tidak sah.',
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
