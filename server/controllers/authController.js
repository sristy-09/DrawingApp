import bcrypt from "bcryptjs";

// Register new User
import { User } from "../models/User.js";

export const registerUser = async (req, res) => {
  // Check if user exists
  let user = await User.findOne({ email: req.body.email });

  if (user) {
    return res
      .status(400)
      .json({ message: "This user is already registered!" });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  req.body.password = await bcrypt.hash(req.body.password, salt);

  // Create user
  user = await User({
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
    role: req.body.role || "user",
  });

  // Save to DB
  const registeredUser = await user.save();
  const token = user.generateToken();

  res.status(201).json({
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
    },
    message: "Registration successful",
  });
};

// Login User
export const loginUser = async (req, res) => {
  let user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(400).json({ message: "Invalid Email or Password" });
  }

  // Check password
  const isPasswordMatch = await bcrypt.compare(
    req.body.password,
    user.password
  );

  if (!isPasswordMatch) {
    return res.status(400).json({ message: "Invalid Email or Password" });
  }

  // Generate token
  const token = user.generateToken();

  res.status(200).json({
    token,
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
    },
    message: "Login successful",
  });
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json({
      user,
      message: "Profile fetched successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not fetch profile",
    });
  }
};
