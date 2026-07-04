import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticateJWT, authorizeAdmin } from '../middleware/auth';

const router = Router();

// Apply auth middlewares to all admin routes
router.use(authenticateJWT as any);
router.use(authorizeAdmin as any);

// Dashboard routes
router.get('/stats', adminController.getDashboardStats as any);
router.get('/users', adminController.getUsers as any);
router.put('/user-status', adminController.updateUserStatus as any);
router.post('/adjust-balance', adminController.adjustUserBalance as any);

// Withdrawal approvals
router.get('/withdrawals', adminController.getWithdrawals as any);
router.post('/approve-withdrawal', adminController.approveWithdrawal as any);
router.post('/reject-withdrawal', adminController.rejectWithdrawal as any);

// Game audits
router.get('/games', adminController.getPlatformGames as any);

export default router;
