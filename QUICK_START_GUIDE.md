# Quick Start Guide - Multi-Page Refactoring

## 🚀 What Changed?

Your multi-page system has been refactored from embedded pages to a production-ready architecture with:
- ✅ Separate Page collection (no more 16MB limit)
- ✅ Dedicated REST endpoints for page operations
- ✅ MongoDB ObjectId for page IDs (no more "page-1" hardcoded strings)
- ✅ Atomic canvas updates
- ✅ Backward compatibility with legacy boards
- ✅ Proper permission checks

---

## 📁 New Files Created

### Models
- `server/models/Page.js` - Page model with indexes and auto-ordering

### Controllers
- `server/controllers/pageController.js` - All page operations (CRUD, duplicate, reorder)

### Routes
- `server/routes/page.js` - RESTful page endpoints

### Scripts
- `server/scripts/migrateLegacyBoards.js` - Migration script for existing boards

### Documentation
- `ARCHITECTURE_REFACTORING.md` - Detailed architecture decisions
- `API_DOCUMENTATION.md` - Complete API reference
- `QUICK_START_GUIDE.md` - This file

---

## 🔧 Setup Instructions

### 1. Install Dependencies (if needed)
```bash
npm install
```

### 2. Run Migration Script
Migrate existing boards to new structure:
```bash
npm run migrate
```

This will:
- Find all boards without pages
- Create "Page 1" from legacy canvasData
- Link pages to boards
- Set currentPageId

### 3. Start Server
```bash
npm run dev
```

Server will run on `http://localhost:3000`

---

## 📡 New API Endpoints

### Page Management
```
GET    /board/:boardId/pages                    - List pages
GET    /board/:boardId/pages/:pageId            - Get page with canvas
POST   /board/:boardId/pages                    - Create page
PATCH  /board/:boardId/pages/:pageId            - Update page
PATCH  /board/:boardId/pages/:pageId/canvas     - Update canvas (optimized)
DELETE /board/:boardId/pages/:pageId            - Delete page
POST   /board/:boardId/pages/:pageId/duplicate  - Duplicate page
PATCH  /board/:boardId/pages/reorder            - Reorder pages
```

### Board Management (Updated)
```
POST   /board           - Create board (auto-creates first page)
GET    /board           - Get user's boards
GET    /board/:id       - Get board (auto-migrates if legacy)
PATCH  /board/:id       - Update board metadata
DELETE /board/:id       - Delete board (cascades to pages)
```

---

## 🔄 Frontend Migration Checklist

### Replace Old API Calls

#### ❌ OLD: Bulk page update
```javascript
// Don't do this anymore
await axios.patch(`/board/${boardId}`, {
  pages: [
    { id: "page-1", name: "Page 1", canvasData: "..." },
    { id: "page-2", name: "Page 2", canvasData: "..." }
  ]
});
```

#### ✅ NEW: Individual page operations
```javascript
// Create page
const { data: newPage } = await axios.post(
  `/board/${boardId}/pages`,
  { name: "Page 2", canvasData: "{}" }
);

// Update canvas (frequent operation)
await axios.patch(
  `/board/${boardId}/pages/${pageId}/canvas`,
  { canvasData: canvasJson, thumbnail: thumbnailData }
);

// Update page name
await axios.patch(
  `/board/${boardId}/pages/${pageId}`,
  { name: "New Name" }
);

// Delete page
await axios.delete(`/board/${boardId}/pages/${pageId}`);
```

### Update Page ID Handling

#### ❌ OLD: String IDs
```javascript
const pageId = "page-1"; // Hardcoded string
```

#### ✅ NEW: MongoDB ObjectIds
```javascript
const pageId = "507f1f77bcf86cd799439012"; // From API response
```

### Update Page Switching

#### ❌ OLD: Manual state management
```javascript
// Save all pages
await axios.patch(`/board/${boardId}`, { pages: allPages });
```

#### ✅ NEW: Switch current page
```javascript
// Save current page
await axios.patch(
  `/board/${boardId}/pages/${currentPageId}/canvas`,
  { canvasData: getCurrentCanvas() }
);

// Switch to new page
await axios.patch(`/board/${boardId}`, {
  currentPageId: newPageId
});

// Load new page
const { data } = await axios.get(
  `/board/${boardId}/pages/${newPageId}`
);
loadCanvas(data.canvasData);
```

---

## 🎯 Common Operations

### 1. Create New Board
```javascript
const { data: board } = await axios.post('/board', {
  title: "My Whiteboard",
  description: "Project planning",
  isPublic: false
});

// Board automatically has first page
console.log(board.pages[0]); // First page
console.log(board.currentPageId); // Current page ID
```

### 2. Add Page to Board
```javascript
const { data: newPage } = await axios.post(
  `/board/${boardId}/pages`,
  {
    name: "Brainstorming",
    canvasData: "{}",
    order: 1
  }
);

console.log(newPage._id); // Use this ID for future operations
```

