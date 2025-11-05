// // types/express/index.d.ts
// import type User from '../../src/models/user.model';
// import { File } from 'multer';

// declare global {
//   namespace Express {
//     interface Request {
//       user?: {
//         id: number;
//         email?: string;
//         role?: string;
//       };
//       file?: File;
//       files?: File[] | { [fieldname: string]: File[] };
//     }
//   }
// }



// types/express/index.d.ts
import { File } from 'multer';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;  // Changed from number to string
        email?: string;
        role?: string;
      };
      file?: File;
      files?: File[] | { [fieldname: string]: File[] };
    }
  }
}

export {};  // Make this a module