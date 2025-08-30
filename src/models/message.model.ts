import mongoose, {Document, Schema} from 'mongoose';
import {getPreferredTime} from "../utils/time";

export interface IMessage extends Document {
    agentID: string;
    adminID: string;
    deviceID: string;
    message: string;
    sender: string;
    time: string;
}

const userSchema = new Schema<IMessage>({
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
    message: {
        type: String,
    },
    sender: {
        type: String,
    },
    time: {
        type: String,
        default: getPreferredTime()
    }
});

const Message = mongoose.model<IMessage>('Messages', userSchema);

export default Message;