### 3. Auto-Save Canvas (Debounced)
```javascript
import { debounce } from 'lodash';

const saveCanvas = debounce(async (boardId, pageId, canvasData) => {
  try {
    await axios.patch(
      `/board/${boardId}/pages/${pageId}/canvas`,
      { 
        canvasData,
        thumbnail: generateThumbnail() 
      }
    );
    console.log('✅ Canvas saved');
  } catch (error) {
    console.error('❌ Save failed:', error);
  }
}, 2000); // Save 2 seconds after last change

// Call on canvas change
canvas.on('object:modified', () => {
  const json = canvas.toJSON();
  saveCanvas(boardId, currentPageId, JSON.stringify(json));
});
```

### 4. Switch Pages
```javascript
const switchPage = async (newPageId) => {
  // 1. Save current page
  await axios.patch(
    `/board/${boardId}/pages/${currentPageId}/canvas`,
    { canvasData: canvas.toJSON() }
  );

  // 2. Update board's current page
  await axios.patch(`/board/${boardId}`, {
    currentPageId: newPageId
  });

  // 3. Load new page
  const { data: page } = await axios.get(
    `/board/${boardId}/pages/${newPageId}`
  );
  
  canvas.loadFromJSON(page.canvasData);
  setCurrentPageId(newPageId);
};
```

### 5. Duplicate Page
```javascript
const { data: duplicatedPage } = await axios.post(
  `/board/${boardId}/pages/${pageId}/duplicate`
);

console.log(duplicatedPage.name); // "Original Name (Copy)"
```

### 6. Reorder Pages
```javascript
// Drag and drop result: [page3, page1, page2]
const newOrder = [page3._id, page1._id, page2._id];

await axios.patch(`/board/${boardId}/pages/reorder`, {
  pageIds: newOrder
});
```

### 7. Delete Page
```javascript
const { data } = await axios.delete(
  `/board/${boardId}/pages/${pageId}`
);

// If deleted page was current, switch to new current page
if (data.newCurrentPageId) {
  setCurrentPageId(data.newCurrentPageId);
  loadPage(data.newCurrentPageId);
}
```

---

## 🔍 Testing the Migration

### 1. Check Migration Status
```bash
# Run migration script
npm run migrate

# Output should show:
# ✅ Successfully migrated: X boards
# ✅ All boards successfully migrated!
```

### 2. Test API Endpoints
```bash
# Get board (should auto-migrate if legacy)
curl -X GET http://localhost:3000/board/BOARD_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return board with pages array populated
```

### 3. Verify Database
```javascript
// In MongoDB shell or Compass
db.boards.findOne({ _id: ObjectId("YOUR_BOARD_ID") })
// Should have: pages: [ObjectId(...)]

db.pages.find({ board: ObjectId("YOUR_BOARD_ID") })
// Should return page documents
```

---

## ⚠️ Important Notes

### 1. Page IDs Changed
- **Old:** `"page-1"`, `"page-2"` (strings)
- **New:** `"507f1f77bcf86cd799439012"` (MongoDB ObjectIds)
- Update frontend to handle ObjectIds

### 2. Canvas Data Location
- **Old:** `board.pages[0].canvasData`
- **New:** Fetch separately via `/board/:boardId/pages/:pageId`

### 3. Permission Checks
All page endpoints check:
- User has access to board
- User has editor role (for modifications)
- Page belongs to board

### 4. Backward Compatibility
- Legacy boards auto-migrate on first access
- No manual intervention needed
- Original data preserved

### 5. Performance
- List pages endpoint excludes canvasData
- Canvas update endpoint is atomic
- Indexes optimize queries

---

## 🐛 Troubleshooting

### Migration Failed
```bash
# Check MongoDB connection
echo $MONGODB_URI

# Run migration with verbose logging
node server/scripts/migrateLegacyBoards.js
```

### Page Not Found
```javascript
// Ensure page belongs to board
GET /board/:boardId/pages/:pageId

// Check board.pages array includes pageId
GET /board/:boardId
```

### Permission Denied
```javascript
// Check user role
GET /board/:boardId

// Verify collaborators array
// Only owner and editors can modify pages
```

### Canvas Not Saving
```javascript
// Check payload size (max 10MB)
console.log(canvasData.length);

// Verify endpoint
PATCH /board/:boardId/pages/:pageId/canvas

// Check response
console.log(response.data);
```

---

## 📚 Additional Resources

- **Architecture Details:** `ARCHITECTURE_REFACTORING.md`
- **Complete API Reference:** `API_DOCUMENTATION.md`
- **Original Implementation:** `MULTI_PAGE_IMPLEMENTATION.md`

---

## 🎉 Summary

You now have a production-ready multi-page system with:
- ✅ Scalable architecture (no document size limits)
- ✅ Clean REST API
- ✅ Proper unique IDs
- ✅ Atomic operations
- ✅ Backward compatibility
- ✅ Performance optimizations

**Next Steps:**
1. Run migration: `npm run migrate`
2. Update frontend to use new API endpoints
3. Test thoroughly
4. Deploy with confidence!

For questions or issues, refer to the detailed documentation files.
