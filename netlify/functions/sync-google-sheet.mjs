// Sync referral data from Google Sheet (CC2 filtered data) to Supabase referrals table.
// Called manually or via cron job.

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

async function sb(path, opts = {}) {
  const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Supabase config missing');

  const url = `${base}/rest/v1/${path}`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  const method = opts.method || 'GET';
  const res = await fetch(url, { method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

export default async (req) => {
  const adminPassword = req.headers.get('x-admin-password') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return json(401, { error: 'Unauthorized' });
  }

  try {
    const sheetId = '1NSi6hm2tVt1fyoqfFSgYRBiwNQfQ9lXjlTBKztsVGas';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

    const csvRes = await fetch(csvUrl);
    if (!csvRes.ok) {
      return json(500, { error: 'Failed to fetch Google Sheet' });
    }
    const csv = await csvRes.text();
    const lines = csv.trim().split('\n').map(l => l.split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1')));

    // Skip header row
    const rows = lines.slice(1);

    // Column mapping from user's sheet:
    // B=1 (Tarikh), E=4 (Keyword), F=5 (No.Telefon), AA=26 (Nama Parents)
    // Actually, let me re-count: A=0, B=1, C=2, D=3, E=4, F=5, ..., AA=26

    let synced = 0;
    let skipped = 0;
    const errors = [];

    for (const row of rows) {
      const tarikh = row[1]?.trim();
      const keyword = row[4]?.trim();
      const noTelefon = row[5]?.trim();
      const namaParents = row[26]?.trim() || '';

      if (!keyword || !noTelefon) {
        skipped++;
        continue;
      }

      // Validate phone (should be Malaysian format like 0171234567)
      if (!/^01[0-9]{8,9}$/.test(noTelefon)) {
        skipped++;
        continue;
      }

      // Find referrer by keyword/code
      const refRes = await sb(`referrers?select=id&code=eq.${encodeURIComponent(keyword)}`);
      if (!refRes.ok || !Array.isArray(refRes.data) || refRes.data.length === 0) {
        errors.push(`Keyword not found: ${keyword}`);
        continue;
      }
      const referrerId = refRes.data[0].id;

      // Check if referee already exists (by phone)
      const checkRes = await sb(`referrals?select=id&referee_phone=eq.${encodeURIComponent(noTelefon)}`);
      if (checkRes.ok && Array.isArray(checkRes.data) && checkRes.data.length > 0) {
        skipped++;
        continue; // Already exists
      }

      // Insert new referral
      const addRes = await sb('referrals', {
        method: 'POST',
        body: {
          referrer_id: referrerId,
          referee_phone: noTelefon,
          referee_name: namaParents || null,
          status: 'pending',
          reward: 100,
          code: keyword,
        },
      });

      if (addRes.ok) {
        synced++;
      } else {
        errors.push(`Failed to add ${noTelefon}: ${addRes.status}`);
      }
    }

    return json(200, { synced, skipped, errors, rowsProcessed: rows.length });
  } catch (e) {
    console.error('sync-google-sheet error:', e);
    return json(500, { error: e.message });
  }
};
