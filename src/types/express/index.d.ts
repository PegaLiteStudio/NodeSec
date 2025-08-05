// src/types/express/index.d.ts
import {JwtPayload} from '../../middlewares/auth.middleware';

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export {};
