import { Response, NextFunction, Request } from 'express';
import { verifyAccessToken } from '../utils/security';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

/**
 * Middleware to authenticate requests via JWT access token.
 */
export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid or expired access token.' });
  }

  req.user = {
    userId: decoded.userId,
    role: decoded.role,
  };

  next();
};

/**
 * Middleware to restrict access to admin users only.
 */
export const authorizeAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(430).json({ success: false, message: 'Forbidden. Access restricted to administrators only.' });
  }
  next();
};
