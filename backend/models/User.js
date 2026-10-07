import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  zaloId: { type: String, unique: true, sparse: true, immutable: true },
  email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  password: { type: String, select: false },
  avatar: { type: String, maxlength: 2000, default: "" },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  active: { type: Boolean, default: true },
}, { timestamps: true, optimisticConcurrency: true });

userSchema.set("toJSON", { transform(_doc, ret) { delete ret.password; return ret; } });
const User = mongoose.model("User", userSchema);

export default User;
