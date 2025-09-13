import {z} from 'zod';

export const loginSchema = z.object({
    username: z.string().min(5).max(30),
    password: z.string().min(5).max(150),
    isAuto: z.boolean().default(false),
});
