import mongoose, {Document, Schema} from 'mongoose';

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
    status: "active" | "banned" | "suspended";
    createdAt: Date;
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
        type: Number,
        default: 0,
    },
    usedTokens: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ["active", "banned", "suspended"],
        default: "active",
        required: true
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
        type: Date,
        default: () => new Date(),
    },

});

const User = mongoose.model<IAdmin>('Admins', userSchema);

export default User;
