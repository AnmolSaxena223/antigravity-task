import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Hash a plain text password.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

/**
 * Verify a plain text password against a hash.
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate a JWT Access Token.
 */
export const generateAccessToken = (payload: { userId: string; role: string }): string => {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '15m' });
};

/**
 * Generate a JWT Refresh Token.
 */
export const generateRefreshToken = (payload: { userId: string }): string => {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

/**
 * Verify JWT Access Token.
 */
export const verifyAccessToken = (token: string): any => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Verify JWT Refresh Token.
 */
export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Generate a cryptographically secure 6-digit numeric OTP.
 */
export const generateOTP = (): string => {
  const val = crypto.randomInt(100000, 999999);
  return val.toString();
};

/**
 * Generate a secure random alphanumeric string (for referral codes, payment IDs etc.).
 */
export const generateRandomString = (length: number = 8): string => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase();
};
