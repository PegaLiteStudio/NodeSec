import mongoose, {Document, Schema} from 'mongoose';
import {getPreferredTime} from "../utils/time";

export interface IInstalledAgent extends Document {
    agentName: string;
    agentID: string;
    deviceID: string;
    adminID: string;
    deviceName: string;
    apiLevel: string;
    isOnline: boolean;
    status: "active" | "suspended"; // -> Once the app gets suspended, it can never be live again
    simInfo: object;
    installedAt: string;
}

const userSchema = new Schema<IInstalledAgent>({
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
    deviceName: {
        type: String,
        required: true,
    },
    deviceID: {
        type: String,
        required: true,
    },
    apiLevel: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "suspended"],
        default: "active",
        required: true
    },
    simInfo: {
        type: Schema.Types.Mixed,
        required: false,
    },
    installedAt: {
        type: String,
        default: () => getPreferredTime(),
    },

});

const InstalledAgent = mongoose.model<IInstalledAgent>('InstalledAgents', userSchema);

export default InstalledAgent;
