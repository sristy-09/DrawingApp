import express from "express";
import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import { connectDB } from "./config/db.js";
import user from "./routes/auth.js";
import board from "./routes/board.js";
import "./config/passport.js";

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", user);
app.use("/board", board);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
