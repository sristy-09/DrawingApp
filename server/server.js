import express from "express";
import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import { connectDB } from "./config/db.js";
import user from "./routes/auth.js";
import board from "./routes/board.js";
import page from "./routes/page.js";
import "./config/passport.js";
import path from "path";

connectDB();

const PORT = process.env.PORT || 3000;
const app = express();

const __dirname = path.resolve();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increase limit for large canvas data
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/auth", user);
app.use("/board", board);
app.use("/board", page); // Page routes are nested under /board/:boardId/pages



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
