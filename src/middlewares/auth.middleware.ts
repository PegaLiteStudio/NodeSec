import {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {respondFailed, RESPONSE_MESSAGES} from "../utils/response";

export const protect = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) return respondFailed(res, RESPONSE_MESSAGES.SESSION_EXPIRED);

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || '');
        next();
    } catch (error) {
        return respondFailed(res, RESPONSE_MESSAGES.SESSION_EXPIRED);
    }
};
