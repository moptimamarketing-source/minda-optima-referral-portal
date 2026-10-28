import { createHash, timingSafeEqual } from 'node:crypto';
import { sendEmail, esc, SITE, fetchSettings } from '../lib/email.mjs';
import { otpEmail } from './auth.mjs';

const STATUSES = ['pending', 'approved', 'paid', 'rejected'];
const SETTINGS_KEYS = [
  'promo_enabled', 'promo_deadline', 'reward_before', 'reward_after', 'support_phone',
  'hero_badge_label', 'hero_title_line1', 'hero_title_line2', 'hero_subtitle',
  'how_it_works_title', 'how_it_works_subtitle',
  'step1_title', 'step1_desc', 'step2_title', 'step2_desc', 'step3_title', 'step3_desc',
  'cta_heading', 'cta_sub', 'cta_button_label',
  'syarat_items', 'syarat_notes', 'reward_terms',
  'login_hero_title_line1', 'login_hero_title_line2', 'login_hero_benefits',
  'reg_heading', 'reg_subtitle', 'reg_name_label', 'reg_occupation_label', 'reg_submit_label',
  'dashboard_code_label', 'dashboard_share_heading',
  'promo_banner_text',
  'community_title', 'community_desc', 'community_button_label', 'community_link', 'community_color',
  'share_message_template',
  'faq1_q', 'faq1_a', 'faq2_q', 'faq2_a', 'faq3_q', 'faq3_a',
  'faq4_q', 'faq4_a', 'faq5_q', 'faq5_a', 'faq6_q', 'faq6_a',
  'otp_email_header_image', 'otp_email_heading', 'otp_email_desc',
  'welcome_email_header_image', 'welcome_email_heading', 'welcome_email_subtitle',
  'welcome_email_image1', 'welcome_email_image2',
  'approved_email_header_image', 'approved_email_heading', 'approved_email_subtitle',
  'paid_email_header_image', 'paid_email_heading', 'paid_email_subtitle',
];
const COMMUNITY_COLORS = ['telegram', 'whatsapp', 'brand'];
const IMAGE_URL_SETTINGS = [
  'otp_email_header_image', 'welcome_email_header_image', 'welcome_email_image1', 'welcome_email_image2',
  'approved_email_header_image', 'paid_email_header_image',
];
const TEXT_SETTINGS_MAX = {
  hero_badge_label: 60, hero_title_line1: 60, hero_title_line2: 60, hero_subtitle: 300,
  how_it_works_title: 60, how_it_works_subtitle: 100,
  step1_title: 40, step1_desc: 200, step2_title: 40, step2_desc: 200, step3_title: 40, step3_desc: 200,
  cta_heading: 100, cta_sub: 150, cta_button_label: 60,
  syarat_items: 1500, syarat_notes: 800, reward_terms: 300,
  login_hero_title_line1: 60, login_hero_title_line2: 60, login_hero_benefits: 150,
  reg_heading: 80, reg_subtitle: 150, reg_name_label: 40, reg_occupation_label: 40, reg_submit_label: 40,
  dashboard_code_label: 60, dashboard_share_heading: 60,
  promo_banner_text: 200,
  community_title: 60, community_desc: 200, community_button_label: 60,
  share_message_template: 500,
  faq1_q: 150, faq1_a: 500, faq2_q: 150, faq2_a: 500, faq3_q: 150, faq3_a: 500,
  faq4_q: 150, faq4_a: 500, faq5_q: 150, faq5_a: 500, faq6_q: 150, faq6_a: 500,
  otp_email_header_image: 500, otp_email_heading: 80, otp_email_desc: 200,
  welcome_email_header_image: 500, welcome_email_heading: 80, welcome_email_subtitle: 200,
  welcome_email_image1: 500, welcome_email_image2: 500,
  approved_email_header_image: 500, approved_email_heading: 80, approved_email_subtitle: 200,
  paid_email_header_image: 500, paid_email_heading: 80, paid_email_subtitle: 200,
};

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const digest = (s) => createHash('sha256').update(String(s)).digest();
const samePassword = (given, expected) => timingSafeEqual(digest(given), digest(expected));

function normalizePhone(raw) {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (/^01\d{8,9}$/.test(d)) return d;
  if (/^601\d{8,9}$/.test(d)) return `0${d.slice(2)}`;
  return null;
}

