import { createHash, timingSafeEqual } from 'node:crypto';
import { sendEmail, esc, SITE } from '../lib/email.mjs';

const STATUSES = ['pending', 'approved', 'paid', 'rejected'];
const SETTINGS_KEYS = [
  'promo_enabled', 'promo_deadline', 'reward_before', 'reward_after', 'support_phone',
  'hero_title_line1', 'hero_title_line2', 'hero_subtitle', 'step3_desc', 'cta_heading', 'cta_sub',
  'promo_banner_text',
  'community_title', 'community_desc', 'community_button_label', 'community_link', 'community_color',
  'share_message_template',
];
const COMMUNITY_COLORS = ['telegram', 'whatsapp', 'brand'];
const TEXT_SETTINGS_MAX = {
  hero_title_line1: 60, hero_title_line2: 60, hero_subtitle: 300, step3_desc: 200,
  cta_heading: 100, cta_sub: 150, promo_banner_text: 200,
  community_title: 60, community_desc: 200, community_button_label: 60,
  share_message_template: 500,
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

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

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

  const wrap = (heading, paragraphs) => `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b">
      <h2 style="color:#0D2A5C">${heading}</h2>
      <p>Salam ${esc(ref.name)},</p>
      ${paragraphs.map((p) => `<p>${p}</p>`).join('')}
      <p style="margin-top:24px"><a href="${SITE}/dashboard.html" style="color:#0D2A5C">Buka dashboard anda</a></p>
      <p style="color:#64748b;font-size:13px">Minda Optima</p>
    </div>`;

  let subject;
  let html;
  if (row.status === 'approved') {
    const details = [
      '<strong>Status:</strong> ✓ Layak (Approved)',
      '<strong>Reward:</strong> RM' + esc(row.reward),
      '<strong>Tarikh Disahkan:</strong> ' + new Date().toLocaleDateString('ms-MY'),
    ].join('<br>');
    subject = '✓ Rujukan Anda Layak';
    html = wrap('✓ Rujukan Anda Layak', [
      'Rujukan anda telah disahkan memenuhi kriteria program kami.',
      `<div style="background:#f0fdf4;padding:12px;border-radius:8px;font-size:14px;margin:12px 0">${details}</div>`,
      'Pembayaran reward akan diproses dalam 5-7 hari kerja.',
    ]);
  } else {
    const acc = ref.phone ? `Touch 'n Go •••• ${esc(String(ref.phone).slice(-4))}` : "Touch 'n Go anda";
    const details = [
      '<strong>Status:</strong> ✓ Dibayar (Paid)',
      '<strong>Amount:</strong> RM' + esc(row.reward),
      '<strong>Akaun Tujuan:</strong> ' + acc,
      '<strong>Tarikh Pembayaran:</strong> ' + new Date().toLocaleDateString('ms-MY'),
    ].join('<br>');
    subject = '🎉 Pembayaran Reward Selesai';
    html = wrap('🎉 Pembayaran Reward Selesai', [
      'Pembayaran reward anda telah diproses dengan berjaya.',
      `<div style="background:#fdf4f5;padding:12px;border-radius:8px;font-size:14px;margin:12px 0">${details}</div>`,
      "Sila semak Touch 'n Go anda dalam 1-2 hari kerja. Terima kasih kerana menjadi bagian dari komuniti Minda Optima!",
    ]);
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
    if (body.action === 'notify-email') return await notifyEmail(body);
    if (body.action === 'get-settings') return await getSettings();
    if (body.action === 'save-settings') return await saveSettings(body);
    return json(400, { error: 'Tindakan tak dikenali.' });
  } catch (e) {
    console.error('Unhandled error:', e);
    return json(500, { error: `Ralat pelayan: ${e.message}` });
  }
};
