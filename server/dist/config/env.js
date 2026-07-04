"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Resolve and load environment variables safely from active directory paths
const primaryPath = path_1.default.resolve(process.cwd(), '.env');
const fallbackPath = path_1.default.resolve(__dirname, '../../.env');
if (fs_1.default.existsSync(primaryPath)) {
    dotenv_1.default.config({ path: primaryPath });
}
else if (fs_1.default.existsSync(fallbackPath)) {
    dotenv_1.default.config({ path: fallbackPath });
}
else {
    dotenv_1.default.config();
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
else if (process.env.RAZORPAY_KEY_ID.includes('xxxxxxxxx') ||
    process.env.RAZORPAY_KEY_SECRET.includes('xxxxxxxx')) {
    console.warn('\n========================================================================');
    console.warn('[CONFIG WARNING] Razorpay credentials are using placeholder values!');
    console.warn('Payments will fail with 401 Unauthorized until actual dashboard keys are set.');
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
exports.config = {
    PORT: parseInt(process.env.PORT || '5000', 10),
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/ludo_game',
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    OTP_EXPIRY_MINS: parseInt(process.env.OTP_EXPIRY_MINS || '5', 10),
    PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || 'mock_webhook_secret_key_12345',
    ADMIN_SECRET_KEY: process.env.ADMIN_SECRET_KEY || 'admin_master_access_token_999',
    NODE_ENV: process.env.NODE_ENV || 'development',
};
