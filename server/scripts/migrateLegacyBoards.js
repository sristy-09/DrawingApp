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
    console.log("🚀 Starting legacy board migration...\n");

    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find boards without pages or with empty pages array
    const legacyBoards = await Board.find({
      $or: [
        { pages: { $exists: false } },
        { pages: { $size: 0 } }
      ]
    }).select("+canvasData"); // Include hidden canvasData field

    console.log(`📊 Found ${legacyBoards.length} legacy boards to migrate\n`);

    if (legacyBoards.length === 0) {
      console.log("✨ No legacy boards found. All boards are up to date!");
      await mongoose.disconnect();
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // Migrate each board
    for (const board of legacyBoards) {
      try {
        console.log(`📝 Migrating board: ${board._id} - "${board.title}"`);

        // Create first page from legacy data
        const firstPage = new Page({
          board: board._id,
          name: "Page 1",
          canvasData: board.canvasData || "{}",
          thumbnail: board.thumbnail || "",
          order: 0,
        });

        await firstPage.save();
        console.log(`   ✅ Created page: ${firstPage._id}`);

        // Update board with page reference
        board.pages = [firstPage._id];
        board.currentPageId = firstPage._id;
        await board.save();

        console.log(`   ✅ Updated board with page reference`);
        console.log(`   📄 Canvas data size: ${board.canvasData?.length || 0} bytes\n`);

        successCount++;
      } catch (error) {
        console.error(`   ❌ Error migrating board ${board._id}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 Migration Summary:");
    console.log("=".repeat(50));
    console.log(`✅ Successfully migrated: ${successCount} boards`);
    console.log(`❌ Failed: ${errorCount} boards`);
    console.log(`📈 Total processed: ${legacyBoards.length} boards`);
    console.log("=".repeat(50) + "\n");

    // Verify migration
    const remainingLegacy = await Board.countDocuments({
      $or: [
        { pages: { $exists: false } },
        { pages: { $size: 0 } }
      ]
    });

    if (remainingLegacy === 0) {
      console.log("✨ All boards successfully migrated!");
    } else {
      console.log(`⚠️  Warning: ${remainingLegacy} boards still need migration`);
    }

    // Disconnect
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    console.log("🎉 Migration complete!\n");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run migration
migrateLegacyBoards();
