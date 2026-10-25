/* Shared helpers for all pages. Loaded right after the Tailwind CDN script. */

tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#0D2A5C', light: '#1B4A94', dark: '#081B3D' },
        gold: { DEFAULT: '#FFB800', light: '#FFE08A', dark: '#C98F00' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
};

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

  /** Ambil tetapan laman (promo, reward, support, telegram) dari admin dan tulis ganti nilai lalai. */
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
    if (s.telegram_url) {
      window.MO_CONFIG = window.MO_CONFIG || {};
      window.MO_CONFIG.TELEGRAM_URL = s.telegram_url;
    }
    if (s.reward_before) {
      document.querySelectorAll('[data-reward-before]').forEach((el) => { el.textContent = s.reward_before; });
    }
    if (s.reward_after) {
      document.querySelectorAll('[data-reward-after]').forEach((el) => { el.textContent = s.reward_after; });
    }

    lastSettings = s;
    resolveSettingsReady();
    return s;
  }

  function initBgMusic() {
    const audio = document.getElementById('bg-music');
    const btn = document.getElementById('music-toggle');
    if (!audio || !btn) return;

    const KEY = 'mo_music_muted';
    let muted = localStorage.getItem(KEY) === '1';

    function applyIcon() {
      btn.textContent = muted ? '🔇' : '🔊';
    }

    function attemptPlay() {
      audio.muted = muted;
      audio.play().catch(() => {});
    }

    applyIcon();
    attemptPlay();

    // Mobile browsers block audio until the user interacts with the page at least
    // once; retry on the first tap/click anywhere, using the *current* mute state.
    ['click', 'touchend', 'pointerdown'].forEach((evt) => {
      document.addEventListener(evt, attemptPlay, { once: true, passive: true });
    });

    btn.addEventListener('click', () => {
      muted = !muted;
      localStorage.setItem(KEY, muted ? '1' : '0');
      applyIcon();
      attemptPlay();
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await loadSiteSettings();
    startCountdowns();
    initSupportLinks();
    initBgMusic();
  });

  return {
    countdownParts, startCountdowns, api, copyText, escapeHtml, initSupportLinks, initBgMusic,
    settingsReady,
    get PROMO_DEADLINE() { return PROMO_DEADLINE; },
    get settings() { return lastSettings; },
  };
})();
