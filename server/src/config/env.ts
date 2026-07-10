import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Resolve and load environment variables safely from active directory paths
const primaryPath = path.resolve(process.cwd(), '.env');
const fallbackPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(primaryPath)) {
  dotenv.config({ path: primaryPath });
} else if (fs.existsSync(fallbackPath)) {
  dotenv.config({ path: fallbackPath });
} else {
  dotenv.config();
}

console.log('[Env Service] Checking Environment Variables:');
console.log(`- JWT_SECRET exists: ${!!process.env.JWT_SECRET}`);
console.log(`- JWT_REFRESH_SECRET exists: ${!!process.env.JWT_REFRESH_SECRET}`);
console.log(`- MONGO_URI exists: ${!!process.env.MONGO_URI}`);
console.log(`- RAZORPAY_KEY_ID exists: ${!!process.env.RAZORPAY_KEY_ID}`);
console.log(`- RAZORPAY_KEY_SECRET exists: ${!!process.env.RAZORPAY_KEY_SECRET}`);

if (process.env.RAZORPAY_KEY_ID) {
  console.log(`- RAZORPAY_KEY_ID Prefix: ${process.env.RAZORPAY_KEY_ID.substring(0, 10)}`);
}

// Print warnings instead of exiting to keep the server running
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('\n========================================================================');
  console.warn('[CONFIG WARNING] Razorpay credentials are missing in your server .env!');
  console.warn('Payments will fail with config error until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set.');
  console.warn('========================================================================\n');
}

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('\n========================================================================');
  console.warn('[CONFIG WARNING] Brevo SMTP credentials (SMTP_USER / SMTP_PASS) are missing in your server .env!');
  console.warn('Emails will not be sent, but OTPs will still print to your terminal console for local testing.');
  console.warn('========================================================================\n');
}

const requiredEnv = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MONGO_URI'
];

// Verify remaining required environment variables (exit only on core authentication/DB config faults)
for (const env of requiredEnv) {
  if (!process.env[env]) {
    console.error(`[CRITICAL CONFIG ERROR] Missing required environment variable: ${env}`);
    process.exit(1);
  }
}

export const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/ludo_game',
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
  OTP_EXPIRY_MINS: parseInt(process.env.OTP_EXPIRY_MINS || '5', 10),
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || 'mock_webhook_secret_key_12345',
  ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY || 'admin_master_access_token_999',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
