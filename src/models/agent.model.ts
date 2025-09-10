import mongoose, {Document, Schema} from 'mongoose';
import {getPreferredTime} from "../utils/time";

export interface IAgent extends Document {
    agentName: string;
    agentID: string;
    adminID: string;
    maxDevices: number;
    totalDevices: number;
    themeID: string;
    forbiddenActions: object;
    variableData: object;
    status: "active" | "pending" | "error" | "suspended"; // -> Once the app gets suspended, it can never be live again
    createdBy: string;
    createdAt: string;
}

const userSchema = new Schema<IAgent>({
    agentName: {
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
    adminID: {
        type: String,
        required: true,
    },
    themeID: {
        type: String,
    },
    status: {
        type: String,
        enum: ["active", "suspended", "pending", "error"],
        default: "pending",
        required: true
    },
    forbiddenActions: {
        type: Schema.Types.Mixed,
        default: {}
    },
    variableData: {
        type: Schema.Types.Mixed,
        default: {}
    },
    maxDevices: {
        type: Number,
        default: 0, // -> 0 Means Unlimited
    },
    totalDevices: {
        type: Number,
        default: 0,
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

const Agent = mongoose.model<IAgent>('Agents', userSchema);

export default Agent;
