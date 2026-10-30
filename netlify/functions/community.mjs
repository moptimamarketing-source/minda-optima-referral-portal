// Data untuk page /komuniti (3 tab: Referral, Creative Content, Info).
// Referral tab guna data dari /api/dashboard (code, share link) — tak perlu di sini.
// Tiada password — guna service role key sahaja untuk elak RLS roundtrip,
// sama macam settings.mjs. Fail creative material dimuat naik terus ke bucket
// public "creative-materials" dari admin.mjs, jadi kita cuma perlu bentuk public URL.

const json = (status, body, cacheControl) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheControl || 'no-store' },
});

export default async (req) => {
  if (req.method !== 'GET') return json(405, { error: 'Kaedah tak dibenarkan.' });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(200, { materials: [], info: [] });
  }

  try {
    const base = process.env.SUPABASE_URL.replace(/\/+$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const headers = { apikey: key, Authorization: `Bearer ${key}` };

    const [materialsRes, infoRes] = await Promise.all([
      fetch(`${base}/rest/v1/creative_materials?select=id,category,title,description,text_content,file_path,created_at&order=created_at.desc`, { headers }),
      fetch(`${base}/rest/v1/community_info?select=id,title,body,created_at&order=created_at.desc`, { headers }),
    ]);

    const materialsRows = materialsRes.ok ? await materialsRes.json().catch(() => []) : [];
    const infoRows = infoRes.ok ? await infoRes.json().catch(() => []) : [];

    // Satu feed campur (bukan diasingkan ikut kategori) — admin susun ikut tarikh
    // dicipta, parent nampak macam feed/ruangan chat.
    const materials = (Array.isArray(materialsRows) ? materialsRows : []).map((row) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      description: row.description,
      textContent: row.text_content,
      fileUrl: row.file_path ? `${base}/storage/v1/object/public/creative-materials/${row.file_path}` : null,
      createdAt: row.created_at,
    }));

    const info = (Array.isArray(infoRows) ? infoRows : []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
    }));

    return json(200, { materials, info }, 'public, max-age=30');
  } catch (e) {
    console.error('community error:', e);
    return json(200, { materials: [], info: [] });
  }
};
