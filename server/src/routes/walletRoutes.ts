import { Router } from 'express';
import * as walletController from '../controllers/walletController';
import * as paymentController from '../controllers/paymentController';
import { authenticateJWT } from '../middleware/auth';
import { validateDeposit, validateWithdraw } from '../middleware/validation';

const router = Router();

// Protected wallet endpoints
router.get('/data', authenticateJWT as any, walletController.getWalletData as any);
router.get('/config', authenticateJWT as any, walletController.getWalletConfig as any);
router.get('/history', authenticateJWT as any, walletController.getWalletHistory as any);
router.post('/deposit', authenticateJWT as any, validateDeposit, paymentController.createOrder as any);
router.post('/withdraw', authenticateJWT as any, validateWithdraw, walletController.withdrawMoney as any);

export default router;
