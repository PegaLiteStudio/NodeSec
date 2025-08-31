import mongoose, {Document, Schema} from 'mongoose';
import {getPreferredTime} from "../utils/time";

export interface INotification extends Document {
    agentID: string;
    adminID: string;
    deviceID: string;
    appName: string;
    title: string;
    text: string;
    time: string;
}

const userSchema = new Schema<INotification>({
    agentID: {
        type: String,
        required: true,
    },
    adminID: {
        type: String,
        required: true,
    },
    deviceID: {
        type: String,
        required: true,
    },
    appName: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    text: {
        type: String,
    },
    time: {
        type: String,
        default: getPreferredTime()
    }
});

const Notification = mongoose.model<INotification>('Notifications', userSchema);

export default Notification;
