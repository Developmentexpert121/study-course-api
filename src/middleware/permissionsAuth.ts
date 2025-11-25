import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import conf from '../conf/auth.conf';
import User from '../models/user.model';
import Role from '../models/role.model';

// Simple middleware to check permission
export const checkPermission = (permissionName: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // 1. Get token from header
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ success: false, message: 'No token provided' });
            }

            // 2. Verify token
            const decoded: any = jwt.verify(token, conf.secret);

            // 3. Find user with role permissions
            const user = await User.findByPk(decoded.id, {
                include: [{
                    model: Role,
                    as: 'roleDetails',
                    attributes: ['permissions']
                }]
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // 4. Check if user has the required permission
            const userPermissions = user.roleDetails?.permissions || {};

            // If user is Super-Admin, allow everything
            if (user.role === 'Super-Admin') {
                req.user = user;
                return next();
            }

            // Check if the specific permission exists and is true
            if (userPermissions[permissionName] === true) {
                req.user = user;
                next(); // User has permission, allow access
            } else {
                res.status(403).json({
                    success: false,
                    message: `Access denied. You need ${permissionName} permission.`
                });
            }

        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    };
};