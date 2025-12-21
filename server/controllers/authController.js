import bcrypt from "bcryptjs";

// Register new User
import { User } from "../models/User.js";

export const registerUser = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validate required fields
    if (!email || !username || !password) {
      return res.status(400).json({
        message: "Email, username, and password are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if email already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        message: "This email is already registered!",
      });
    }

    // Check if username already exists
    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({
        message: "This username is already taken!",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      email,
      username,
      password: hashedPassword,
      role: "user",
    });

    // Save to DB
    await user.save();
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
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: error.message || "An error occurred during registration",
    });
  }
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
