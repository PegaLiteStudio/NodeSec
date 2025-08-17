import mongoose, {Document, Schema} from 'mongoose';
import bcrypt from "bcryptjs";
import {getPreferredTime} from "../utils/time";

export interface ISuperAdmin extends Document {
    name: string;
    username: string;
    password: string;
    status: "active" | "banned" | "suspended";
    createdAt: string;
}

const userSchema = new Schema<ISuperAdmin>({
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

const User = mongoose.model<ISuperAdmin>('SuperAdmins', userSchema);

export default User;
