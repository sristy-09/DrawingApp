import express from "express";
import { auth } from "../middleware/isAuthenticated.js";
import {
  getPages,
  getPageById,
  createPage,
  updatePage,
  updatePageCanvas,
  deletePage,
  duplicatePage,
  reorderPages,
} from "../controllers/pageController.js";

const router = express.Router();

// All routes require authentication
router.use(auth);

// Page management routes
router.get("/:boardId/pages", getPages);                      // List all pages
router.get("/:boardId/pages/:pageId", getPageById);           // Get single page
router.post("/:boardId/pages", createPage);                   // Create new page
router.patch("/:boardId/pages/:pageId", updatePage);          // Update page metadata
router.patch("/:boardId/pages/:pageId/canvas", updatePageCanvas); // Update canvas only (optimized)
router.delete("/:boardId/pages/:pageId", deletePage);         // Delete page
router.post("/:boardId/pages/:pageId/duplicate", duplicatePage); // Duplicate page
router.patch("/:boardId/pages/reorder", reorderPages);        // Reorder pages

export default router;
