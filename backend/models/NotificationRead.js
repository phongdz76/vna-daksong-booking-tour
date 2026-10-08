import mongoose from "mongoose";

const notificationReadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  notificationId: { type: String, required: true, maxlength: 100 },
  readAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

notificationReadSchema.index({ userId: 1, notificationId: 1 }, { unique: true });
export default mongoose.model("NotificationRead", notificationReadSchema);
