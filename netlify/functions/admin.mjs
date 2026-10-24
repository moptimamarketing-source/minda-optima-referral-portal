import { createHash, timingSafeEqual } from 'node:crypto';

const STATUSES = ['pending', 'approved', 'paid', 'rejected'];

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

const rewardFor = (date) => (date <= new Date('2026-12-31T23:59:59+08:00') ? 100 : 50);

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
    sb('referrals?select=id,code,referee_name,referee_phone,status,reward,registered_at,referrers(name,phone)&order=registered_at.desc&limit=500'),
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
    body: { referrer_id: referrer.id, code, referee_phone: phone, referee_name: name, reward: rewardFor(new Date()) },
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
  if ('bank_account' in f) {
    patch.bank_account = String(f.bank_account ?? '').replace(/\D/g, '').slice(0, 20) || null;
    if (patch.bank_account && patch.bank_account.length < 6) return json(422, { error: 'Nombor akaun bank tak sah.' });
  }
  if ('bank_name' in f) patch.bank_name = clean(f.bank_name, 50) || null;
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
    return json(400, { error: 'Tindakan tak dikenali.' });
  } catch (e) {
    console.error('Unhandled error:', e);
    return json(500, { error: `Ralat pelayan: ${e.message}` });
  }
};
