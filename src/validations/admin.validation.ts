import {z} from 'zod';

export const addAgentAdminSchema = z.object({
    name: z.string().min(3).max(30),
    username: z.string().min(5).max(30),
    password: z.string().min(5).max(15),
    expiry: z.string().min(1),
});

export const saveChangesSchema = z.object({
    username: z.string().min(5).max(30),
    changes: z.object({
        name: z.string().optional(),
        password: z.string().optional(),
        status: z.enum(["active", "banned", "suspended"]).optional(),
        expiry: z.string().optional(),
    })
});
