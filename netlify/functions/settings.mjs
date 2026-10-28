// Tetapan laman yang selamat didedahkan kepada semua pelawat (tiada password): tarikh tamat
// promo, jumlah reward, nombor sokongan, link komuniti. Diedit dari admin.html.

const PUBLIC_KEYS = [
  'promo_enabled', 'promo_deadline', 'reward_before', 'reward_after', 'support_phone',
  'hero_title_line1', 'hero_title_line2', 'hero_subtitle', 'step3_desc', 'cta_heading', 'cta_sub',
  'login_hero_benefits',
  'promo_banner_text',
  'community_title', 'community_desc', 'community_button_label', 'community_link', 'community_color',
  'share_message_template',
];

const json = (status, body, cacheControl) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheControl || 'no-store' },
});

async function sb(path) {
  const url = process.env.SUPABASE_URL.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { ok: res.ok, data };
}

export default async (req) => {
  if (req.method !== 'GET') return json(405, { error: 'Kaedah tak dibenarkan.' });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(200, {});
  }

  try {
    const res = await sb(`settings?select=key,value&key=in.(${PUBLIC_KEYS.join(',')})`);
    if (!res.ok || !Array.isArray(res.data)) return json(200, {});
    const out = {};
    for (const row of res.data) out[row.key] = row.value;
    return json(200, out, 'public, max-age=60');
  } catch (e) {
    console.error('settings error:', e);
    return json(200, {});
  }
};
