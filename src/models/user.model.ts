import mongoose, {Document, Schema} from 'mongoose';

export interface IUser extends Document {
    name: string;
    username: string;
    password: string;
    maxDevices: number;
    deviceIds: string[];
    status: "active" | "banned" | "suspended";
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
        default: () => new Date().toISOString(),
    },

});

const User = mongoose.model<IUser>('Users', userSchema);

export default User;
