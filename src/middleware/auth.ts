// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import conf from '../conf/auth.conf';
import User from '../models/user.model';
import Role from '../models/role.model';
import { Op } from 'sequelize';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        role_id: number;
        permissions?: string[];
      };
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const decoded = jwt.verify(token, conf.secret) as any;

    // Fetch user with role details from database
    const user = await User.findByPk(decoded.id, {
      include: [{
        model: Role,
        as: 'roleDetails',
        attributes: ['id', 'name', 'permissions']
      }]
    });

    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    // Extract permissions from role
    let userPermissions: string[] = [];
    if (user.roleDetails?.permissions) {
      userPermissions = Object.keys(user.roleDetails.permissions).filter(
        (key: string) => user.roleDetails!.permissions[key] === true
      );
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.roleDetails?.name || user.role,
      role_id: user.role_id,
      permissions: userPermissions
    };

    next();
  } catch (err: any) {
    console.error("JWT verification error:", err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorizeAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.role_id) {
      res.status(403).json({ message: 'Access denied. Admins only.' });
      return;
    }

    // Check if user has admin role by role_id
    const adminRole = await Role.findOne({
      where: {
        id: req.user.role_id,
        name: { [Op.in]: ['admin', 'Super-Admin'] }
      }
    });

    if (!adminRole) {
      res.status(403).json({ message: 'Access denied. Admins only.' });
      return;
    }

    next();
  } catch (error: any) {
    console.error("Admin authorization error:", error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Role-based authorization using role_id
export const authorize = (allowedRoleNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.role_id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      // Get user's role from database using role_id
      const userRole = await Role.findByPk(req.user.role_id);

      if (!userRole || !allowedRoleNames.includes(userRole.name)) {
        res.status(403).json({
          message: `Access denied. Required roles: ${allowedRoleNames.join(', ')}`
        });
        return;
      }

      next();
    } catch (error: any) {
      console.error("Role authorization error:", error.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};