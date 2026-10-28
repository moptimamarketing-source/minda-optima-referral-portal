import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock data
const mockRef = {
  name: 'Firdaus Ahmad',
  email: 'firdaus@example.com',
  phone: '012-3456789'
};

const mockApprovedRow = {
  status: 'approved',
  reward: '100',
  referrers: mockRef
};

const mockPaidRow = {
  status: 'paid',
  reward: '100',
  referrers: mockRef
};

const SITE = 'https://minda-optima-referral.netlify.app';

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Generate Approved Email
function approvedEmail(row) {
  const ref = row.referrers;
  return `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;background:#ffffff;padding:0;color:#1e293b">
        <!-- Header Image -->
        <div style="text-align:center">
          <img src="https://drive.google.com/uc?id=15gWaMZTfS9d8-z1yN7dKLmvDgjPYGbud" alt="Minda Optima" style="width:100%;max-width:560px;display:block">
        </div>

        <!-- Content -->
        <div style="padding:40px 24px">
          <!-- Greeting -->
          <h1 style="font-size:24px;font-weight:700;color:#1e293b;margin:0 0 8px 0;text-align:center">✓ Rujukan Anda Layak!</h1>
          <p style="font-size:14px;color:#64748b;margin:0 0 32px 0;text-align:center;line-height:1.6">Tahniah! Rujukan anda telah disahkan memenuhi kriteria program kami.</p>

          <!-- Status Box -->
          <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:12px;padding:24px;margin:32px 0;text-align:center;color:white">
            <p style="font-size:14px;color:rgba(255,255,255,0.9);margin:0 0 12px 0;text-transform:uppercase;font-weight:700;letter-spacing:1px">Status Rujukan</p>
            <p style="font-size:32px;font-weight:900;margin:0">✓ Layak</p>
          </div>

          <!-- Reward Details -->
          <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:32px 0;font-size:14px">
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e2e8f0">
              <span style="color:#64748b">Ganjaran</span>
              <span style="font-weight:700;color:#0D2A5C">RM${esc(row.reward)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:12px 0">
              <span style="color:#64748b">Tarikh Disahkan</span>
              <span style="font-weight:700;color:#0D2A5C">${new Date().toLocaleDateString('ms-MY')}</span>
            </div>
          </div>

          <!-- Timeline Info -->
          <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;border-radius:6px;margin:32px 0;font-size:13px;color:#065f46;line-height:1.6">
            <strong style="display:block;margin-bottom:8px">⏱️ Garis Masa Pembayaran:</strong>
            Pembayaran reward akan diproses dalam <strong>5-7 hari kerja</strong> ke akaun Touch 'n Go anda.
          </div>

          <!-- CTA Button -->
          <div style="text-align:center;margin:32px 0">
            <a href="${SITE}/dashboard.html" style="display:inline-block;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;background:linear-gradient(135deg,#0D2A5C 0%,#1a3a7a 100%);color:white">Buka Dashboard</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#1a1a1a;color:white;padding:24px;text-align:center;font-size:12px">
          <div style="margin-bottom:12px">
            <a href="https://www.facebook.com/MindaOptimaOfficial" style="color:white;text-decoration:none;margin:0 6px">Facebook</a> •
            <a href="https://www.instagram.com/mindaoptima/" style="color:white;text-decoration:none;margin:0 6px">Instagram</a> •
            <a href="https://www.tiktok.com/@minda_optima" style="color:white;text-decoration:none;margin:0 6px">TikTok</a> •
            <a href="https://www.youtube.com/@mindaoptimahq" style="color:white;text-decoration:none;margin:0 6px">YouTube</a> •
            <a href="https://www.threads.com/@mindaoptima" style="color:white;text-decoration:none;margin:0 6px">Threads</a>
          </div>
          <p style="color:#999;font-size:11px;margin:0">© 2026 Minda Optima</p>
        </div>
      </div>`;
}

