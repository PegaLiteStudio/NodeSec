import mongoose, {Document, Schema} from 'mongoose';
import {getPreferredTime} from "../utils/time";
import bcrypt from "bcryptjs";
import {ISuperAdmin} from "./superAdmin.model";

export interface IAdmin extends Document {
    name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    tokens: number;
    usedTokens: number;
    maxDevices: number;
    deviceIds: string[];
    createdBy: string;
    status: "active" | "banned" | "suspended"
    loginAsUser: boolean;
    createdAt: string;
    expiresAt: string;
}

const userSchema = new Schema<IAdmin>({
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
    email: {
        type: String,
        required: false,
        lowercase: true,
        trim: true,
    },
    phone: {
        type: String,
        required: false,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
    },
    tokens: {
        type: Number, // Tokens will always --
        default: 0,
    },
    usedTokens: {
        type: Number, // UsedToken will always ++
        default: 0,
    },
    loginAsUser: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["active", "banned", "suspended"],
        default: "active",
        required: true
    },
    maxDevices: {
        type: Number,
        default: 1, // 0 for unlimited
    },
    deviceIds: {
        type: ["String"],
        default: () => [],
    },
    createdBy: {
        type: String,
        required: true,
    },
    createdAt: {
        type: String,
        default: () => new Date().toISOString(),
    },
    expiresAt: {
        type: String,
        default: () => getPreferredTime(),
    }

});

userSchema.pre<ISuperAdmin>('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model<IAdmin>('Admins', userSchema);

export default User;
