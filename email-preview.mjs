import { confirmationEmail } from './netlify/functions/auth.mjs';

const testData = {
  name: 'Firdaus Test',
  code: 'MO-2531-YHLA',
  phone: '012-3456789',
  email: 'firdaus141000@gmail.com',
  occupation: 'Engineer',
};

const html = confirmationEmail(testData);

// Save to file
import fs from 'fs';
fs.writeFileSync('/tmp/email-preview.html', html);
console.log('✅ Preview saved to /tmp/email-preview.html');
