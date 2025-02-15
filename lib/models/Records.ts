import 'server-only';
import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IRecords extends Document {
    ID: number;
    invoiceNumber: string;
    generatedDate: Date;
    partyCode: string;
    imageLinks: string[];
    isOtc: boolean;
    invoiceTimestamp: Date;
    invoiceUsername: mongoose.Types.ObjectId | IUser;
    medicalName: string;
    medicalCity: string;
    checkTimestamp: Date;
    checkUsername: mongoose.Types.ObjectId | IUser;
    checkStatus: 'checked' | 'not checked';
    packageTimestamp: Date;
    packageUser: mongoose.Types.ObjectId | IUser;
    packageStatus: 'packed' | 'not packed';
    deliveryStatus: 'delivered' | 'not delivered' | 'waiting';
    pickupUser: mongoose.Types.ObjectId | IUser;
    pickupTimestamp: Date;
    deliveredUser: mongoose.Types.ObjectId | IUser;
    deliveredTimestamp: Date;
    locationLink: string;
    status: 'checked' | 'not checked' | 'packed' | 'not packed' | 'delivered' | 'not delivered' | 'waiting';
}

const recordSchema = new Schema<IRecords>({
    ID: {
        type: Number,
        unique: true,
    },
    invoiceNumber: { type: String, unique: true },
    generatedDate: { type: Date },
    partyCode: { type: String },
    imageLinks: { type: [String] },
    isOtc: { type: Boolean },
    invoiceTimestamp: { type: Date },
    invoiceUsername: { type: Schema.Types.ObjectId, ref: 'User' },
    medicalName: { type: String },
    medicalCity: { type: String },
    checkTimestamp: { type: Date },
    checkUsername: { type: Schema.Types.ObjectId, ref: 'User' },
    checkStatus: { type: String, enum: ['checked', 'not checked'] },
    packageTimestamp: { type: Date },
    packageUser: { type: Schema.Types.ObjectId, ref: 'User' },
    packageStatus: { type: String, enum: ['packed', 'not packed'] },
    deliveryStatus: {
        type: String,
        enum: ['delivered', 'not delivered', 'waiting']
    },
    pickupUser: { type: Schema.Types.ObjectId, ref: 'User' },
    pickupTimestamp: { type: Date },
    deliveredUser: { type: Schema.Types.ObjectId, ref: 'User' },
    deliveredTimestamp: { type: Date },
    locationLink: { type: String }
});

export const Records = mongoose.model<IRecords>('Record', recordSchema);
