import mongoose from "mongoose";

const pageSchema = new mongoose.Schema({
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Board",
    required: true,
    index: true, // Index for faster queries
  },
  name: {
    type: String,
    required: true,
    default: "Untitled Page",
    maxlength: 100,
  },
  order: {
    type: Number,
    required: true,
    default: 0,
  },
  canvasData: {
    type: String,
    default: "{}",
    // For very large canvas data, consider storing in GridFS or S3
    // and keeping only a reference here
  },
  thumbnail: {
    type: String,
    default: "",
    // Store as base64 or URL to external storage (S3, Cloudinary)
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient board page queries
pageSchema.index({ board: 1, order: 1 });

// Update timestamp on save
pageSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure order is unique within a board
pageSchema.pre("save", async function (next) {
  if (this.isNew) {
    const maxOrder = await this.constructor
      .findOne({ board: this.board })
      .sort({ order: -1 })
      .select("order");
    
    if (maxOrder && this.order <= maxOrder.order) {
      this.order = maxOrder.order + 1;
    }
  }
  next();
});

export const Page = mongoose.model("Page", pageSchema);
