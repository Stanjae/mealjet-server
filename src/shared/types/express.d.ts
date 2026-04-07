// src/shared/types/express.d.ts
import { IUserDocument } from '@modules/users/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}

export {};
