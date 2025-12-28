import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import { z } from "zod";

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

// Login Schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required") // 🔥 CRITICAL
    .email("Invalid email address"),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" }),
});

// Register Schema
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long" }),
  email: z.string().email({ message: "Please provide a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" }),
});

userSchema.methods.generateToken = function () {
  // Token generation logic (e.g., JWT) can be implemented here
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

export const User = mongoose.model("User", userSchema);
