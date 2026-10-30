'use strict';

/**
 * Builds web/: laman statik yang bercakap terus dengan Supabase (tiada server Node).
 * Sumber: public/ (halaman asal) + web-src/ (login, admin, klien Supabase, config).
 * Hos web/ di mana-mana (Netlify, Cloudflare Pages, GitHub Pages). Usage: node scripts/build-web.js
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const pub = path.join(root, 'public');
const extra = path.join(root, 'web-src');
const out = path.join(root, 'web');

// Rebuild the compiled Tailwind stylesheet (content = public/**/*.html + web-src/**/*.html,
// see tailwind.config.js) so web/css/tailwind.css always matches current markup/classes.
execFileSync(
  path.join(root, 'node_modules', '.bin', 'tailwindcss'),
  ['-i', path.join(extra, 'css', 'tailwind-input.css'), '-o', path.join(pub, 'css', 'tailwind.css'), '--minify', '-c', path.join(root, 'tailwind.config.js')],
  { stdio: 'inherit' },
);

const SCRIPTS = [
  '<script src="js/common.js"></script>',
  '  <script src="js/config.js"></script>',
  '  <script src="js/supabase-api.js"></script>',
].join('\n');

// Netlify serves the static site at the domain root, so absolute clean paths
// (/, /login, /dashboard) already resolve correctly there — no .html rewrite
// needed, and keeping them absolute means the address bar never shows .html.
const links = [
  ['href="/css/tailwind.css"', 'href="css/tailwind.css"'],
];

const pages = {
  'index.html': { from: pub, edits: [['<script src="/js/common.js"></script>', SCRIPTS, true]] },
  'dashboard.html': { from: pub, edits: [['<script src="/js/common.js"></script>', SCRIPTS, true]] },
  'komuniti.html': { from: pub, edits: [['<script src="/js/common.js"></script>', SCRIPTS, true]] },
  'daftar.html': {
    from: pub,
    edits: [
      ['<script src="/js/common.js"></script>', SCRIPTS, true],
      ['window.location.href = url;', 'MO.goRegister(url);', true],
      ['href="https://pcs2.daftarmindaoptima.com"', 'href="https://daftarmindaoptima.com/f/kelas-membaca-minda-optima-fizikal"', true],
    ],
  },
  'login.html': { from: extra, edits: [['<script src="/js/common.js"></script>', SCRIPTS, true]] },
  'sokongan.html': {
    from: pub,
    edits: [
      ['<script src="/js/common.js"></script>', '<script src="js/common.js"></script>', true],
    ],
  },
  'admin.html': {
    from: extra,
    edits: [
      ['<script src="/js/common.js"></script>', '<script src="js/common.js"></script>', true],
    ],
  },
  'content.html': {
    from: extra,
    edits: [
      ['<script src="/js/common.js"></script>', '<script src="js/common.js"></script>', true],
    ],
  },
};

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'js'), { recursive: true });
fs.mkdirSync(path.join(out, 'css'), { recursive: true });
fs.copyFileSync(path.join(pub, 'css', 'tailwind.css'), path.join(out, 'css', 'tailwind.css'));
fs.copyFileSync(path.join(pub, 'js', 'common.js'), path.join(out, 'js', 'common.js'));
for (const f of ['config.js', 'supabase-api.js']) {
  fs.copyFileSync(path.join(extra, 'js', f), path.join(out, 'js', f));
}
for (const f of fs.readdirSync(pub)) {
  if (/\.(webp|png|jpg|jpeg|svg|ico)$/i.test(f)) {
    fs.copyFileSync(path.join(pub, f), path.join(out, f));
  }
}
for (const [name, { from, edits }] of Object.entries(pages)) {
  let html = fs.readFileSync(path.join(from, name), 'utf8');
  for (const [a, b, required] of [...edits, ...links.map((l) => [...l, false])]) {
    if (required && !html.includes(a)) {
      throw new Error(`${name}: teks tidak dijumpai, kod asal telah berubah: ${a}`);
    }
    html = html.split(a).join(b);
  }
  fs.writeFileSync(path.join(out, name), html);
}
console.log('Siap: web/ (letak seluruh folder ini di hos statik)');
