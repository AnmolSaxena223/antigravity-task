import { Request, Response, NextFunction } from 'express';

const clean = (val: any): any => {
  if (typeof val === 'string') {
    // Strip HTML and script tags to prevent XSS attacks while keeping standard text intact
    return val
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<[^>]*>/g, '');
  }
  if (Array.isArray(val)) {
    return val.map(clean);
  }
  if (typeof val === 'object' && val !== null) {
    const cleanedObj: any = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        cleanedObj[key] = clean(val[key]);
      }
    }
    return cleanedObj;
  }
  return val;
};

export const xssSanitizer = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = clean(req.body);
  }
  if (req.query) {
    req.query = clean(req.query);
  }
  if (req.params) {
    req.params = clean(req.params);
  }
  next();
};
