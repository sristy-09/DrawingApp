import express from "express";
import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import { connectDB } from "./config/db.js";
import user from "./routes/auth.js";
import board from "./routes/board.js";
import "./config/passport.js";
import path from "path";

connectDB();

const PORT = process.env.PORT || 3000;
const app = express();

const __dirname = path.resolve();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/auth", user);
app.use("/board", board);

// Serve frontend build
app.use(express.static(path.join(__dirname, "/client/dist")));

// React router fallback (ALWAYS LAST)
app.get(/.*/, (_, res) => {
  res.sendFile(path.resolve(__dirname, "client", "dist", "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
