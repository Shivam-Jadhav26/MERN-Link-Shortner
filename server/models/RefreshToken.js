import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  userAgent: String,
  ipAddress: String,
  replacedBy: String, // Store hash of the new token for grace window
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  },
}, { timestamps: true });

export default mongoose.model("RefreshToken", refreshTokenSchema);