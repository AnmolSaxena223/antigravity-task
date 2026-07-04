import { Router } from 'express';
import * as friendsController from '../controllers/friendsController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all friend routes
router.use(authenticateJWT as any);

router.post('/request', friendsController.sendFriendRequest as any);
router.post('/accept', friendsController.acceptFriendRequest as any);
router.post('/reject', friendsController.rejectFriendRequest as any);
router.post('/remove', friendsController.removeFriend as any);
router.post('/block', friendsController.blockUser as any);
router.post('/unblock', friendsController.unblockUser as any);
router.post('/cancel-request', friendsController.cancelFriendRequest as any);
router.get('/list', friendsController.getFriendsList as any);
router.get('/requests', friendsController.getPendingFriendRequests as any);
router.get('/search', friendsController.searchFriend as any);
router.get('/blocked', friendsController.getBlockedList as any);
router.get('/sent-requests', friendsController.getSentFriendRequests as any);

export default router;
