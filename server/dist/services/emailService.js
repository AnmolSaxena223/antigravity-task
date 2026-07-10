"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOTPEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Brevo SMTP host is smtp-relay.brevo.com by default
const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const smtpFrom = process.env.SMTP_FROM || '"Ludo Master" <no-reply@ludomaster.com>';
// Create transporter
const transporter = nodemailer_1.default.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
        user: smtpUser,
        pass: smtpPass,
    },
});
/**
 * Send OTP to user's email
 */
const sendOTPEmail = async (email, otp) => {
    // Always log OTP to console for local testing / development
    console.log(`\n==============================================`);
    console.log(`[Email Service] Generated OTP for local testing:`);
    console.log(`Recipient: ${email}`);
    console.log(`OTP Code:  ${otp}`);
    console.log(`==============================================\n`);
    // Check if SMTP configuration is set. If not, log a warning and return true (mock success)
    if (!smtpUser || !smtpPass) {
        console.warn(`[Email Service Warning] Brevo SMTP credentials not configured (SMTP_USER/SMTP_PASS). Skipping actual email send.`);
        return true;
    }
    try {
        const mailOptions = {
            from: smtpFrom,
            to: email,
            subject: 'Ludo Master Secure OTP Verification',
            text: `Your Ludo Master verification code is: ${otp}. This code is valid for 5 minutes.`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 1px;">LUDO MASTER</h2>
          </div>
          <div style="padding: 20px; border-top: 3px solid #4f46e5; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #1f2937; margin-top: 0;">Hello,</p>
            <p style="font-size: 16px; color: #4b5563; line-height: 1.5;">You are receiving this email because you requested a secure One-Time Password (OTP) to authenticate your account on Ludo Master.</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="display: inline-block; font-size: 32px; font-weight: 800; color: #4f46e5; background-color: #e0e7ff; padding: 12px 30px; border-radius: 8px; letter-spacing: 4px; border: 1px dashed #4f46e5;">${otp}</span>
            </div>
            <p style="font-size: 14px; color: #dc2626; font-weight: bold; text-align: center;">This OTP is valid for 5 minutes. Please do not share this code with anyone.</p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 0;">If you did not request this OTP, you can safely ignore this email.</p>
          </div>
        </div>
      `
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email Service] OTP email sent successfully. Message ID: ${info.messageId}`);
        return true;
    }
    catch (error) {
        console.error(`[Email Service Error] Failed to send OTP email:`, error);
        return false;
    }
};
exports.sendOTPEmail = sendOTPEmail;
