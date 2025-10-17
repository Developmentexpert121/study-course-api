// middleware/superAdminAuth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import conf from '../conf/auth.conf';


export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // console.log('🔐 Super Admin Auth - Headers:', req.headers);
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('❌ No authorization header');
      res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('❌ No token in authorization header');
      res.status(401).json({ 
        success: false,
        message: 'Access denied. Invalid token format.' 
      });
      return;
    }

    // console.log('🔑 Token received:', token.substring(0, 20) + '...');

    // Verify JWT token
    const decoded = jwt.verify(token, conf.secret) as any;
    // console.log('📋 Decoded token:', decoded);

    // Check if user has super_admin role
    if (!decoded || decoded.role !== 'Super-Admin') {
      console.log('❌ User role is not super_admin. Role:', decoded?.role);
      res.status(403).json({ 
        success: false,
        message: 'Access denied. Super Admin privileges required.' 
      });
      return;
    }

    // Attach user to request
    req.user = { 
      id: decoded.id, 
      email: decoded.email, 
      role: decoded.role
    };
    
    // console.log('✅ Super Admin authenticated successfully:', {
    //   id: req.user.id,
    //   email: req.user.email,
    //   role: req.user.role
    // });
    
    next();
  } catch (err: any) {
    console.error('❌ Super Admin Auth Error:', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ 
        success: false,
        message: 'Invalid token.' 
      });
      return;
    }
    
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ 
        success: false,
        message: 'Token expired.' 
      });
      return;
    }

    res.status(401).json({ 
      success: false,
      message: 'Authentication failed.' 
    });
  }
};