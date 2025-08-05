import {Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import SuperAdmin, {ISuperAdmin} from '../models/superAdmin.model';
import Admin, {IAdmin} from '../models/admin.model';
import User, {IUser} from '../models/user.model';
import {respondFailed, respondSuccessWithData, RESPONSE_MESSAGES} from "../utils/response";

const JWT_SECRET = process.env.JWT_SECRET || '';

/**
 * Generate JWT token with user information
 * @param username - User's username
 * @param role - User's role
 * @returns JWT token string
 */
const generateToken = (username: string, role: string) => {
    return jwt.sign({username, role}, JWT_SECRET, {expiresIn: '40d'});
};

// SuperAdmin Login
export const superAdminLogin = async (req: Request, res: Response) => {
    const {username, password} = req.body;

    const superAdmin: ISuperAdmin | null = await SuperAdmin.findOne({username});
    if (!superAdmin) return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);

    const isMatch = await bcrypt.compare(password, superAdmin.password);
    if (!isMatch) return respondFailed(res, RESPONSE_MESSAGES.INVALID_PASSWORD);

    const token = generateToken(superAdmin.username, 'super-admin');
    respondSuccessWithData(res, {token})
};

// Admin Login
export const adminLogin = async (req: Request, res: Response) => {
    const {username, password, deviceID} = req.body;

    const admin: IAdmin | null = await Admin.findOne({username}).lean();
    if (!admin) return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return respondFailed(res, RESPONSE_MESSAGES.INVALID_PASSWORD);

    if (!admin.deviceIds.includes(deviceID)) {
        if (admin.deviceIds.length >= admin.maxDevices) {
            return respondFailed(res, RESPONSE_MESSAGES.MAX_DEVICES_ALREADY_REGISTERED);
        }
    }

    const token = generateToken(admin.username, 'admin');
    respondSuccessWithData(res, {token})
};


// User Login
export const userLogin = async (req: Request, res: Response) => {
    const {email, password} = req.body;

    const user: IUser | null = await User.findOne({email});
    if (!user) return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return respondFailed(res, RESPONSE_MESSAGES.INVALID_PASSWORD);

    const token = generateToken(user.username, 'user');
    respondSuccessWithData(res, {token})
};