async function promoSettings() {
  const out = { promo_enabled: 'true', promo_deadline: '2026-12-31T23:59:59+08:00', reward_before: 100, reward_after: 50 };
  const res = await sb('settings?select=key,value&key=in.(promo_enabled,promo_deadline,reward_before,reward_after)');
  if (res.ok) {
    for (const row of res.data || []) {
      out[row.key] = ['promo_enabled', 'promo_deadline'].includes(row.key) ? row.value : (Number(row.value) || out[row.key]);
    }
  }
  return out;
}

async function rewardFor(date) {
  const promo = await promoSettings();
  if (promo.promo_enabled === 'false') return promo.reward_before;
  return date <= new Date(promo.promo_deadline) ? promo.reward_before : promo.reward_after;
}

async function sb(path, { method = 'GET', body, prefer } = {}) {
  const url = process.env.SUPABASE_URL.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { ok: res.ok, data };
}

async function list() {
  const [funnel, referrals, unknown, referrers] = await Promise.all([
    sb('referral_funnel?select=*&order=registrations.desc,landings.desc'),
    sb('referrals?select=id,code,referee_name,referee_phone,status,reward,registered_at,referrers(name,phone,email)&order=registered_at.desc&limit=500'),
    sb('referral_events?select=code,created_at&referrer_id=is.null&order=created_at.desc&limit=20'),
    sb('referrers?select=*&order=created_at.desc&limit=500'),
  ]);

  if (!funnel.ok) {
    console.error('referral_funnel error:', funnel.data);
    return json(502, { error: `Gagal baca funnel: ${funnel.data?.message || 'Unknown error'}` });
  }
  if (!referrals.ok) {
    console.error('referrals error:', referrals.data);
    return json(502, { error: `Gagal baca referrals: ${referrals.data?.message || 'Unknown error'}` });
  }
  if (!unknown.ok) {
    console.error('referral_events error:', unknown.data);
    return json(502, { error: `Gagal baca events: ${unknown.data?.message || 'Unknown error'}` });
  }

  if (!referrers.ok) {
    console.error('referrers error:', referrers.data);
    return json(502, { error: `Gagal baca referrers: ${referrers.data?.message || 'Unknown error'}` });
  }

  return json(200, { funnel: funnel.data, referrals: referrals.data, unknown: unknown.data, referrers: referrers.data });
}

async function add(body) {
  const code = String(body.code ?? '').trim().toUpperCase();
  const phone = normalizePhone(body.phone);
  const name = String(body.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) || null;

  if (!/^MO-\d{4}-[A-Z]{4}$/.test(code)) return json(422, { error: 'Format kod tak sah. Contoh: MO-6789-HKSG' });
  if (!phone) return json(422, { error: 'Nombor telefon tak sah. Contoh: 0176629820' });

  const ref = await sb(`referrers?select=id,phone&code=eq.${code}`);
  if (!ref.ok) return json(502, { error: 'Gagal baca pangkalan data.' });
  const referrer = ref.data?.[0];
  if (!referrer) return json(404, { error: 'Kod tak dijumpai dalam sistem.' });
  if (referrer.phone === phone) return json(422, { error: 'Penjemput tak boleh rujuk nombor sendiri.' });

  const ins = await sb('referrals', {
    method: 'POST',
    prefer: 'return=representation',
    body: { referrer_id: referrer.id, code, referee_phone: phone, referee_name: name, reward: await rewardFor(new Date()) },
  });
  if (!ins.ok) {
    if (ins.data?.code === '23505') return json(409, { error: 'Nombor ini sudah pernah direkod.' });
    return json(502, { error: 'Gagal simpan rekod.' });
  }
  return json(200, { ok: true });
}

