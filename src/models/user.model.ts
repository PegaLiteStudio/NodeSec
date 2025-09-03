import mongoose, {Document, Schema} from 'mongoose';
import {getPreferredTime} from "../utils/time";
import bcrypt from "bcryptjs";
import {ISuperAdmin} from "./superAdmin.model";

export interface IUser extends Document {
    name: string;
    username: string;
    password: string;
    maxDevices: number;
    deviceIds: string[];
    status: "active" | "banned" | "suspended";
    expiry: string;
    createdBy: string;
    createdAt: string;
}

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
        default: 1,
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
