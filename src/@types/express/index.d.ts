// types/express/index.d.ts
import type User from '../../models/user.model';
import type { File } from 'multer';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email?: string;
        role?: string;
      };
      file?: File;
      files?: File[] | { [fieldname: string]: File[] };
    }
  }
}