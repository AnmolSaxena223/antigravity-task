import { Request, Response, NextFunction } from 'express';

export const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const { phone, name, email, password } = req.body;
  if (!phone || !/^\d{10,12}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Invalid phone number (must be 10-12 digits).' });
  }
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Name must be at least 2 characters long.' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address format.' });
  }
  if (password && password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }
  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { phone } = req.body;
  if (!phone || !/^\d{10,12}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Invalid phone number.' });
  }
  next();
};

export const validateVerifyOtp = (req: Request, res: Response, next: NextFunction) => {
  const { phone, otp } = req.body;
  if (!phone || !otp || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ success: false, message: 'OTP must be a 6-digit number.' });
  }
  next();
};

export const validateDeposit = (req: Request, res: Response, next: NextFunction) => {
  const { amount } = req.body;
  if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
  }
  next();
};

export const validateWithdraw = (req: Request, res: Response, next: NextFunction) => {
  const { amount } = req.body;
  if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
  }
  next();
};
