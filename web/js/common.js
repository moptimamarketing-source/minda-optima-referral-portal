/* Shared helpers for all pages. Tailwind is a pre-built stylesheet (css/tailwind.css);
   colors/fonts live in tailwind.config.js at the repo root, not here. */

const MO = (() => {
  // Nilai lalai; ditulis ganti oleh /.netlify/functions/settings (boleh diedit dalam admin.html).
  let PROMO_DEADLINE = new Date('2026-12-31T23:59:59+08:00');

  function countdownParts(target, now = new Date()) {
    const ms = Math.max(0, target.getTime() - now.getTime());
    const s = Math.floor(ms / 1000);
    return {
      done: ms === 0,
      days: Math.floor(s / 86400),
      hours: Math.floor((s % 86400) / 3600),
      minutes: Math.floor((s % 3600) / 60),
      seconds: s % 60,
    };
  }

  /** Fill every [data-countdown] element with a live countdown to the promo deadline. */
  function startCountdowns(target = PROMO_DEADLINE) {
    const els = document.querySelectorAll('[data-countdown]');
    if (!els.length) return;
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      const p = countdownParts(target);
      const text = p.done
        ? 'Tawaran telah tamat'
        : `${p.days} hari ${pad(p.hours)}j ${pad(p.minutes)}m ${pad(p.seconds)}s`;
      els.forEach((el) => { el.textContent = text; });
      if (p.done) clearInterval(timer);
    };
    const timer = setInterval(tick, 1000);
    tick();
  }

  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Ralat rangkaian. Sila cuba lagi.');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  let SUPPORT_PHONE = '601158526817';

  function initSupportLinks() {
    document.querySelectorAll('[data-support-link]').forEach((a) => {
      a.href = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent('Salam, saya memerlukan bantuan')}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
  }

  let resolveSettingsReady;
  const settingsReady = new Promise((resolve) => { resolveSettingsReady = resolve; });
  let lastSettings = {};

  // Preset warna untuk kad komuniti (data-content-color="community_color").
  const COLOR_PRESETS = { telegram: '#229ED9', whatsapp: '#25D366', brand: '#0D2A5C' };

  /** Ambil tetapan & kandungan page (promo, reward, support, teks, komuniti) dari admin dan
   * tulis ganti nilai lalai dalam HTML. Elemen guna data-content="<kunci>" untuk teks,
   * data-content-link="<kunci>" untuk href, data-content-color="<kunci>" untuk warna latar. */
  async function loadSiteSettings() {
    let s = {};
    try {
      const res = await fetch('/.netlify/functions/settings', { credentials: 'same-origin' });
      if (res.ok) s = await res.json();
    } catch {
      // guna nilai lalai bila offline / ralat rangkaian
    }

    if (s.promo_deadline) {
      const d = new Date(s.promo_deadline);
      if (!Number.isNaN(d.getTime())) PROMO_DEADLINE = d;
    }
    if (s.support_phone) SUPPORT_PHONE = s.support_phone;

    document.querySelectorAll('[data-content]').forEach((el) => {
      const v = s[el.dataset.content];
      if (v) el.textContent = v;
    });
    document.querySelectorAll('[data-content-link]').forEach((el) => {
      const v = s[el.dataset.contentLink];
      if (v) el.href = v;
    });
    document.querySelectorAll('[data-content-color]').forEach((el) => {
      const preset = COLOR_PRESETS[s[el.dataset.contentColor]];
      if (preset) el.style.background = preset;
    });
    document.querySelectorAll('[data-content-list]').forEach((el) => {
      const v = s[el.dataset.contentList];
      if (!v) return;
      const items = v.split('\n').map((line) => line.trim()).filter(Boolean);
      if (items.length === 0) return;
      el.innerHTML = '';
      for (const item of items) {
        const li = document.createElement('li');
        li.textContent = item;
        el.appendChild(li);
      }
    });

    if (s.promo_enabled === 'false') {
      document.querySelectorAll('[data-promo-only]').forEach((el) => { el.classList.add('hidden'); });
    }

    lastSettings = s;
    resolveSettingsReady();
    return s;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await loadSiteSettings();
    startCountdowns();
    initSupportLinks();
  });

  return {
    countdownParts, startCountdowns, api, copyText, escapeHtml, initSupportLinks,
    settingsReady,
    get PROMO_DEADLINE() { return PROMO_DEADLINE; },
    get settings() { return lastSettings; },
  };
})();
