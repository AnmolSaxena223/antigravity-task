import { Router } from 'express';
import * as roomController from '../controllers/roomController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all room routes
router.use(authenticateJWT as any);

router.post('/create', roomController.createRoom as any);
router.post('/invite', roomController.inviteFriend as any);
router.post('/join', roomController.joinRoom as any);
router.post('/leave', roomController.leaveRoom as any);
router.post('/kick', roomController.kickPlayer as any);
router.post('/transfer-host', roomController.transferHost as any);
router.post('/toggle-ready', roomController.toggleReady as any);
router.post('/start-match', roomController.startMatch as any);
router.get('/details/:roomId', roomController.getRoomDetails as any);
router.post('/decline-invite', roomController.declineInvite as any);

export default router;
