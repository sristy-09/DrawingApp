import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    collaborators: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["viewer", "editor"],
          default: "editor",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    thumbnail: {
      type: String,
      default: "",
    },
    pages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Page",
      },
    ],
    currentPageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
    },
    // Legacy field for backward compatibility - DO NOT USE in new code
    canvasData: {
      type: String,
      select: false, // Hidden by default, only retrieved when explicitly requested
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Indexes for performance
boardSchema.index({ owner: 1, updatedAt: -1 });
boardSchema.index({ "collaborators.user": 1 });
boardSchema.index({ isPublic: 1, updatedAt: -1 });

// Virtual for page count
boardSchema.virtual("pageCount").get(function () {
  return this.pages ? this.pages.length : 0;
});

// Ensure virtuals are included in JSON
boardSchema.set("toJSON", { virtuals: true });
boardSchema.set("toObject", { virtuals: true });

export const Board = mongoose.model("Board", boardSchema);
