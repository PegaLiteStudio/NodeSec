import mongoose, {Document, Schema} from 'mongoose';
import {getPreferredTime} from "../utils/time";

export interface IAgent extends Document {
    name: string;
    agentID: string;
    maxDevices: number;
    status: "active" | "suspended"; // -> Once the app gets suspended, it can never be live again
    createdBy: string;
    createdAt: string;
}

const userSchema = new Schema<IAgent>({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
    },
    agentID: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
    },
    status: {
        type: String,
        enum: ["active", "suspended"],
        default: "active",
        required: true
    },
    maxDevices: {
        type: Number,
        default: 0, // -> 0 Means Unlimited
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

const User = mongoose.model<IAgent>('Agents', userSchema);

export default User;
