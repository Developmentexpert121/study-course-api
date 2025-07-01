// middleware/auth.ts
import jwt from 'jsonwebtoken';

import conf from '../conf/auth.conf'; 

export const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, conf.secret); 
    req.user = decoded;
    next();
  } catch (err: any) {
    console.error("JWT verification error:", err.message); 
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorizeAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};
