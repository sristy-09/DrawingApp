import { Board } from "../models/Board.js";
import { Page } from "../models/Page.js";
import mongoose from "mongoose";

// Helper: Check if user has access to board
const checkBoardAccess = async (boardId, userId, requireEditor = false) => {
  const board = await Board.findById(boardId);
  
  if (!board) {
    return { hasAccess: false, error: "Board not found", status: 404 };
  }

  const isOwner = board.owner.equals(userId);
  const collaborator = board.collaborators.find((c) => c.user.equals(userId));
  const isEditor = collaborator?.role === "editor";

  if (!isOwner && !collaborator) {
    return { hasAccess: false, error: "Access denied", status: 403 };
  }

  if (requireEditor && !isOwner && !isEditor) {
    return { hasAccess: false, error: "Editor permission required", status: 403 };
  }

  return { hasAccess: true, board, isOwner, isEditor: isOwner || isEditor };
};

// GET /api/board/:boardId/pages - Get all pages for a board
export const getPages = async (req, res) => {
  try {
    const { boardId } = req.params;

    const accessCheck = await checkBoardAccess(boardId, req.user.id);
    if (!accessCheck.hasAccess) {
      return res.status(accessCheck.status).json({ message: accessCheck.error });
    }

    const pages = await Page.find({ board: boardId })
      .sort({ order: 1 })
      .select("-canvasData"); // Exclude large canvasData for list view

    res.json(pages);
  } catch (error) {
    console.error("Get pages error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/board/:boardId/pages/:pageId - Get single page with full data
export const getPageById = async (req, res) => {
  try {
    const { boardId, pageId } = req.params;

    const accessCheck = await checkBoardAccess(boardId, req.user.id);
    if (!accessCheck.hasAccess) {
      return res.status(accessCheck.status).json({ message: accessCheck.error });
    }

    const page = await Page.findOne({ _id: pageId, board: boardId });

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    res.json(page);
  } catch (error) {
    console.error("Get page error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/board/:boardId/pages - Create new page
export const createPage = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name, canvasData, thumbnail, order } = req.body;

    const accessCheck = await checkBoardAccess(boardId, req.user.id, true);
    if (!accessCheck.hasAccess) {
      return res.status(accessCheck.status).json({ message: accessCheck.error });
    }

    const board = accessCheck.board;

    // Create new page
    const newPage = new Page({
      board: boardId,
      name: name || `Page ${board.pages.length + 1}`,
      canvasData: canvasData || "{}",
      thumbnail: thumbnail || "",
      order: order !== undefined ? order : board.pages.length,
    });

    await newPage.save();

    // Add page reference to board
    board.pages.push(newPage._id);
    
    // Set as current page if it's the first page
    if (board.pages.length === 1) {
      board.currentPageId = newPage._id;
    }
    
    await board.save();

    res.status(201).json(newPage);
  } catch (error) {
    console.error("Create page error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PATCH /api/board/:boardId/pages/:pageId - Update page
export const updatePage = async (req, res) => {
  try {
    const { boardId, pageId } = req.params;
    const { name, canvasData, thumbnail, order } = req.body;

    const accessCheck = await checkBoardAccess(boardId, req.user.id, true);
    if (!accessCheck.hasAccess) {
      return res.status(accessCheck.status).json({ message: accessCheck.error });
    }

    const page = await Page.findOne({ _id: pageId, board: boardId });

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // Update only provided fields
    if (name !== undefined) page.name = name;
    if (canvasData !== undefined) page.canvasData = canvasData;
    if (thumbnail !== undefined) page.thumbnail = thumbnail;
    if (order !== undefined) page.order = order;

    await page.save();

    res.json({ message: "Page updated successfully", page });
  } catch (error) {
    console.error("Update page error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PATCH /api/board/:boardId/pages/:pageId/canvas - Update only canvas data (optimized)
export const updatePageCanvas = async (req, res) => {
  try {
    const { boardId, pageId } = req.params;
    const { canvasData, thumbnail } = req.body;

    if (!canvasData) {
      return res.status(400).json({ message: "canvasData is required" });
    }

    const accessCheck = await checkBoardAccess(boardId, req.user.id, true);
    if (!accessCheck.hasAccess) {
      return res.status(accessCheck.status).json({ message: accessCheck.error });
    }

    // Use findOneAndUpdate for atomic operation
    const page = await Page.findOneAndUpdate(
      { _id: pageId, board: boardId },
      { 
        canvasData,
        ...(thumbnail && { thumbnail }),
        updatedAt: Date.now()
      },
      { new: true, select: "_id name updatedAt" } // Return minimal data
    );

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    res.json({ message: "Canvas saved successfully", page });
  } catch (error) {
    console.error("Update canvas error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// DELETE /api/board/:boardId/pages/:pageId - Delete page
export const deletePage = async (req, res) => {
  try {
    const { boardId, pageId } = req.params;

    const accessCheck = await checkBoardAccess(boardId, req.user.id, true);
    if (!accessCheck.hasAccess) {
      return res.status(accessCheck.status).json({ message: accessCheck.error });
    }

    const board = accessCheck.board;

    // Prevent deleting the last page
    if (board.pages.length <= 1) {
      return res.status(400).json({ message: "Cannot delete the last page" });
    }

    const page = await Page.findOne({ _id: pageId, board: boardId });

    if (!page) {
      return res.status(404).json({ message: "Page not found" });
    }

    // Remove page reference from board
    board.pages = board.pages.filter((p) => !p.equals(pageId));

    // If deleting current page, switch to first page
    if (board.currentPageId && board.currentPageId.equals(pageId)) {
      board.currentPageId = board.pages[0];
    }

    await board.save();

    // Delete the page
    await Page.findByIdAndDelete(pageId);

    res.json({ 
      message: "Page deleted successfully",
      newCurrentPageId: board.currentPageId 
    });
  } catch (error) {
    console.error("Delete page error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/board/:boardId/pages/:pageId/duplicate - Duplicate page
export const duplicatePage = async (req, res) => {
  try {
    const { boardId, pageId } = req.params;

    const accessCheck = await checkBoardAccess(boardId, req.user.id, true);
    if (!accessCheck.hasAccess) {
      return res.status(accessCheck.status).json({ message: accessCheck.error });
    }

    const board = accessCheck.board;
    const originalPage = await Page.findOne({ _id: pageId, board: boardId });

    if (!originalPage) {
      return res.status(404).json({ message: "Page not found" });
    }

    // Create duplicate
    const duplicatePage = new Page({
      board: boardId,
      name: `${originalPage.name} (Copy)`,
      canvasData: originalPage.canvasData,
      thumbnail: originalPage.thumbnail,
      order: originalPage.order + 1,
    });

    await duplicatePage.save();

    // Add to board
    const insertIndex = board.pages.findIndex((p) => p.equals(pageId)) + 1;
    board.pages.splice(insertIndex, 0, duplicatePage._id);
    await board.save();

    res.status(201).json(duplicatePage);
  } catch (error) {
    console.error("Duplicate page error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PATCH /api/board/:boardId/pages/reorder - Reorder pages
export const reorderPages = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { pageIds } = req.body; // Array of page IDs in new order

    if (!Array.isArray(pageIds)) {
      return res.status(400).json({ message: "pageIds must be an array" });
    }

    const accessCheck = await checkBoardAccess(boardId, req.user.id, true);
    if (!accessCheck.hasAccess) {
      return res.status(accessCheck.status).json({ message: accessCheck.error });
    }

    const board = accessCheck.board;

    // Validate all page IDs belong to this board
    const validPageIds = pageIds.filter((id) =>
      board.pages.some((p) => p.equals(id))
    );

    if (validPageIds.length !== board.pages.length) {
      return res.status(400).json({ message: "Invalid page IDs provided" });
    }

    // Update board pages order
    board.pages = validPageIds;
    await board.save();

    // Update order field in each page document
    const updatePromises = validPageIds.map((pageId, index) =>
      Page.findByIdAndUpdate(pageId, { order: index })
    );

    await Promise.all(updatePromises);

    res.json({ message: "Pages reordered successfully" });
  } catch (error) {
    console.error("Reorder pages error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
