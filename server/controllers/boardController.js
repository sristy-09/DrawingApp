import { Board } from "../models/Board.js";
import { User } from "../models/User.js";

// Create new board
export const createBoard = async (req, res) => {
  try {
    const {
      title = "Untitled Board",
      description = "",
      isPublic = false,
    } = req.body;

    const board = new Board({
      title,
      description,
      owner: req.user.id,
      isPublic,
    });

    await board.save();

    // Add board reference to user
    await User.findByIdAndUpdate(req.user.id, {
      $push: { boards: board._id },
    });

    res.status(201).json(board);
  } catch (error) {
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

    const board = await Board.findById(id)
      .populate("owner", "username email avatar")
      .populate("collaborators.user", "username email avatar");

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    const isOwner = board.owner._id.equals(req.user.id);
    const isCollaborator = board.collaborators.some((c) =>
      c.user.equals(req.user.id)
    );

    if (!isOwner && !isCollaborator) {
      return res
        .status(403)
        .json({ message: "You don't have access to this board" });
    }

    res.json(board);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update endpoint to save canvasData (only owner/collaborators can edit)
export const updateBoard = async (req, res) => {
  try {
    const { id } = req.params;
    const { canvasData, title, description, thumbnail, isPublic } = req.body; // Allow partial updates

    const board = await Board.findById(id)
      .populate("owner", "username email avatar")
      .populate("collaborators.user", "username email avatar");

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Auth check(already in middleware, but reinforce)
    const isOwner = board.owner._id.equals(req.user.id);
    const isCollaborator = board.collaborators.some((c) =>
      c.user._id.equals(req.user.id)
    );
    if (!isOwner && !isCollaborator) {
      return res
        .status(403)
        .json({ message: "You don't have permission to edit this board" });
    }

    // Update fields if provided
    if (canvasData !== undefined) board.canvasData = canvasData;
    if (title !== undefined) board.title = title;
    if (description !== undefined) board.description = description;
    if (thumbnail !== undefined) board.thumbnail = thumbnail;
    if (isPublic !== undefined) board.isPublic = isPublic;
    board.updatedAt = Date.now(); // Auto-update timestamp

    await board.save();

    // Repopulate for response
    await board.populate("owner", "username email avatar");
    await board.populate("collaborators.user", "username email avatar");

    res.json({ message: "Board updated successfully", board });
  } catch (error) {
    console.error("Updated board error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
