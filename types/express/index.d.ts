// types/express/index.d.ts
import type User from '../../src/models/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email?: string;
        role?: string;
      };
    }
  }
}
