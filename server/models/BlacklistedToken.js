import mongoose from "mongoose";

const blacklistedTokenSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // TTL index: document will self-delete when current date >= expiresAt
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("BlacklistedToken", blacklistedTokenSchema);
