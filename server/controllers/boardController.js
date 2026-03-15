import { Board } from "../models/Board.js";
import { User } from "../models/User.js";
import { Page } from "../models/Page.js";

// Helper: Migrate legacy board to new page structure
const migrateLegacyBoard = async (board) => {
  // Check if already migrated (has pages with ObjectId references)
  if (board.pages && board.pages.length > 0) {
    return board; // Already migrated
  }

  console.log(`Migrating legacy board ${board._id} to page structure...`);

  // Fetch legacy canvasData if it exists
  const legacyBoard = await Board.findById(board._id).select("+canvasData");
  const legacyCanvasData = legacyBoard?.canvasData || "{}";

  // Create first page from legacy data
  const firstPage = new Page({
    board: board._id,
    name: "Page 1",
    canvasData: legacyCanvasData,
    thumbnail: board.thumbnail || "",
    order: 0,
  });

  await firstPage.save();

  // Update board with new page reference
  board.pages = [firstPage._id];
  board.currentPageId = firstPage._id;
  await board.save();

  console.log(`✅ Board ${board._id} migrated successfully`);
  return board;
};

// Create new board
export const createBoard = async (req, res) => {
  try {
    const {
      title = "Untitled Board",
      description = "",
      isPublic = false,
      canvasData = "{}",
      thumbnail = "",
    } = req.body;

    // Create board
    const board = new Board({
      title,
      description,
      owner: req.user.id,
      isPublic,
    });

    await board.save();

    // Create initial page
    const firstPage = new Page({
      board: board._id,
      name: "Page 1",
      canvasData,
      thumbnail,
      order: 0,
    });

    await firstPage.save();

    // Link page to board
    board.pages = [firstPage._id];
    board.currentPageId = firstPage._id;
    await board.save();

    // Add board reference to user
    await User.findByIdAndUpdate(req.user.id, {
      $push: { boards: board._id },
    });

    // Populate for response
    await board.populate("pages");
    await board.populate("owner", "username email avatar");

    res.status(201).json(board);
  } catch (error) {
    console.error("Create board error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all boards for logged-in user (owner or collaborator)
export const getMyBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user.id }, { "collaborators.user": req.user.id }],
    })
      .populate("owner", "username email avatar")
      .populate("collaborators.user", "username email avatar")
      .sort({ updatedAt: -1 });

    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get board by ID
export const getBoardById = async (req, res) => {
  try {
    const { id } = req.params;

    let board = await Board.findById(id)
      .populate("owner", "username email avatar")
      .populate("collaborators.user", "username email avatar");

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Check access
    const isOwner = board.owner._id.equals(req.user.id);
    const isCollaborator = board.collaborators.some((c) =>
      c.user.equals(req.user.id),
    );

    if (!isOwner && !isCollaborator) {
      return res
        .status(403)
        .json({ message: "You don't have access to this board" });
    }

    // Auto-migrate legacy boards
    if (!board.pages || board.pages.length === 0) {
      board = await migrateLegacyBoard(board);
      // Refresh with populated data
      board = await Board.findById(id)
        .populate("owner", "username email avatar")
        .populate("collaborators.user", "username email avatar")
        .populate("pages");
    } else {
      await board.populate("pages");
    }

    res.json(board);
  } catch (error) {
    console.error("Get board error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update board metadata (title, description, etc.)
export const updateBoard = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, thumbnail, isPublic, currentPageId } = req.body;

    const board = await Board.findById(id);

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Auth check
    const isOwner = board.owner.equals(req.user.id);
    const collaborator = board.collaborators.find((c) =>
      c.user.equals(req.user.id),
    );
    const isEditor = collaborator?.role === "editor";

    if (!isOwner && !collaborator) {
      return res
        .status(403)
        .json({ message: "You don't have permission to edit this board" });
    }

    if (!isOwner && !isEditor) {
      return res.status(403).json({ message: "Editor permission required" });
    }

    // Update fields
    if (title !== undefined) board.title = title;
    if (description !== undefined) board.description = description;
    if (thumbnail !== undefined) board.thumbnail = thumbnail;
    if (isPublic !== undefined) board.isPublic = isPublic;

    // Switch current page
    if (currentPageId) {
      const pageExists = await Page.exists({ _id: currentPageId, board: id });
      if (pageExists) {
        board.currentPageId = currentPageId;
      } else {
        return res.status(400).json({ message: "Invalid page ID" });
      }
    }

    await board.save();

    // Repopulate for response
    await board.populate("owner", "username email avatar");
    await board.populate("collaborators.user", "username email avatar");
    await board.populate("pages");

    res.json({ message: "Board updated successfully", board });
  } catch (error) {
    console.error("Update board error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete board (only owner can delete)
export const deleteBoard = async (req, res) => {
  try {
    const { id } = req.params;

    const board = await Board.findById(id);

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Only owner can delete
    if (!board.owner.equals(req.user.id)) {
      return res
        .status(403)
        .json({ message: "You don't have permission to delete this board" });
    }

    // Remove board reference from user
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { boards: board._id },
    });

    // Delete all associated pages
    await Page.deleteMany({ board: id });

    // Delete board
    await Board.findByIdAndDelete(id);

    return res.json({ message: "Board deleted successfully" });
  } catch (error) {
    console.error("Delete board error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
