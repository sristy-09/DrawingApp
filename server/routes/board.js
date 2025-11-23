import express from "express";
import { auth } from "../middleware/isAuthenticated.js";
import {
  createBoard,
  getBoardById,
  getMyBoards,
  updateBoard,
} from "../controllers/boardController.js";
const router = express.Router();

router.post("/", auth, createBoard);
router.get("/", auth, getMyBoards);
router.get("/:id", auth, getBoardById);
router.patch("/:id", auth, updateBoard);

export default router;
