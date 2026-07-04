import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticateJWT } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { validateRegister, validateLogin, validateVerifyOtp } from '../middleware/validation';

const router = Router();

// Rate limited auth endpoints
router.post('/register', authLimiter, validateRegister, authController.register);
router.post('/send-otp', authLimiter, validateLogin, authController.sendOtp);
router.post('/verify-otp', authLimiter, validateVerifyOtp, authController.verifyOtp);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected profile endpoints
router.get('/profile', authenticateJWT as any, authController.getProfile as any);
router.put('/profile', authenticateJWT as any, authController.updateProfile as any);
router.post('/logout', authenticateJWT as any, authController.logout as any);

export default router;
