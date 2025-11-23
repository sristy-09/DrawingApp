import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String },
  avatar: { type: String },
  boards: [
    {
      type: Schema.Types.ObjectId,
      ref: "Board",
    },
  ],
  createdAt: { type: Date, default: Date.now },
  role: { type: String, default: "user" },
});

userSchema.methods.generateToken = function () {
  // Token generation logic (e.g., JWT) can be implemented here
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

export const User = mongoose.model("User", userSchema);
