import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new Target().constructor); // restore prototype chain
  }
}

// Target helper for AppError prototype chain restoration
class Target {}

/**
 * Express Global Error Handling Middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error stack trace internally
  console.error(`[Error Handler] ${err.stack || err}`);

  res.status(statusCode).json({
    success: false,
    message,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined
  });
};
