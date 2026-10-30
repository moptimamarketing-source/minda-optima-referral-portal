// Senarai bahan kreatif (poster/gambar, copywriting, video) untuk page /bahan.
// Tiada password — guna service role key sahaja untuk elak RLS roundtrip,
// sama macam settings.mjs. Fail dimuat naik terus ke bucket public
// "creative-materials" dari admin.mjs, jadi kita cuma perlu bentuk public URL.

const json = (status, body, cacheControl) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheControl || 'no-store' },
});

export default async (req) => {
  if (req.method !== 'GET') return json(405, { error: 'Kaedah tak dibenarkan.' });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(200, { image: [], text: [], video: [] });
  }

  try {
    const base = process.env.SUPABASE_URL.replace(/\/+$/, '');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(`${base}/rest/v1/creative_materials?select=id,category,title,description,text_content,file_path&order=category.asc,sort_order.asc,created_at.desc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const data = res.ok ? await res.json().catch(() => []) : [];

    const out = { image: [], text: [], video: [] };
    for (const row of Array.isArray(data) ? data : []) {
      if (!out[row.category]) continue;
      out[row.category].push({
        id: row.id,
        title: row.title,
        description: row.description,
        textContent: row.text_content,
        fileUrl: row.file_path ? `${base}/storage/v1/object/public/creative-materials/${row.file_path}` : null,
      });
    }
    return json(200, out, 'public, max-age=30');
  } catch (e) {
    console.error('creative error:', e);
    return json(200, { image: [], text: [], video: [] });
  }
};
