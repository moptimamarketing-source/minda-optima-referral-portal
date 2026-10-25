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
  // RM100 promo ends 31 Dec 2026, 11:59:59 PM Malaysia time.
  const PROMO_DEADLINE = new Date('2026-12-31T23:59:59+08:00');

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

  function initWhatsAppButton(phoneNumber = '601158526817', text = 'Sokongan') {
    if (document.getElementById('mo-whatsapp-btn')) return; // Already added
    const btn = document.createElement('a');
    btn.id = 'mo-whatsapp-btn';
    btn.href = `https://wa.me/${phoneNumber}?text=Halo,%20saya%20memerlukan%20bantuan`;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.title = text;
    btn.innerHTML = '💬 WhatsApp';
    btn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #25D366;
      color: white;
      padding: 12px 16px;
      border-radius: 50px;
      text-decoration: none;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    btn.onmouseover = () => btn.style.transform = 'scale(1.1)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';
    document.body.appendChild(btn);
  }

  function initBgMusic() {
    const audio = document.getElementById('bg-music');
    const btn = document.getElementById('music-toggle');
    if (!audio || !btn) return;

    const KEY = 'mo_music_muted';
    let muted = localStorage.getItem(KEY) === '1';

    function applyState() {
      audio.muted = muted;
      btn.textContent = muted ? '🔇' : '🔊';
    }
    applyState();

    function tryPlay() {
      audio.play().catch(() => {
        const resume = () => {
          audio.play().catch(() => {});
          document.removeEventListener('click', resume);
          document.removeEventListener('touchstart', resume);
        };
        document.addEventListener('click', resume, { once: true });
        document.addEventListener('touchstart', resume, { once: true });
      });
    }
    tryPlay();

    btn.addEventListener('click', () => {
      muted = !muted;
      localStorage.setItem(KEY, muted ? '1' : '0');
      applyState();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    startCountdowns();
    initWhatsAppButton();
    initBgMusic();
  });

  return { PROMO_DEADLINE, countdownParts, startCountdowns, api, copyText, escapeHtml, initWhatsAppButton, initBgMusic };
})();
