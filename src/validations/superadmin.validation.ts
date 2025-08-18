import {z} from 'zod';

export const addAdminSchema = z.object({
    name: z.string().min(3).max(30),
    username: z.string().min(5).max(30),
    password: z.string().min(5).max(15),
    tokens: z.number().min(1),
    maxDevices: z.number().min(1),
    expiresAt: z.string().min(1),
});


export const getAdminDetailsSchema = z.object({
    username: z.string().min(5).max(30),
});

