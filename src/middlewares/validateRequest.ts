import {NextFunction, Request, Response} from "express";
import {ZodType} from "zod";
import {respondFailed, RESPONSE_MESSAGES} from "../utils/response"; // ✅ this is NOT deprecated

export const validate =
    <T>(schema: ZodType<T, any, any>) =>
        (req: Request, res: Response, next: NextFunction) => {
            const result = schema.safeParse(req.body);
            if (!result.success) {
                return respondFailed(res, RESPONSE_MESSAGES.MISSING_OR_INVALID_PARAMETERS)
            }

            req.body = result.data;
            next();
        };
