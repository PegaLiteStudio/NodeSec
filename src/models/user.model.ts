import mongoose, {Document, Schema} from 'mongoose';
import {getPreferredTime} from "../utils/time";
import bcrypt from "bcryptjs";
import {ISuperAdmin} from "./superAdmin.model";

export interface IDeviceInfo {
    deviceName: string;
    lastLogin: string;
    status: "active" | "banned" | "suspended";
}

export interface IUser extends Document {
    name: string;
    username: string;
    password: string;
    maxDevices: number;
    devices: Map<string, IDeviceInfo>; // <--- key = deviceID
    status: "active" | "banned" | "suspended";
    expiry: string;
    isAgentAvailable: boolean;
    createdBy: string;
    createdAt: string;
}

const deviceSchema = new Schema<IDeviceInfo>(
    {
        deviceName: {type: String, required: true},
        lastLogin: {type: String, required: true},
        status: {
            type: String,
            enum: ["active", "banned", "suspended"],
            default: "active",
            required: true,
        },
    },
    {_id: false}
);

const userSchema = new Schema<IUser>({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
    },
    username: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        minlength: 4,
    },
    password: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "banned", "suspended"],
        default: "active",
        required: true
    },
    expiry: {
        type: String,
        required: true,
    },
    maxDevices: {
        type: Number,
        default: 1, // 1-10 limit & 0 for unlimited
    },
    devices: {
        type: Map,
        of: deviceSchema,
        default: {},
    },
    isAgentAvailable: {
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: String,
        required: true,
    },
    createdAt: {
        type: String,
        default: () => getPreferredTime(),
    },

});

userSchema.pre<ISuperAdmin>('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model<IUser>('Users', userSchema);

export default User;
