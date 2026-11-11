// Jana poster ganjaran (Rebat Yuran / Voucher Buku / Touch 'n Go) di canvas, timpa
// gambar asas dengan kod/tarikh luput yang betul. Guna sama di admin.html (admin jana
// & muat turun) dan dashboard.html (parent lihat lepas admin "terbitkan").
window.RewardPoster = (() => {
  const POSTERS = {
    rebat_yuran: {
      src: '/rebat-yuran-poster.webp',
      width: 1983, height: 793,
      code: { x: 215, y: 615, font: 'bold 34px Arial', color: '#0D2A5C' },
    },
    voucher_buku: {
      src: '/voucher-buku-poster.webp',
      width: 2000, height: 667,
      code: { x: 215, y: 575, font: 'bold 28px Arial', color: '#6B4A14' },
      expiry: { x: 1215, y: 579, font: 'italic 17px Georgia', color: '#FBEFD8' },
    },
    tng: {
      src: '/tng-poster.webp',
      width: 2000, height: 667,
    },
  };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Gagal muat gambar poster: ${src}`));
      img.src = src;
    });
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
  }

  /** { type, code, expiresAt } -> Promise<HTMLCanvasElement> */
  async function render({ type, code, expiresAt }) {
    const cfg = POSTERS[type];
    if (!cfg) throw new Error('Jenis ganjaran tak dikenali untuk poster.');
    const img = await loadImage(cfg.src);
    const canvas = document.createElement('canvas');
    canvas.width = cfg.width;
    canvas.height = cfg.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, cfg.width, cfg.height);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    if (cfg.code && code) {
      ctx.font = cfg.code.font;
      ctx.fillStyle = cfg.code.color;
      ctx.fillText(code, cfg.code.x, cfg.code.y);
    }
    if (cfg.expiry && expiresAt) {
      ctx.font = cfg.expiry.font;
      ctx.fillStyle = cfg.expiry.color;
      ctx.fillText(formatDate(expiresAt), cfg.expiry.x, cfg.expiry.y);
    }
    return canvas;
  }

  function download(canvas, filename) {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    a.click();
  }

  return { render, download, formatDate, POSTERS };
})();
