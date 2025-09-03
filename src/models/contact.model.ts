import mongoose, {Document, Schema} from 'mongoose';

export interface IContact extends Document {
    agentID: string;
    adminID: string;
    deviceID: string;
    name: string;
    phone: string;
}

const userSchema = new Schema<IContact>({
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
    name: {
        type: String,
    },
    phone: {
        type: String,
    },
});

const Contact = mongoose.model<IContact>('Contacts', userSchema);

export default Contact;
