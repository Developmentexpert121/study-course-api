// middleware/superAdminAuth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import conf from '../conf/auth.conf';
import User from '../models/user.model';
import Role from '../models/role.model';

export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(403).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, conf.secret) as any;

    // Fetch user with role details
    const user = await User.findByPk(decoded.id, {
      include: [{
        model: Role,
        as: 'roleDetails',
        attributes: ['id', 'name', 'permissions']
      }]
    });

    if (!user) {
      res.status(403).json({
        success: false,
        message: 'User not found.'
      });
      return;
    }

    // Check if user has Super-Admin role using role_id
    const superAdminRole = await Role.findOne({
      where: {
        id: user.role_id,
        name: 'Super-Admin'
      }
    });
    console.log(superAdminRole, "========`````````````````````````")
    if (!superAdminRole) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Super Admin privileges required.'
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.roleDetails?.name || user.role,
      role_id: user.role_id
    };

    next();
  } catch (err: any) {
    console.error('❌ Super Admin Auth Error:', err.message);

    if (err.name === 'JsonWebTokenError') {
      res.status(403).json({
        success: false,
        message: 'Invalid token.'
      });
      return;
    }

    if (err.name === 'TokenExpiredError') {
      res.status(403).json({
        success: false,
        message: 'Token expired.'
      });
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};