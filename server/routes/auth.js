import express from "express";
import { loginUser, registerUser } from "../controllers/authController.js";
import passport from "passport";
import jwt from "jsonwebtoken";
import { auth } from "../middleware/isAuthenticated.js";
const router = express.Router();

// Step-1: Redirect to Google Login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    try {
      const token = jwt.sign(
        {
          id: req.user._id,
          email: req.user.email,
          username: req.user.username,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );
      res.redirect(`${process.env.CLIENT_URL}/auth-success?token=${token}`);
    } catch (error) {
      console.error("Google login error:", error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=google_failed`);
    }
  }
);

router.get("/me", auth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// api/auth/register
router.post("/register", registerUser);
router.post("/login", loginUser);

export default router;
