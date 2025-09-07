import {z} from 'zod';

export const addAdminSchema = z.object({
    name: z.string().min(3).max(30),
    username: z.string().min(5).max(30),
    password: z.string().min(5).max(15),
    tokens: z.number().min(1),
    maxDevices: z.number().min(1),
    expiresAt: z.string().min(1),
    loginAsUser: z.boolean(),
});


export const addThemeSchema = z.object({
    name: z.string().min(3).max(30),
    themeID: z.string().min(1),
    isError: z.boolean().optional(),
    errorFilePath: z.string().optional(),
});

export const getAdminDetailsSchema = z.object({
    username: z.string().min(5).max(30),
});

export const saveChangesSchema = z.object({
    username: z.string().min(5).max(30),
    changes: z.object({
        name: z.string().optional(),
        tokens: z.number().optional(),
        password: z.string().optional(),
        status: z.enum(["active", "banned", "suspended"]).optional(),
        maxDevices: z.number().optional(),
        expiresAt: z.string().optional(),
        loginAsUser: z.boolean().optional()
    })
});

