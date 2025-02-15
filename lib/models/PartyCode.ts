import 'server-only';
import mongoose, { Document, Schema } from 'mongoose';

export interface IPartyCode extends Document {
    CODE: string;
    'CUSTOMER NAME': string;
    City?: string;
    createdAt: Date;
    updatedAt: Date;
}

const partyCodeSchema = new Schema<IPartyCode>({
    "CODE": {
        type: String,
        required: true
    },
    "CUSTOMER NAME": {
        type: String,
        required: true
    },
    "City": {
        type: String,
    }
}, {
    timestamps: true
});

export const PartyCode = mongoose.model<IPartyCode>('PartyCode', partyCodeSchema);
