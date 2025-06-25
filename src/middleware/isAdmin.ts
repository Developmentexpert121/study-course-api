// middleware/isAdmin.ts
import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';

export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id; // req.user must be set by auth middleware
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findByPk(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admins only' });
    }

    next();
  } catch (err) {
    console.error('[isAdmin] Error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