async function setStatus(body) {
  const id = Number(body.id);
  if (!Number.isInteger(id) || !STATUSES.includes(body.status)) return json(422, { error: 'Data status tak sah.' });

  const up = await sb(`referrals?id=eq.${id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { status: body.status },
  });
  if (!up.ok) return json(502, { error: 'Gagal kemas kini status.' });
  if (!up.data?.length) return json(404, { error: 'Rujukan tak dijumpai.' });
  return json(200, { ok: true });
}

const confirmsDelete = (body) => String(body.confirm ?? '').trim().toLowerCase() === 'delete';

async function deleteReferral(body) {
  const id = Number(body.id);
  if (!Number.isInteger(id)) return json(422, { error: 'ID tak sah.' });
  if (!confirmsDelete(body)) return json(422, { error: 'Taip "delete" untuk sahkan.' });

  const del = await sb(`referrals?id=eq.${id}`, { method: 'DELETE', prefer: 'return=representation' });
  if (!del.ok) {
    console.error('deleteReferral error:', del.data);
    return json(502, { error: `Gagal padam rujukan: ${del.data?.message || 'Unknown error'}` });
  }
  if (!del.data?.length) return json(404, { error: 'Rujukan tak dijumpai.' });
  return json(200, { ok: true });
}

async function deleteReferrer(body) {
  const id = Number(body.id);
  if (!Number.isInteger(id)) return json(422, { error: 'ID tak sah.' });
  if (!confirmsDelete(body)) return json(422, { error: 'Taip "delete" untuk sahkan.' });

  const delReferrals = await sb(`referrals?referrer_id=eq.${id}`, { method: 'DELETE' });
  if (!delReferrals.ok) {
    console.error('deleteReferrer (referrals) error:', delReferrals.data);
    return json(502, { error: 'Gagal padam rujukan penjemput.' });
  }

  const del = await sb(`referrers?id=eq.${id}`, { method: 'DELETE', prefer: 'return=representation' });
  if (!del.ok) {
    console.error('deleteReferrer error:', del.data);
    return json(502, { error: `Gagal padam penjemput: ${del.data?.message || 'Unknown error'}` });
  }
  if (!del.data?.length) return json(404, { error: 'Penjemput tak dijumpai.' });
  return json(200, { ok: true });
}

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

async function resendOtp(body) {
  const phone = normalizePhone(body.phone);
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!phone) return json(422, { error: 'Nombor telefon tak sah. Contoh: 0176629820' });
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(422, { error: 'Emel tak sah.' });

  const otpRes = await sb('rpc/send_otp', { method: 'POST', body: { p_phone: phone, p_email: email } });
  const r = otpRes.data;
  if (!otpRes.ok || !r?.ok) {
    const reason = { invalid_phone: 'Nombor telefon tak sah.', invalid_email: 'Emel tak sah.' }[r?.reason];
    return json(422, { error: reason || 'Gagal jana OTP.' });
  }

  const emailSettings = await fetchSettings(['otp_email_header_image', 'otp_email_heading', 'otp_email_desc']);
  const emailRes = await sendEmail(r.email, 'Kod OTP Referral Anda — Minda Optima', otpEmail({ otp: r.otp, s: emailSettings }));
  if (!emailRes.ok) return json(502, { error: emailRes.error });

  return json(200, { ok: true, phone: r.phone, email: r.email });
}

async function editReferrer(body) {
  const id = Number(body.id);
  if (!Number.isInteger(id)) return json(422, { error: 'ID tak sah.' });
  const f = body.fields ?? {};
  const patch = {};

  if ('name' in f) {
    patch.name = clean(f.name, 80);
    if (patch.name.length < 2) return json(422, { error: 'Nama terlalu pendek.' });
  }
  if ('phone' in f) {
    patch.phone = normalizePhone(f.phone);
    if (!patch.phone) return json(422, { error: 'Nombor telefon tak sah. Contoh: 0176629820' });
  }
  if ('email' in f) {
    patch.email = clean(f.email, 100).toLowerCase() || null;
    if (patch.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(patch.email)) return json(422, { error: 'Emel tak sah.' });
  }
  if ('occupation' in f) patch.occupation = clean(f.occupation, 50) || null;
  if (!Object.keys(patch).length) return json(422, { error: 'Tiada perubahan.' });

  const up = await sb(`referrers?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation', body: patch });
  if (!up.ok) {
    if (up.data?.code === '23505') return json(409, { error: 'Nombor telefon ini sudah digunakan penjemput lain.' });
    console.error('editReferrer error:', up.data);
    return json(502, { error: `Gagal kemas kini penjemput: ${up.data?.message || 'Unknown error'}` });
  }
  if (!up.data?.length) return json(404, { error: 'Penjemput tak dijumpai.' });
  return json(200, { ok: true });
}

async function editReferee(body) {
  const id = Number(body.id);
  if (!Number.isInteger(id)) return json(422, { error: 'ID tak sah.' });
  const f = body.fields ?? {};
  const patch = {};

  if ('name' in f) patch.referee_name = clean(f.name, 80) || null;
  if ('phone' in f) {
    patch.referee_phone = normalizePhone(f.phone);
    if (!patch.referee_phone) return json(422, { error: 'Nombor telefon tak sah. Contoh: 0176629820' });
  }
  if (!Object.keys(patch).length) return json(422, { error: 'Tiada perubahan.' });

  const up = await sb(`referrals?id=eq.${id}`, { method: 'PATCH', prefer: 'return=representation', body: patch });
  if (!up.ok) {
    if (up.data?.code === '23505') return json(409, { error: 'Nombor ini sudah pernah direkod.' });
    console.error('editReferee error:', up.data);
    return json(502, { error: `Gagal kemas kini rakan: ${up.data?.message || 'Unknown error'}` });
  }
  if (!up.data?.length) return json(404, { error: 'Rujukan tak dijumpai.' });
  return json(200, { ok: true });
}

async function notifyEmail(body) {
  const id = Number(body.id);
  if (!Number.isInteger(id)) return json(422, { error: 'ID tak sah.' });

  const r = await sb(`referrals?select=status,reward,referrers(name,email,phone)&id=eq.${id}`);
  if (!r.ok) return json(502, { error: 'Gagal baca rekod.' });
  const row = r.data?.[0];
  if (!row) return json(404, { error: 'Rujukan tak dijumpai.' });
  if (!['approved', 'paid'].includes(row.status)) {
    return json(422, { error: 'Notification can only be sent for Approved or Paid.' });
  }
  const ref = row.referrers;
  if (!ref?.email) return json(422, { error: 'This referrer has no email on file.' });

  const emailSettings = await fetchSettings([
    'approved_email_header_image', 'approved_email_heading', 'approved_email_subtitle',
    'paid_email_header_image', 'paid_email_heading', 'paid_email_subtitle',
  ]);

  let subject;
  let html;
  if (row.status === 'approved') {
    const headerImage = emailSettings.approved_email_header_image || 'https://drive.google.com/uc?id=1QUvgbM8Cf6RNh0qn6K_e9GRTFzHFu4-F';
    const heading = emailSettings.approved_email_heading || '✓ Rujukan Anda Layak!';
    const subtitle = emailSettings.approved_email_subtitle || 'Tahniah! Rujukan anda telah disahkan memenuhi kriteria program kami.';
    subject = '✓ Rujukan Anda Layak';
    html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;background:#ffffff;padding:0;color:#1e293b">
        <!-- Header Image -->
        <div style="text-align:center">
          <img src="${esc(headerImage)}" alt="Minda Optima" style="width:100%;max-width:560px;display:block">
        </div>

        <!-- Content -->
        <div style="padding:40px 24px">
          <!-- Greeting -->
          <h1 style="font-size:24px;font-weight:700;color:#1e293b;margin:0 0 8px 0;text-align:center">${esc(heading)}</h1>
          <p style="font-size:14px;color:#64748b;margin:0 0 32px 0;text-align:center;line-height:1.6">${esc(subtitle)}</p>

          <!-- Status Box -->
          <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:12px;padding:24px;margin:32px 0;text-align:center;color:white">
            <p style="font-size:14px;color:rgba(255,255,255,0.9);margin:0 0 12px 0;text-transform:uppercase;font-weight:700;letter-spacing:1px">Status Rujukan</p>
            <p style="font-size:32px;font-weight:900;margin:0">✓ Layak</p>
          </div>

          <!-- Reward Details -->
          <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:32px 0;font-size:14px">
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e2e8f0">
              <span style="color:#64748b">Ganjaran</span>
              <span style="font-weight:700;color:#0D2A5C">RM${esc(row.reward)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:12px 0">
              <span style="color:#64748b">Tarikh Disahkan</span>
              <span style="font-weight:700;color:#0D2A5C">${new Date().toLocaleDateString('ms-MY')}</span>
            </div>
          </div>

          <!-- Timeline Info -->
          <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;border-radius:6px;margin:32px 0;font-size:13px;color:#065f46;line-height:1.6">
            <strong style="display:block;margin-bottom:8px">⏱️ Garis Masa Pembayaran:</strong>
            Pembayaran reward akan diproses dalam <strong>5-7 hari kerja</strong> ke akaun Touch 'n Go anda.
          </div>

          <!-- CTA Button -->
          <div style="text-align:center;margin:32px 0">
            <a href="${SITE}/dashboard.html" style="display:inline-block;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;background:linear-gradient(135deg,#0D2A5C 0%,#1a3a7a 100%);color:white">Buka Dashboard</a>
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
  } else {
    const acc = ref.phone ? `Touch 'n Go •••• ${esc(String(ref.phone).slice(-4))}` : "Touch 'n Go anda";
    const headerImage = emailSettings.paid_email_header_image || 'https://drive.google.com/uc?id=12SPd0G_EfTz-_OdPcAba5xwMNzKBQ_ip';
    const heading = emailSettings.paid_email_heading || '🎉 Pembayaran Selesai!';
    const subtitle = emailSettings.paid_email_subtitle || 'Ganjaran anda telah diproses dan akan masuk ke akaun Touch \'n Go anda.';
    subject = '🎉 Pembayaran Reward Selesai';
    html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;background:#ffffff;padding:0;color:#1e293b">
        <!-- Header Image -->
        <div style="text-align:center">
          <img src="${esc(headerImage)}" alt="Minda Optima" style="width:100%;max-width:560px;display:block">
        </div>

        <!-- Content -->
        <div style="padding:40px 24px">
          <!-- Greeting -->
          <h1 style="font-size:24px;font-weight:700;color:#1e293b;margin:0 0 8px 0;text-align:center">${esc(heading)}</h1>
          <p style="font-size:14px;color:#64748b;margin:0 0 32px 0;text-align:center;line-height:1.6">${esc(subtitle)}</p>

          <!-- Payment Status Box -->
          <div style="background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);border-radius:12px;padding:24px;margin:32px 0;text-align:center;color:white">
            <p style="font-size:14px;color:rgba(255,255,255,0.9);margin:0 0 12px 0;text-transform:uppercase;font-weight:700;letter-spacing:1px">Status Pembayaran</p>
            <p style="font-size:32px;font-weight:900;margin:0">✓ Dibayar</p>
          </div>

          <!-- Payment Details -->
          <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:32px 0;font-size:14px">
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e2e8f0">
              <span style="color:#64748b">Jumlah Ganjaran</span>
              <span style="font-weight:700;color:#0D2A5C">RM${esc(row.reward)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e2e8f0">
              <span style="color:#64748b">Akaun Tujuan</span>
              <span style="font-weight:700;color:#0D2A5C">${acc}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:12px 0">
              <span style="color:#64748b">Tarikh Pembayaran</span>
              <span style="font-weight:700;color:#0D2A5C">${new Date().toLocaleDateString('ms-MY')}</span>
            </div>
          </div>

          <!-- Confirmation Info -->
          <div style="background:#fdf4f5;border-left:4px solid #8b5cf6;padding:16px;border-radius:6px;margin:32px 0;font-size:13px;color:#581c87;line-height:1.6">
            <strong style="display:block;margin-bottom:8px">✓ Pembayaran Diproses</strong>
            Sila semak akaun Touch 'n Go anda dalam <strong>1-2 hari kerja</strong>. Terima kasih kerana menjadi bagian dari komuniti Minda Optima!
          </div>

          <!-- CTA Button -->
          <div style="text-align:center;margin:32px 0">
            <a href="${SITE}/dashboard.html" style="display:inline-block;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;background:linear-gradient(135deg,#0D2A5C 0%,#1a3a7a 100%);color:white">Buka Dashboard</a>
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

  const sent = await sendEmail(ref.email, subject, html);
  if (!sent.ok) return json(502, { error: sent.error });
  return json(200, { ok: true, to: ref.email });
}

async function getSettings() {
  const res = await sb('settings?select=key,value');
  if (!res.ok) {
    console.error('getSettings error:', res.data);
    return json(502, { error: 'Gagal baca tetapan.' });
  }
  const out = {};
  for (const row of res.data || []) out[row.key] = row.value;
  return json(200, { settings: out });
}

function validateSetting(key, raw) {
  const v = String(raw ?? '').trim();
  if (IMAGE_URL_SETTINGS.includes(key)) {
    if (!/^https:\/\/\S+$/.test(v)) return { error: 'Link gambar tak sah. Kena mula dengan https://' };
    return { value: v };
  }
  if (key === 'promo_enabled') {
    return { value: v === 'true' || v === 'on' || v === '1' ? 'true' : 'false' };
  }
  if (key === 'promo_deadline') {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return { error: 'Tarikh tamat promo tak sah.' };
    return { value: d.toISOString() };
  }
  if (key === 'reward_before' || key === 'reward_after') {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 10000) return { error: 'Jumlah reward tak sah.' };
    return { value: String(n) };
  }
  if (key === 'support_phone') {
    const d = v.replace(/\D/g, '');
    if (!/^60\d{8,10}$/.test(d)) return { error: 'Nombor sokongan tak sah. Contoh: 60123456789' };
    return { value: d };
  }
  if (key === 'community_link') {
    if (v && !/^https:\/\/\S+$/.test(v)) return { error: 'Link komuniti tak sah. Kena mula dengan https://' };
    return { value: v };
  }
  if (key === 'community_color') {
    if (!COMMUNITY_COLORS.includes(v)) return { error: 'Warna komuniti tak sah.' };
    return { value: v };
  }
  if (key === 'share_message_template') {
    if (!v) return { error: 'Mesej share tak boleh kosong.' };
    if (v.length > TEXT_SETTINGS_MAX[key]) return { error: `Mesej share terlalu panjang (maks ${TEXT_SETTINGS_MAX[key]} aksara).` };
    if (!v.includes('{code}') || !v.includes('{url}')) {
      return { error: 'Mesej share kena ada token {code} dan {url} — jangan buang.' };
    }
    return { value: v };
  }
  if (key in TEXT_SETTINGS_MAX) {
    if (!v) return { error: 'Medan ini tak boleh kosong.' };
    if (v.length > TEXT_SETTINGS_MAX[key]) return { error: `Teks terlalu panjang (maks ${TEXT_SETTINGS_MAX[key]} aksara).` };
    return { value: v };
  }
  return { error: 'Tetapan tak dikenali.' };
}

async function saveSettings(body) {
  const fields = body.fields ?? {};
  const rows = [];
  for (const key of SETTINGS_KEYS) {
    if (!(key in fields)) continue;
    const { value, error } = validateSetting(key, fields[key]);
    if (error) return json(422, { error });
    rows.push({ key, value });
  }
  if (!rows.length) return json(422, { error: 'Tiada perubahan untuk disimpan.' });

  const up = await sb('settings', { method: 'POST', prefer: 'resolution=merge-duplicates', body: rows });
  if (!up.ok) {
    console.error('saveSettings error:', up.data);
    return json(502, { error: `Gagal simpan tetapan: ${up.data?.message || 'Unknown error'}` });
  }
  return json(200, { ok: true });
}

export default async (req) => {
  try {
    if (req.method !== 'POST') return json(405, { error: 'Kaedah tak dibenarkan.' });

    const missing = [];
    if (!process.env.ADMIN_PASSWORD) missing.push('ADMIN_PASSWORD');
    if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

    if (missing.length > 0) {
      console.error('Env vars missing:', missing);
      return json(500, { error: `Konfigurasi server belum lengkap: ${missing.join(', ')}` });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('JSON parse error:', e);
      return json(400, { error: 'Data tak sah.' });
    }

    if (typeof body.password !== 'string' || !samePassword(body.password, process.env.ADMIN_PASSWORD)) {
      return json(401, { error: 'Kata laluan salah.' });
    }

    if (body.action === 'list') return await list();
    if (body.action === 'add') return await add(body);
    if (body.action === 'status') return await setStatus(body);
    if (body.action === 'edit-referrer') return await editReferrer(body);
    if (body.action === 'edit-referee') return await editReferee(body);
    if (body.action === 'delete-referral') return await deleteReferral(body);
    if (body.action === 'delete-referrer') return await deleteReferrer(body);
    if (body.action === 'resend-otp') return await resendOtp(body);
    if (body.action === 'notify-email') return await notifyEmail(body);
    if (body.action === 'get-settings') return await getSettings();
    if (body.action === 'save-settings') return await saveSettings(body);
    return json(400, { error: 'Tindakan tak dikenali.' });
  } catch (e) {
    console.error('Unhandled error:', e);
    return json(500, { error: `Ralat pelayan: ${e.message}` });
  }
};
