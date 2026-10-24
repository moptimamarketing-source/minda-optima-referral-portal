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

async function sendEmailViaResend(to, subject, html) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('RESEND_API_KEY not set');
    return { ok: false, error: 'Email service not configured' };
  }

  try {
    const body_payload = {
      from: 'onboarding@resend.dev',
      to,
      subject,
      html,
    };
    console.log('Sending email to:', to, 'Subject:', subject);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body_payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Resend API error:', res.status, JSON.stringify(data));
    }
    return { ok: res.ok, data };
  } catch (e) {
    console.error('Resend error:', e.message);
    return { ok: false, error: e.message };
  }
}

async function sendOtp(body) {
  const phone = String(body.phone ?? '').trim();
  const email = String(body.email ?? '').trim();

  const otpRes = await sb('rpc/send_otp', {
    method: 'POST',
    body: { p_phone: phone, p_email: email },
  });

  if (!otpRes.ok) {
    console.error('send_otp error:', otpRes.data);
    return json(502, { error: 'Gagal hantar OTP. Sila cuba lagi.' });
  }

  const { otp, phone: normalizedPhone, email: normalizedEmail } = otpRes.data;

  // Send OTP email
  const emailHtml = `
    <h2>Kod OTP Anda</h2>
    <p>Masukkan kod di bawah untuk mengesahkan pendaftaran Minda Optima:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otp}</p>
    <p>Kod ini akan luput dalam 10 minit.</p>
  `;

  const emailRes = await sendEmailViaResend(normalizedEmail, 'Kod OTP — Minda Optima', emailHtml);
  if (!emailRes.ok) {
    console.error('Email send error:', emailRes.error);
    return json(502, { error: 'Gagal hantar email. Sila cuba lagi.' });
  }

  return json(200, { ok: true, phone: normalizedPhone, email: normalizedEmail });
}

async function verifyOtp(body) {
  const phone = String(body.phone ?? '').trim();
  const otp = String(body.otp ?? '').trim();

  if (!phone || !otp) {
    return json(422, { error: 'Nomor telefon dan OTP diperlukan.' });
  }

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
    if (result.reason === 'otp_invalid') {
      return json(422, { error: 'Kod OTP salah.' });
    }
    if (result.reason === 'otp_expired') {
      return json(422, { error: 'Kod OTP telah luput. Minta kod baru.' });
    }
    return json(502, { error: 'Gagal sahkan OTP.' });
  }

  return json(200, {
    ok: true,
    phone: result.phone,
    email: result.email,
    isNewUser: result.isNewUser,
  });
}

async function sendConfirmation(body) {
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const code = String(body.code ?? '').trim();

  if (!email || !code) {
    return json(422, { error: 'Email dan kod diperlukan.' });
  }

  const emailHtml = `
    <h2>Selamat! Anda telah berjaya mendaftar.</h2>
    <p>Halo ${name || 'Teman'},</p>
    <p>Kod rujukan anda: <strong>${code}</strong></p>
    <p>Mulai berkongsi untuk dapatkan reward!</p>
    <p><a href="https://minda-optima-referral.netlify.app/dashboard.html">Buka Dashboard</a></p>
  `;

  const emailRes = await sendEmailViaResend(email, 'Pendaftaran Berjaya — Minda Optima', emailHtml);
  if (!emailRes.ok) {
    console.error('Confirmation email error:', emailRes.error);
    return json(502, { error: 'Gagal hantar email.' });
  }

  return json(200, { ok: true });
}

export default async (req) => {
  try {
    if (req.method !== 'POST') return json(405, { error: 'Kaedah tak dibenarkan.' });

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
    if (body.action === 'send-confirmation') return await sendConfirmation(body);

    return json(400, { error: 'Tindakan tidak dikenali.' });
  } catch (e) {
    console.error('Unhandled error:', e);
    return json(500, { error: `Ralat pelayan: ${e.message}` });
  }
};
