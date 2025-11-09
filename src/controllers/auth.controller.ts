import {Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import SuperAdmin, {ISuperAdmin} from '../models/superAdmin.model';
import Admin, {IAdmin} from '../models/admin.model';
import User, {IUser} from '../models/user.model';
import {respondFailed, respondSuccessWithData, RESPONSE_MESSAGES} from "../utils/response";
import {getPreferredTime} from "../utils/time";

const JWT_SECRET = process.env.JWT_SECRET || 'U(z5HI&%pFnwMM%!v';

/**
 * Generate JWT token with user information
 * @param username - User's username
 * @param deviceID - User's Device ID
 * @param role - User's role
 * @returns JWT token string
 */
const generateToken = (username: string, deviceID: string = "", role: string) => {
    return jwt.sign({username, deviceID, role}, JWT_SECRET, {expiresIn: '40d'});
};

// SuperAdmin Login
export const superAdminLogin = async (req: Request, res: Response) => {
    const {username, password} = req.body;

    // let doc = new SuperAdmin({name: "Admin", username, password});
    // await doc.save();

    const superAdmin: ISuperAdmin | null = await SuperAdmin.findOne({username});
    if (!superAdmin) return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);

    const isMatch = await bcrypt.compare(password, superAdmin.password);
    if (!isMatch) return respondFailed(res, RESPONSE_MESSAGES.INVALID_PASSWORD);

    if (superAdmin.status !== "active") {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_BANNED);
    }

    const token = generateToken(superAdmin.username, "", 'super-admin');
    respondSuccessWithData(res, {token})
};

// SuperAdmin Session Login
export const superAdminSessionLogin = async (req: Request, res: Response) => {
    const {username} = req.user;
    const doc: IAdmin | null = await SuperAdmin.findOne({username});

    if (!doc) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);
    }

    if (doc.status !== "active") {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_BANNED)
    }
    respondSuccessWithData(res, {username})
};

// Admin Login
export const adminLogin = async (req: Request, res: Response) => {
    const {username, password, deviceID, isAuto = false} = req.body;

    const admin: IAdmin | null = await Admin.findOne({username}).lean();
    if (!admin) return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);

    const isMatch = isAuto ? password == admin.password : await bcrypt.compare(password, admin.password);
    if (!isMatch) return respondFailed(res, RESPONSE_MESSAGES.INVALID_PASSWORD);

    if (admin.status !== "active") {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_BANNED);
    }

    if (!admin.deviceIds.includes(deviceID)) {
        if (admin.deviceIds.length >= admin.maxDevices) {
            return respondFailed(res, RESPONSE_MESSAGES.MAX_DEVICES_ALREADY_REGISTERED);
        }
    }

    const token = generateToken(admin.username, "", 'admin');
    respondSuccessWithData(res, {token})
};


// SuperAdmin Session Login
export const adminSessionLogin = async (req: Request, res: Response) => {
    const {username} = req.user;
    const doc: IAdmin | null = await Admin.findOne({username});

    if (!doc) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);
    }

    if (doc.status !== "active") {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_BANNED)
    }

    respondSuccessWithData(res, {username, expiry: doc.expiresAt, tokens: doc.tokens});

};

// User Login
export const userLogin = async (req: Request, res: Response) => {
    const {username, password, deviceID, deviceName, isAuto = false} = req.body;
    const user: IUser | null = await User.findOne({username});
    if (!user) return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);

    const isMatch = isAuto ? password === user.password : await bcrypt.compare(password, user.password);
    if (!isMatch) return respondFailed(res, RESPONSE_MESSAGES.INVALID_PASSWORD);

    if (user.status !== "active") {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_BANNED);
    }

    const device = user.devices.get(deviceID);

    if (!device) {
        // New device login
        if (user.maxDevices !== 0 && user.devices.size >= user.maxDevices) {
            return respondFailed(res, RESPONSE_MESSAGES.MAX_DEVICES_ALREADY_REGISTERED);
        }

        user.devices.set(deviceID, {
            deviceName,
            lastLogin: new Date().toISOString(),
            status: "active",
        });
    } else {
        // Existing device login
        if (device.status !== "active") {
            return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_BANNED);
        }

        device.lastLogin = getPreferredTime();
    }

    await user.save();

    const token = generateToken(user.username, deviceID, "user");

    respondSuccessWithData(res, {
        token,
        expiry: user.expiry,
        maxDevices: user.maxDevices,
        totalDevices: user.devices.size,
    });
};


// User Session Login
export const userSessionLogin = async (req: Request, res: Response) => {
    const {username, deviceID} = req.user;
    const doc: IUser | null = await User.findOne({username});

    if (!doc) {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_NOT_EXISTS);
    }

    if (doc.status !== "active") {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_BANNED)
    }

    // Verify device registration
    const device = doc.devices.get(deviceID);
    if (!device) {
        return respondFailed(res, RESPONSE_MESSAGES.SESSION_EXPIRED);
    }

    // Check if the device itself is banned/suspended
    if (device.status !== "active") {
        return respondFailed(res, RESPONSE_MESSAGES.ACCOUNT_BANNED);
    }

    // Update last login time
    device.lastLogin = getPreferredTime();
    await doc.save();

    respondSuccessWithData(res, {username, expiry: doc.expiry});

};
