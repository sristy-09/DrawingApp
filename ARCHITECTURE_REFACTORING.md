# Multi-Page Architecture Refactoring

## Overview
This document outlines the production-ready refactoring of the multi-page system, moving from embedded pages to a referenced Page collection with dedicated REST endpoints.

---

## Architecture Decision: Referenced vs Embedded

### ✅ CHOSEN: Referenced Pages (Separate Collection)

**Reasons:**
1. **Scalability**: No 16MB MongoDB document size limit
2. **Performance**: Atomic updates per page without loading entire board
3. **Indexing**: Better query performance with dedicated indexes
4. **Flexibility**: Easier to implement page-level permissions later
5. **Concurrency**: Multiple users can edit different pages simultaneously

**Trade-offs:**
- Slightly more complex queries (requires populate)
- Additional database queries for page operations
- Need to maintain referential integrity

### ❌ NOT CHOSEN: Embedded Pages

**Why not:**
- Risk hitting 16MB document limit with many pages/large canvas data
- Entire board must be loaded to access single page
- Concurrent edits can cause conflicts
- Poor performance as board grows

---

## Database Schema Design

### Board Model (`server/models/Board.js`)

```javascript
{
  title: String (required, max 200 chars),
  description: String (max 1000 chars),
  owner: ObjectId (ref: User, indexed),
  collaborators: [{
    user: ObjectId (ref: User),
    role: enum['viewer', 'editor'],
    addedAt: Date
  }],
  thumbnail: String,
  pages: [ObjectId] (ref: Page),           // Array of page references
  currentPageId: ObjectId (ref: Page),     // Currently active page
  canvasData: String (deprecated, hidden), // Legacy field
  isPublic: Boolean,
  timestamps: true                         // Auto createdAt/updatedAt
}
```

