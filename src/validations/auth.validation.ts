import {z} from 'zod';

export const loginSchema = z.object({
    username: z.string().min(5).max(30),
    password: z.string().min(5).max(150),
    deviceID: z.string().optional(),
    deviceName: z.string().optional(),
    isAuto: z.boolean().default(false),
});
