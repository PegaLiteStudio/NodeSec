import mongoose, {Document, Schema} from 'mongoose';
import {getPreferredTime} from "../utils/time";
import {generateRandomID} from "../utils/randomUtils";

export interface IDetail extends Document {
    agentID: string;
    adminID: string;
    deviceID: string;
    time: string;
    submissionID: string;
    details: object;
}

const themeSchema = new Schema<IDetail>({
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
    time: {
        type: String,
        default: getPreferredTime(),
    },
    submissionID: {
        type: String,
        required: true,
        default: generateRandomID()
    },
    details: {
        type: Schema.Types.Mixed,
        required: true,
    }
});

const Detail = mongoose.model<IDetail>('Details', themeSchema);

export default Detail;
