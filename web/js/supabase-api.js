/* Menggantikan MO.api() supaya halaman bercakap dengan Supabase (RPC) terus dari browser.
 * Peraturan sebenar ada dalam supabase/schema.sql; fail ini hanya menterjemah panggilan. */
(() => {
  const cfg = window.MO_CONFIG;
  const base = cfg.SUPABASE_URL.replace(/\/+$/, '');
  const SESSION_KEY = 'mo_session';
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

  async function callAuth(body) {
    let res;
    try {
      res = await fetch('/.netlify/functions/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      throw fail(0, 'Tiada sambungan internet. Sila cuba lagi.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw fail(res.status, data.error || 'Ralat pelayan. Sila cuba lagi.');
    return data;
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

    if (method === 'POST' && path === '/api/auth/send-otp') {
      return callAuth({ action: 'send-otp', phone: body.phone, email: body.email });
    }

    if (method === 'POST' && path === '/api/auth/verify-otp') {
      const data = await callAuth({ action: 'verify-otp', phone: body.phone, otp: body.otp });
      store.set(SESSION_KEY, data.token);
      return data;
    }

    if (method === 'POST' && path === '/api/login') {
      const data = await callAuth({
        action: 'register',
        token: store.get(SESSION_KEY),
        name: body.name,
        bank_account: body.bank_account,
        bank_name: body.bank_name,
        occupation: body.occupation,
      });
      return { ok: true, code: data.code, redirect: 'dashboard.html' };
    }

    if (method === 'GET' && path === '/api/dashboard') {
      const token = store.get(SESSION_KEY);
      if (!token) throw fail(401, 'Sila log masuk.');
      let d;
      try {
        d = await callAuth({ action: 'dashboard', token });
      } catch (err) {
        if (err.status === 401) store.del(SESSION_KEY);
        throw err;
      }
      return {
        referrer: d.referrer, stats: d.stats, referrals: d.referrals, promo: d.promo,
        shareUrl: shareUrl(d.referrer.code),
      };
    }

    if (method === 'POST' && path === '/api/logout') {
      const token = store.get(SESSION_KEY);
      store.del(SESSION_KEY);
      if (token) await callAuth({ action: 'logout', token }).catch(() => {});
      return { ok: true };
    }

    throw fail(404, 'Tidak dijumpai.');
  };
})();
