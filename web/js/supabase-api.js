/* Menggantikan MO.api() supaya halaman bercakap dengan Supabase (RPC) terus dari browser.
 * Peraturan sebenar ada dalam supabase/schema.sql; fail ini hanya menterjemah panggilan. */
(() => {
  const cfg = window.MO_CONFIG;
  const base = cfg.SUPABASE_URL.replace(/\/+$/, '');
  const PHONE_KEY = 'mo_phone';
  const VID_KEY = 'mo_vid';
  const CTA_WAIT_MS = 700;

  const fail = (status, message, extra) => Object.assign(new Error(message), { status }, extra);

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  let memVid;
  function visitorId() {
    let v = store.get(VID_KEY) || memVid;
    if (!v) {
      v = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}${String(Math.random()).slice(2)}`;
      memVid = v;
      store.set(VID_KEY, v);
    }
    return v;
  }

  async function rpc(fn, args) {
    let res;
    try {
      res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { apikey: cfg.SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
    } catch {
      throw fail(0, 'Tiada sambungan internet. Sila cuba lagi.');
    }
    if (!res.ok) throw fail(res.status, 'Ralat pelayan. Sila cuba lagi sebentar.');
    return res.json();
  }

  // Kod dibawa ke borang pendaftaran melalui UTM parameters. vid menyambung klik dengan pendaftaran.
  function registerUrl(code) {
    const u = new URL(cfg.REGISTER_URL);
    u.searchParams.set('utm_source', 'referral');
    u.searchParams.set('utm_term', code);
    u.searchParams.set('vid', visitorId());
    return u.toString();
  }

  // Pautan yang dikongsi ke WhatsApp: halaman jemputan portal ini, supaya setiap klik direkod.
  function shareUrl(code) {
    const u = new URL('daftar.html', window.location.href);
    u.search = '';
    u.hash = '';
    u.searchParams.set('ref', code);
    return u.toString();
  }

  let landingCode = null;

  MO.trackCta = () => {
    if (!landingCode) return Promise.resolve();
    const send = rpc('track_event', { p_code: landingCode, p_visitor: visitorId(), p_event: 'cta_click' }).catch(() => {});
    return Promise.race([send, new Promise((r) => setTimeout(r, CTA_WAIT_MS))]);
  };

  MO.goRegister = (url) => {
    MO.trackCta().finally(() => { window.location.href = url; });
  };

  document.addEventListener('DOMContentLoaded', () => {
    const cta = document.getElementById('cta');
    if (!cta) return;
    cta.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!landingCode) return;
      e.preventDefault();
      MO.goRegister(cta.href);
    });
  });

  MO.api = async (path, { method = 'GET', body } = {}) => {
    const lookup = path.match(/^\/api\/referral\/([^/]+)$/);
    if (method === 'GET' && lookup) {
      const r = await rpc('track_event', {
        p_code: decodeURIComponent(lookup[1]), p_visitor: visitorId(), p_event: 'landing',
      });
      if (!r.found) throw fail(404, 'Kod rujukan tidak dijumpai.');
      landingCode = r.code;
      return { code: r.code, referrerName: r.referrerName, registerUrl: registerUrl(r.code) };
    }

    if (method === 'POST' && path === '/api/login') {
      const r = await rpc('register_referrer', { p_phone: body.phone, p_name: body.name || null });
      if (!r.ok) {
        if (r.reason === 'invalid_phone') throw fail(422, 'Nombor telefon tidak sah. Contoh: 012-3456789');
        if (r.reason === 'name_required') throw fail(422, 'Nombor baru. Sila masukkan nama penuh anda.', { needName: true });
        throw fail(400, 'Tidak dapat meneruskan. Sila cuba lagi.');
      }
      store.set(PHONE_KEY, r.phone);
      return { ok: true, redirect: 'dashboard.html' };
    }

    if (method === 'GET' && path === '/api/dashboard') {
      const phone = store.get(PHONE_KEY);
      if (!phone) throw fail(401, 'Sila log masuk.');
      const d = await rpc('referrer_dashboard', { p_phone: phone });
      if (!d.ok) {
        store.del(PHONE_KEY);
        throw fail(401, 'Sila log masuk.');
      }
      return {
        referrer: d.referrer, stats: d.stats, referrals: d.referrals, promo: d.promo,
        shareUrl: shareUrl(d.referrer.code),
      };
    }

    if (method === 'POST' && path === '/api/logout') {
      store.del(PHONE_KEY);
      return { ok: true };
    }

    throw fail(404, 'Tidak dijumpai.');
  };
})();
