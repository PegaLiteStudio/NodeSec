// src/middleware/role.middleware.ts
import {NextFunction, Request, Response} from 'express';

export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({message: 'Forbidden: insufficient role'});
        }
        next();
    };
};
