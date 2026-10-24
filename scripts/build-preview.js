'use strict';

/**
 * Builds preview/ — the same pages as public/, rewired to work when opened from
 * disk (double-click index.html) using scripts/mock-api.js instead of the server.
 * Usage: node scripts/build-preview.js
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'public');
const out = path.join(root, 'preview');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'js'), { recursive: true });
fs.copyFileSync(path.join(src, 'js', 'common.js'), path.join(out, 'js', 'common.js'));
fs.copyFileSync(path.join(__dirname, 'mock-api.js'), path.join(out, 'js', 'mock-api.js'));

const rewrites = [
  ['<script src="/js/common.js"></script>', '<script src="js/common.js"></script>\n  <script src="js/mock-api.js"></script>'],
  ['href="/"', 'href="index.html"'],
  ['href="/login"', 'href="login.html"'],
  ['href="/dashboard"', 'href="dashboard.html"'],
  ["window.location.replace('/login')", "window.location.replace('login.html')"],
  ["window.location.href = '/';", "window.location.href = 'index.html';"],
  ["data.redirect || '/dashboard'", "data.redirect || 'dashboard.html'"],
];

for (const file of ['index.html', 'login.html', 'dashboard.html', 'daftar.html']) {
  let html = fs.readFileSync(path.join(src, file), 'utf8');
  for (const [from, to] of rewrites) html = html.split(from).join(to);
  fs.writeFileSync(path.join(out, file), html);
}
console.log('Preview siap: preview/index.html');
