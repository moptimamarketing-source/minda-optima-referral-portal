/* Preview-only backend: replaces MO.api() so the pages work when opened directly
 * from disk (file://) with no server. Data lives in this browser's localStorage.
 * Mirrors the rules in src/app.js + src/lib.js. NOT for production. */
(() => {
  const KEY = 'mo_preview_db_v1';
  const PROMO_DEADLINE = new Date('2026-12-31T23:59:59+08:00');
  const REGISTER_URL = 'https://pcs2.daftarmindaoptima.com';

  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  };
  const db = Object.assign({ referrers: {}, referrals: [], otps: {}, session: null }, load());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } };

  const fail = (status, message) => Object.assign(new Error(message), { status });

  const normalizePhone = (input) => {
    if (typeof input !== 'string') return null;
    let d = input.replace(/\D/g, '');
    if (d.startsWith('60')) d = '0' + d.slice(2);
    return /^01\d{8,9}$/.test(d) ? d : null;
  };
  const formatPhone = (p) => `${p.slice(0, 3)}-${p.slice(3)}`;
  const maskPhone = (p) => `${p.slice(0, 3)}-${'*'.repeat(p.length - 7)}${p.slice(-4)}`;
  const maskName = (n) => {
    if (!n) return null;
    const parts = n.trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ${parts[1][0].toUpperCase()}.` : parts[0];
  };
  const normalizeCode = (c) => {
    if (typeof c !== 'string') return null;
    const v = c.trim().toUpperCase();
    return /^MO-\d{4}-[A-Z]{4}$/.test(v) ? v : null;
  };
  const genCode = (phone) => {
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let s = '';
    for (let i = 0; i < 4; i++) s += L[Math.floor(Math.random() * 26)];
    return `MO-${phone.slice(-4)}-${s}`;
  };
  const reward = (date) => (date <= PROMO_DEADLINE ? 100 : 50);

  // Same demo data as scripts/seed.js, for phone 012-3456789.
  function seedDemo() {
    const phone = '0123456789';
    if (db.referrers[phone]) return;
    db.referrers[phone] = { phone, name: 'Puan Siti Aminah', code: 'MO-6789-DEMO' };
    db.referrals.push(
      { code: 'MO-6789-DEMO', phone: '0171112222', name: 'Ahmad Faiz', status: 'paid', reward: 100, at: '2026-09-02T03:00:00.000Z' },
      { code: 'MO-6789-DEMO', phone: '0183334444', name: 'Nurul Huda', status: 'approved', reward: 100, at: '2026-09-20T05:30:00.000Z' },
      { code: 'MO-6789-DEMO', phone: '0195556666', name: 'Lim Mei Ling', status: 'pending', reward: 100, at: '2026-10-10T08:15:00.000Z' },
    );
    save();
  }
  seedDemo();

  function showOtp(phone, code) {
    let box = document.getElementById('preview-otp');
    if (!box) {
      box = document.createElement('div');
      box.id = 'preview-otp';
      box.setAttribute('role', 'status');
      box.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:60;max-width:92vw;' +
        'background:#111827;color:#fff;border:2px solid #FFB800;border-radius:12px;padding:10px 16px;' +
        'font:14px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 8px 24px #0006';
      document.body.appendChild(box);
    }
    box.innerHTML = '';
    const label = document.createElement('div');
    label.style.cssText = 'font-size:11px;opacity:.7';
    label.textContent = `PREVIEW · OTP WhatsApp untuk ${phone}`;
    const num = document.createElement('div');
    num.style.cssText = 'font-size:26px;font-weight:800;letter-spacing:.3em;color:#FFB800';
    num.textContent = code;
    box.append(label, num);
  }

  const referrerByCode = (code) => Object.values(db.referrers).find((r) => r.code === code);

  const routes = {
    'POST /api/otp/request'(body) {
      const phone = normalizePhone(body.phone);
      if (!phone) throw fail(422, 'Nombor telefon tidak sah. Contoh: 012-3456789');
      const prev = db.otps[phone];
      if (prev && Date.now() - prev.createdAt < 60000) {
        throw fail(429, `Sila tunggu ${Math.ceil((60000 - (Date.now() - prev.createdAt)) / 1000)} saat sebelum minta OTP baru.`);
      }
      const code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      db.otps[phone] = { code, attempts: 0, createdAt: Date.now(), expiresAt: Date.now() + 300000 };
      save();
      // No WhatsApp in preview: show the code on screen instead.
      showOtp(formatPhone(phone), code);
      return { ok: true, phone: formatPhone(phone), isNew: !db.referrers[phone], expiresIn: 300 };
    },

    'POST /api/otp/verify'(body) {
      const phone = normalizePhone(body.phone);
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      if (!phone || !/^\d{6}$/.test(code)) throw fail(422, 'Sila masukkan OTP 6 digit.');
      const otp = db.otps[phone];
      if (!otp || otp.expiresAt < Date.now()) throw fail(400, 'OTP telah tamat tempoh. Sila minta OTP baru.');
      if (otp.attempts >= 5) throw fail(429, 'Terlalu banyak cubaan. Sila minta OTP baru.');
      if (otp.code !== code) {
        otp.attempts += 1; save();
        throw fail(400, 'OTP salah. Sila cuba lagi.');
      }
      let referrer = db.referrers[phone];
      if (!referrer) {
        const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
        if (name.length < 2 || name.length > 80) throw fail(422, 'Sila masukkan nama penuh anda.');
        let c;
        do { c = genCode(phone); } while (referrerByCode(c));
        referrer = db.referrers[phone] = { phone, name, code: c };
      }
      delete db.otps[phone];
      db.session = phone;
      save();
      return { ok: true, redirect: 'dashboard.html' };
    },

    'GET /api/dashboard'() {
      const referrer = db.session && db.referrers[db.session];
      if (!referrer) throw fail(401, 'Sila log masuk.');
      const rows = db.referrals.filter((r) => r.code === referrer.code)
        .sort((a, b) => b.at.localeCompare(a.at));
      const stats = { totalReferrals: rows.length, rewardPending: 0, totalEarned: 0 };
      for (const r of rows) {
        if (r.status === 'pending') stats.rewardPending += r.reward;
        if (r.status === 'approved' || r.status === 'paid') stats.totalEarned += r.reward;
      }
      return {
        referrer: { name: referrer.name, phone: formatPhone(referrer.phone), code: referrer.code },
        stats,
        referrals: rows.map((r) => ({
          name: maskName(r.name), phone: maskPhone(r.phone), registeredAt: r.at, status: r.status, reward: r.reward,
        })),
        shareUrl: `${REGISTER_URL}?ref=${encodeURIComponent(referrer.code)}`,
        promo: { deadline: PROMO_DEADLINE.toISOString(), currentReward: reward(new Date()) },
      };
    },

    'POST /api/logout'() {
      db.session = null; save();
      return { ok: true };
    },
  };

  const origApi = MO.api;
  MO.api = async (path, { method = 'GET', body } = {}) => {
    const lookup = path.match(/^\/api\/referral\/([^/]+)$/);
    if (method === 'GET' && lookup) {
      const code = normalizeCode(decodeURIComponent(lookup[1]));
      const referrer = code && referrerByCode(code);
      if (!referrer) throw fail(404, 'Kod rujukan tidak dijumpai.');
      return {
        code: referrer.code,
        referrerName: maskName(referrer.name),
        registerUrl: `${REGISTER_URL}?ref=${encodeURIComponent(referrer.code)}`,
      };
    }
    const handler = routes[`${method} ${path}`];
    if (!handler) return origApi(path, { method, body });
    return handler(body || {});
  };

  // Small floating helper: reset demo data.
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.createElement('button');
    b.textContent = 'PREVIEW · reset data';
    b.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:50;font:11px sans-serif;padding:4px 8px;border-radius:6px;background:#0008;color:#fff;border:0;cursor:pointer';
    b.onclick = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } location.href = 'index.html'; };
    document.body.appendChild(b);
  });
})();
