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

// types/express/index.d.ts
import { File } from 'multer';
import type User from '../../src/models/user.model';

export declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
      };
    }
    
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}
