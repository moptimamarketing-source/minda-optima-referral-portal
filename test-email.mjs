import { confirmationEmail } from './netlify/functions/auth.mjs';
import { sendEmail } from './netlify/lib/email.mjs';

const testData = {
  name: 'Firdaus Test',
  code: 'MO-2531-YHLA',
  phone: '012-3456789',
  email: 'firdaus141000@gmail.com',
  occupation: 'Engineer',
};

console.log('🧪 Testing Welcome Email...\n');

// Generate email HTML
const html = confirmationEmail(testData);

// Try to send
console.log('📧 Sending to:', testData.email);
const result = await sendEmail(
  testData.email,
  `Pendaftaran Berjaya — Kod Rujukan ${testData.code}`,
  html
);

if (result.ok) {
  console.log('✅ Email sent successfully!');
} else {
  console.log('❌ Failed:', result.error);
}
