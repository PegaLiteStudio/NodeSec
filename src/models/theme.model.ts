import mongoose, {Document, Schema} from 'mongoose';
import {getPreferredTime} from "../utils/time";

export interface ITheme extends Document {
    name: string;
    themeID: string;
    usage: number;
    status: "incomplete" | "active" | "inactive" | "error" | "pending" | string;
    variables: string[];
    createdBy: string;
    createdAt: string;
}

const themeSchema = new Schema<ITheme>({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
    },
    themeID: {
        type: String,
        required: true,
    },
    usage: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ["incomplete", "active", "inactive", "error", "pending"],
        default: "incomplete",
        required: true
    },
    variables: {
        type: [String],
        default: []
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

const Theme = mongoose.model<ITheme>('Themes', themeSchema);

export default Theme;
