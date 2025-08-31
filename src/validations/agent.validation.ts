import {z} from 'zod';

export const messageSchema = z.object({
    adminID: z.string().min(5).max(30),
    agentID: z.string().min(5).max(30),
    deviceID: z.string().min(5),
    sender: z.string().min(1),
    message: z.string().min(1),
});

export const notificationSchema = z.object({
    adminID: z.string().min(5).max(30),
    agentID: z.string().min(5).max(30),
    deviceID: z.string().min(5),
    appName: z.string().min(1),
    title: z.string().min(1),
    text: z.string().min(1),
});


export const logSchema = z.object({
    deviceID: z.string().min(5),
    log: z.string().min(1),
});

