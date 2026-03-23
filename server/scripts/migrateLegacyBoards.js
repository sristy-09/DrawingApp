import mongoose from "mongoose";
import dotenv from "dotenv";
import { Board } from "../models/Board.js";
import { Page } from "../models/Page.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Migration Script: Convert legacy boards to new page structure
 * 
 * This script:
 * 1. Finds all boards without pages
 * 2. Creates a "Page 1" from legacy canvasData
 * 3. Links the page to the board
 * 4. Sets currentPageId
 * 
 * Run with: node server/scripts/migrateLegacyBoards.js
 */

const migrateLegacyBoards = async () => {
  try {

    // Connect to database
    await mongoose.connect(MONGODB_URI);

    // Find boards without pages or with empty pages array
    const legacyBoards = await Board.find({
      $or: [
        { pages: { $exists: false } },
        { pages: { $size: 0 } }
      ]
    }).select("+canvasData"); // Include hidden canvasData field


    if (legacyBoards.length === 0) {
      await mongoose.disconnect();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Migrate each board
    for (const board of legacyBoards) {
      try {

        // Create first page from legacy data
        const firstPage = new Page({
          board: board._id,
          name: "Page 1",
          canvasData: board.canvasData || "{}",
          thumbnail: board.thumbnail || "",
          order: 0,
        });

        await firstPage.save();

        // Update board with page reference
        board.pages = [firstPage._id];
        board.currentPageId = firstPage._id;
        await board.save();


        successCount++;
      } catch (error) {
        console.error(`   ❌ Error migrating board ${board._id}:`, error.message);
        errorCount++;
      }
    }

    

    // Verify migration
    const remainingLegacy = await Board.countDocuments({
      $or: [
        { pages: { $exists: false } },
        { pages: { $size: 0 } }
      ]
    });

    

    // Disconnect
    await mongoose.disconnect();

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run migration
migrateLegacyBoards();
