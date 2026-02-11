import { Board } from "../models/Board.js";
import { User } from "../models/User.js";

// Create new board
export const createBoard = async (req, res) => {
  try {
    const {
      title = "Untitled Board",
      description = "",
      isPublic = false,
      canvasData = null,
      thumbnail = null,
    } = req.body;

    const board = new Board({
      title,
      description,
      owner: req.user.id,
      isPublic,
      canvasData,
      thumbnail,
      pages: [
        {
          id: "page-1",
          name: "Page 1",
          canvasData: canvasData || "{}",
          thumbnail: thumbnail || "",
        },
      ],
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
    const { canvasData, title, description, thumbnail, isPublic, pages, currentPageId } = req.body;

    const board = await Board.findById(id)
      .populate("owner", "username email avatar")
      .populate("collaborators.user", "username email avatar");

    if (!board) {
      return res.status(404).json({ message: "Board not found" });
    }

    // Auth check
    const isOwner = board.owner._id.equals(req.user.id);
    const isCollaborator = board.collaborators.some((c) =>
      c.user._id.equals(req.user.id)
    );
    if (!isOwner && !isCollaborator) {
      return res
        .status(403)
        .json({ message: "You don't have permission to edit this board" });
    }

    // Migrate old boards to pages structure if needed
    if (!board.pages || board.pages.length === 0) {
      board.pages = [
        {
          id: "page-1",
          name: "Page 1",
          canvasData: board.canvasData || "{}",
          thumbnail: board.thumbnail || "",
        },
      ];
    }

    // Update fields if provided
    if (pages !== undefined) {
      board.pages = pages;
    } else if (currentPageId && canvasData !== undefined) {
      // Update specific page
      const pageIndex = board.pages.findIndex((p) => p.id === currentPageId);
      if (pageIndex !== -1) {
        board.pages[pageIndex].canvasData = canvasData;
        if (thumbnail !== undefined) {
          board.pages[pageIndex].thumbnail = thumbnail;
        }
      }
    } else if (canvasData !== undefined) {
      // Fallback: update legacy canvasData
      board.canvasData = canvasData;
    }

    if (title !== undefined) board.title = title;
    if (description !== undefined) board.description = description;
    if (thumbnail !== undefined && !currentPageId) board.thumbnail = thumbnail;
    if (isPublic !== undefined) board.isPublic = isPublic;
    board.updatedAt = Date.now();

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