// Generate Paid Email
function paidEmail(row) {
  const ref = row.referrers;
  const acc = ref.phone ? `Touch 'n Go •••• ${esc(String(ref.phone).slice(-4))}` : "Touch 'n Go anda";
  return `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:560px;margin:auto;background:#ffffff;padding:0;color:#1e293b">
        <!-- Header Image -->
        <div style="text-align:center">
          <img src="https://drive.google.com/uc?id=15gWaMZTfS9d8-z1yN7dKLmvDgjPYGbud" alt="Minda Optima" style="width:100%;max-width:560px;display:block">
        </div>

        <!-- Content -->
        <div style="padding:40px 24px">
          <!-- Greeting -->
          <h1 style="font-size:24px;font-weight:700;color:#1e293b;margin:0 0 8px 0;text-align:center">🎉 Pembayaran Selesai!</h1>
          <p style="font-size:14px;color:#64748b;margin:0 0 32px 0;text-align:center;line-height:1.6">Ganjaran anda telah diproses dan akan masuk ke akaun Touch 'n Go anda.</p>

          <!-- Payment Status Box -->
          <div style="background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);border-radius:12px;padding:24px;margin:32px 0;text-align:center;color:white">
            <p style="font-size:14px;color:rgba(255,255,255,0.9);margin:0 0 12px 0;text-transform:uppercase;font-weight:700;letter-spacing:1px">Status Pembayaran</p>
            <p style="font-size:32px;font-weight:900;margin:0">✓ Dibayar</p>
          </div>

          <!-- Payment Details -->
          <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:32px 0;font-size:14px">
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e2e8f0">
              <span style="color:#64748b">Jumlah Ganjaran</span>
              <span style="font-weight:700;color:#0D2A5C">RM${esc(row.reward)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e2e8f0">
              <span style="color:#64748b">Akaun Tujuan</span>
              <span style="font-weight:700;color:#0D2A5C">${acc}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:12px 0">
              <span style="color:#64748b">Tarikh Pembayaran</span>
              <span style="font-weight:700;color:#0D2A5C">${new Date().toLocaleDateString('ms-MY')}</span>
            </div>
          </div>

          <!-- Confirmation Info -->
          <div style="background:#fdf4f5;border-left:4px solid #8b5cf6;padding:16px;border-radius:6px;margin:32px 0;font-size:13px;color:#581c87;line-height:1.6">
            <strong style="display:block;margin-bottom:8px">✓ Pembayaran Diproses</strong>
            Sila semak akaun Touch 'n Go anda dalam <strong>1-2 hari kerja</strong>. Terima kasih kerana menjadi bagian dari komuniti Minda Optima!
          </div>

          <!-- CTA Button -->
          <div style="text-align:center;margin:32px 0">
            <a href="${SITE}/dashboard.html" style="display:inline-block;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;background:linear-gradient(135deg,#0D2A5C 0%,#1a3a7a 100%);color:white">Buka Dashboard</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#1a1a1a;color:white;padding:24px;text-align:center;font-size:12px">
          <div style="margin-bottom:12px">
            <a href="https://www.facebook.com/MindaOptimaOfficial" style="color:white;text-decoration:none;margin:0 6px">Facebook</a> •
            <a href="https://www.instagram.com/mindaoptima/" style="color:white;text-decoration:none;margin:0 6px">Instagram</a> •
            <a href="https://www.tiktok.com/@minda_optima" style="color:white;text-decoration:none;margin:0 6px">TikTok</a> •
            <a href="https://www.youtube.com/@mindaoptimahq" style="color:white;text-decoration:none;margin:0 6px">YouTube</a> •
            <a href="https://www.threads.com/@mindaoptima" style="color:white;text-decoration:none;margin:0 6px">Threads</a>
          </div>
          <p style="color:#999;font-size:11px;margin:0">© 2026 Minda Optima</p>
        </div>
      </div>`;
}

import fs from 'fs';

const approvedHtml = approvedEmail(mockApprovedRow);
const paidHtml = paidEmail(mockPaidRow);

fs.writeFileSync('/tmp/approved-preview.html', approvedHtml);
fs.writeFileSync('/tmp/paid-preview.html', paidHtml);

console.log('✅ Approved email preview saved to /tmp/approved-preview.html');
console.log('✅ Paid email preview saved to /tmp/paid-preview.html');
