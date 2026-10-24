/* Letak dalam borang pendaftaran (daftarmindaoptima.com/f/kelas-membaca-minda-optima-fizikal) sebelum </body>.
 * 1) Menyimpan ?ref= dan ?vid= dari pautan supaya tak hilang bila halaman refresh/berpindah.
 * 2) MOReferral.record({ phone, name }) dipanggil SELEPAS pendaftaran berjaya. */
(() => {
  const CONFIG = {
    SUPABASE_URL: 'https://xivofhowzkrlichycxvz.supabase.co',
    SUPABASE_KEY: 'sb_publishable_ofulMZ2yte6j8TdtZdgV0A_3c9i1kEY',
    // Supabase > Table Editor > settings > registration_api_key
    REGISTRATION_API_KEY: '',
  };
  const STORE = 'mo_referral';
  const MAX_AGE_MS = 30 * 24 * 3600 * 1000;
  const CODE_RE = /^MO-\d{4}-[A-Z]{4}$/;

  const read = () => {
    try {
      const v = JSON.parse(localStorage.getItem(STORE));
      if (v && Date.now() - v.at < MAX_AGE_MS) return v;
    } catch { /* ignore */ }
    return null;
  };
  const clear = () => { try { localStorage.removeItem(STORE); } catch { /* ignore */ } };

  const params = new URLSearchParams(window.location.search);
  const urlCode = (params.get('ref') || '').trim().toUpperCase();
  if (CODE_RE.test(urlCode)) {
    try {
      localStorage.setItem(STORE, JSON.stringify({ code: urlCode, vid: params.get('vid') || '', at: Date.now() }));
    } catch { /* ignore */ }
  }

  window.MOReferral = {
    // Untuk mengisi medan "Kod rujukan" dalam borang. Ibu bapa masih boleh menaip sendiri.
    code: () => (read() || {}).code || '',

    // code: pilihan, jika ibu bapa menaip kod sendiri dalam borang.
    async record({ phone, name, code }) {
      const stored = read() || {};
      const c = String(code || stored.code || '').trim().toUpperCase();
      if (!CODE_RE.test(c)) return { ok: false, reason: 'no_code' };
      let data;
      try {
        const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/record_registration`, {
          method: 'POST',
          headers: { apikey: CONFIG.SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            p_code: c,
            p_phone: phone,
            p_name: name,
            p_visitor: stored.code === c ? stored.vid || null : null,
            p_api_key: CONFIG.REGISTRATION_API_KEY || null,
          }),
        });
        if (!res.ok) return { ok: false, reason: 'network' };
        data = await res.json();
      } catch {
        return { ok: false, reason: 'network' };
      }
      // Padam supaya peranti yang sama tak tersalah kaitkan keluarga lain dengan penjemput ini.
      if (data.ok || ['duplicate', 'self_referral'].includes(data.reason)) clear();
      return data;
    },
  };
})();
