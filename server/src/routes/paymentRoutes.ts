import { Router } from 'express';
import * as paymentController from '../controllers/paymentController';
import { authenticateJWT } from '../middleware/auth';
import { validateDeposit } from '../middleware/validation';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate-limited & protected payment endpoints
router.post('/create-order', authenticateJWT as any, apiLimiter, validateDeposit, paymentController.createOrder as any);
router.post('/verify', authenticateJWT as any, apiLimiter, paymentController.verifyPayment as any);

// Public webhook route (not protected by JWT, but signature validated securely)
router.post('/webhook', paymentController.verifyPaymentWebhook as any);

export default router;