**Indexes:**
- `owner + updatedAt` (for user's board list)
- `collaborators.user` (for shared boards)
- `isPublic + updatedAt` (for public board discovery)

### Page Model (`server/models/Page.js`)

```javascript
{
  board: ObjectId (ref: Board, required, indexed),
  name: String (required, max 100 chars),
  order: Number (required, auto-incremented),
  canvasData: String (JSON),
  thumbnail: String (base64 or URL),
  createdAt: Date (immutable),
  updatedAt: Date (auto-updated)
}
```

**Indexes:**
- `board + order` (compound index for efficient page queries)

**Features:**
- Auto-increments `order` on creation
- Auto-updates `updatedAt` on save
- Validates unique order within board

---

## REST API Structure

### Board Endpoints

```
POST   /board                    - Create new board
GET    /board                    - Get user's boards
GET    /board/:id                - Get board by ID (with pages)
PATCH  /board/:id                - Update board metadata
DELETE /board/:id                - Delete board (cascades to pages)
```

### Page Endpoints (NEW)

```
GET    /board/:boardId/pages                    - List all pages (without canvasData)
GET    /board/:boardId/pages/:pageId            - Get single page (with canvasData)
POST   /board/:boardId/pages                    - Create new page
PATCH  /board/:boardId/pages/:pageId            - Update page (name, order, etc.)
PATCH  /board/:boardId/pages/:pageId/canvas     - Update canvas only (optimized)
DELETE /board/:boardId/pages/:pageId            - Delete page
POST   /board/:boardId/pages/:pageId/duplicate  - Duplicate page
PATCH  /board/:boardId/pages/reorder            - Reorder pages
```

---

## API Usage Examples

### 1. Create New Board
```javascript
POST /board
{
  "title": "My Whiteboard",
  "description": "Project planning",
  "isPublic": false
}

Response: {
  "_id": "board123",
  "title": "My Whiteboard",
  "pages": [{ "_id": "page1", "name": "Page 1", ... }],
  "currentPageId": "page1"
}
```

### 2. Get Board with Pages
```javascript
GET /board/board123

Response: {
  "_id": "board123",
  "title": "My Whiteboard",
  "pages": [
    { "_id": "page1", "name": "Page 1", "order": 0, ... },
    { "_id": "page2", "name": "Page 2", "order": 1, ... }
  ],
  "currentPageId": "page1"
}
```

### 3. Add New Page
```javascript
POST /board/board123/pages
{
  "name": "Brainstorming",
  "canvasData": "{}",
  "order": 2
}

Response: {
  "_id": "page3",
  "board": "board123",
  "name": "Brainstorming",
  "order": 2
}
```

### 4. Update Canvas (Optimized)
```javascript
PATCH /board/board123/pages/page1/canvas
{
  "canvasData": "{...large JSON...}",
  "thumbnail": "data:image/png;base64,..."
}

Response: {
  "message": "Canvas saved successfully",
  "page": { "_id": "page1", "name": "Page 1", "updatedAt": "..." }
}
```

### 5. Switch Current Page
```javascript
PATCH /board/board123
{
  "currentPageId": "page2"
}
```

### 6. Reorder Pages
```javascript
PATCH /board/board123/pages/reorder
{
  "pageIds": ["page2", "page1", "page3"]
}
```

### 7. Delete Page
```javascript
DELETE /board/board123/pages/page2

Response: {
  "message": "Page deleted successfully",
  "newCurrentPageId": "page1"
}
```

---

## Backward Compatibility

### Legacy Migration Strategy

**Automatic Migration:**
- Triggered when accessing old board without pages
- Creates first page from legacy `canvasData`
- Sets `currentPageId` to new page
- Preserves all existing data

**Migration Function:**
```javascript
const migrateLegacyBoard = async (board) => {
  if (board.pages && board.pages.length > 0) {
    return board; // Already migrated
  }

  // Fetch legacy canvasData (hidden by default)
  const legacyBoard = await Board.findById(board._id).select("+canvasData");
  
  // Create first page
  const firstPage = new Page({
    board: board._id,
    name: "Page 1",
    canvasData: legacyBoard?.canvasData || "{}",
    thumbnail: board.thumbnail || "",
    order: 0,
  });
  
  await firstPage.save();
  
  // Update board
  board.pages = [firstPage._id];
  board.currentPageId = firstPage._id;
  await board.save();
  
  return board;
};
```

**When Migration Runs:**
- On `GET /board/:id` if pages array is empty
- Transparent to frontend
- No data loss

---

## Performance Optimizations

### 1. Selective Field Loading
```javascript
// List pages without heavy canvasData
GET /board/:boardId/pages
→ Returns: { _id, name, order, thumbnail, updatedAt }

// Get full page data only when needed
GET /board/:boardId/pages/:pageId
→ Returns: { _id, name, order, canvasData, thumbnail, ... }
```

### 2. Atomic Canvas Updates
```javascript
// Optimized endpoint for frequent canvas saves
PATCH /board/:boardId/pages/:pageId/canvas
→ Uses findOneAndUpdate (atomic)
→ Returns minimal data
→ Prevents race conditions
```

### 3. Compound Indexes
```javascript
// Fast page queries
pageSchema.index({ board: 1, order: 1 });

// Fast board queries
boardSchema.index({ owner: 1, updatedAt: -1 });
```

### 4. Request Size Limits
```javascript
// Increased for large canvas data
app.use(express.json({ limit: "10mb" }));
```

---

## Handling Large Canvas Data

### Current Approach: Store in MongoDB
- **Pros**: Simple, no external dependencies
- **Cons**: Limited to ~10MB per page
- **Suitable for**: Most use cases

### Future Scalability Options:

#### Option 1: GridFS (MongoDB)
```javascript
// For canvas data > 16MB
import { GridFSBucket } from 'mongodb';

const bucket = new GridFSBucket(db, { bucketName: 'canvasData' });

// Store
const uploadStream = bucket.openUploadStream('page123.json');
uploadStream.write(canvasData);

// Retrieve
const downloadStream = bucket.openDownloadStreamByName('page123.json');
```

#### Option 2: External Storage (S3, Cloudinary)
```javascript
// Store reference only
{
  canvasDataUrl: "https://s3.amazonaws.com/bucket/page123.json",
  canvasDataSize: 25000000 // bytes
}

// Benefits:
// - Unlimited size
// - CDN delivery
// - Reduced database load
```

#### Option 3: Compression
```javascript
import zlib from 'zlib';

// Compress before storing
const compressed = zlib.gzipSync(canvasData);
page.canvasData = compressed.toString('base64');

// Decompress when retrieving
const decompressed = zlib.gunzipSync(Buffer.from(page.canvasData, 'base64'));
```

**Recommendation**: Start with MongoDB, migrate to S3 if pages exceed 5MB regularly.

---

## Security & Permissions

### Access Control Hierarchy
```
Owner:
  - Full control (CRUD on board and pages)
  - Manage collaborators
  - Delete board

Editor:
  - Create/update/delete pages
  - Update canvas data
  - Cannot delete board

Viewer:
  - Read-only access
  - Cannot modify anything
```

### Permission Checks
```javascript
// Helper function in pageController.js
const checkBoardAccess = async (boardId, userId, requireEditor = false) => {
  const board = await Board.findById(boardId);
  
  const isOwner = board.owner.equals(userId);
  const collaborator = board.collaborators.find(c => c.user.equals(userId));
  const isEditor = collaborator?.role === "editor";
  
  if (!isOwner && !collaborator) {
    return { hasAccess: false, error: "Access denied", status: 403 };
  }
  
  if (requireEditor && !isOwner && !isEditor) {
    return { hasAccess: false, error: "Editor permission required", status: 403 };
  }
  
  return { hasAccess: true, board, isOwner, isEditor };
};
```

---

## Error Handling

### Validation Errors
```javascript
// Invalid page ID
DELETE /board/board123/pages/invalid
→ 404: "Page not found"

// Cannot delete last page
DELETE /board/board123/pages/page1 (only page)
→ 400: "Cannot delete the last page"

// Invalid currentPageId
PATCH /board/board123 { currentPageId: "nonexistent" }
→ 400: "Invalid page ID"
```

### Concurrency Handling
```javascript
// Use atomic operations
Page.findOneAndUpdate(
  { _id: pageId, board: boardId },
  { canvasData, updatedAt: Date.now() },
  { new: true }
);
```

---

## Testing Recommendations

### Unit Tests
```javascript
// Test page creation
test('should create page with auto-incremented order')

// Test migration
test('should migrate legacy board to page structure')

// Test permissions
test('should deny viewer from creating pages')

// Test deletion
test('should prevent deleting last page')
```

### Integration Tests
```javascript
// Test full workflow
test('create board → add pages → reorder → delete')

// Test concurrent updates
test('multiple users editing different pages')

// Test large canvas data
test('save canvas data up to 10MB')
```

---

## Migration Checklist

### Backend ✅
- [x] Create Page model with indexes
- [x] Create page controller with REST endpoints
- [x] Create page routes
- [x] Update board controller (remove page logic)
- [x] Add legacy migration function
- [x] Update server.js with page routes
- [x] Increase JSON payload limit

### Frontend (TODO)
- [ ] Update API client to use new endpoints
- [ ] Replace bulk page updates with individual calls
- [ ] Add error handling for new endpoints
- [ ] Update page creation to use POST /pages
- [ ] Update canvas save to use PATCH /pages/:id/canvas
- [ ] Add page reordering UI
- [ ] Add page duplication feature

### Database
- [ ] Run migration script for existing boards
- [ ] Create indexes (automatic on first query)
- [ ] Monitor query performance
- [ ] Set up backup strategy

---

## Monitoring & Maintenance

### Key Metrics to Track
```javascript
// Page size distribution
db.pages.aggregate([
  { $project: { size: { $strLenBytes: "$canvasData" } } },
  { $bucket: { groupBy: "$size", boundaries: [0, 1000000, 5000000, 10000000] } }
])

// Pages per board
db.boards.aggregate([
  { $project: { pageCount: { $size: "$pages" } } },
  { $group: { _id: null, avg: { $avg: "$pageCount" }, max: { $max: "$pageCount" } } }
])

// Most active pages
db.pages.find().sort({ updatedAt: -1 }).limit(10)
```

### Cleanup Tasks
```javascript
// Remove orphaned pages (no board reference)
db.pages.deleteMany({ board: { $nin: db.boards.distinct("_id") } })

// Archive old boards
db.boards.updateMany(
  { updatedAt: { $lt: new Date(Date.now() - 365*24*60*60*1000) } },
  { $set: { archived: true } }
)
```

---

## Summary

### What Changed
1. ✅ Pages moved from embedded to referenced collection
2. ✅ Dedicated REST endpoints for page operations
3. ✅ Proper unique ID generation (MongoDB ObjectId)
4. ✅ Atomic canvas updates
5. ✅ Backward compatibility with legacy boards
6. ✅ Performance optimizations (indexes, selective loading)
7. ✅ Proper permission checks
8. ✅ Scalable architecture

### Benefits
- **Scalability**: No document size limits
- **Performance**: Faster queries, atomic updates
- **Maintainability**: Clean separation of concerns
- **Flexibility**: Easy to extend with new features
- **Security**: Granular permission checks

### Next Steps
1. Update frontend to use new API endpoints
2. Test migration with production data
3. Monitor performance metrics
4. Consider external storage for very large canvases
5. Implement page-level collaboration features
