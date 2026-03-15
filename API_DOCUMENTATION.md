# Multi-Page Board API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Board Endpoints

### 1. Create Board
Create a new board with an initial page.

**Endpoint:** `POST /board`

**Request Body:**
```json
{
  "title": "My Whiteboard",
  "description": "Project planning board",
  "isPublic": false
}
```

**Response:** `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "My Whiteboard",
  "description": "Project planning board",
  "owner": {
    "_id": "507f191e810c19729de860ea",
    "username": "john_doe",
    "email": "john@example.com"
  },
  "pages": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Page 1",
      "order": 0,
      "canvasData": "{}",
      "thumbnail": "",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "currentPageId": "507f1f77bcf86cd799439012",
  "isPublic": false,
  "collaborators": [],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Get User's Boards
Get all boards owned by or shared with the authenticated user.

**Endpoint:** `GET /board`

**Response:** `200 OK`
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "title": "My Whiteboard",
    "description": "Project planning board",
    "owner": {
      "_id": "507f191e810c19729de860ea",
      "username": "john_doe"
    },
    "thumbnail": "",
    "pageCount": 3,
    "isPublic": false,
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### 3. Get Board by ID
Get a specific board with all its pages.

**Endpoint:** `GET /board/:id`

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "My Whiteboard",
  "description": "Project planning board",
  "owner": {
    "_id": "507f191e810c19729de860ea",
    "username": "john_doe",
    "email": "john@example.com"
  },
  "pages": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Page 1",
      "order": 0,
      "thumbnail": "data:image/png;base64,...",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Brainstorming",
      "order": 1,
      "thumbnail": "",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "currentPageId": "507f1f77bcf86cd799439012",
  "isPublic": false,
  "collaborators": [],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

**Note:** Pages returned here do NOT include `canvasData` for performance. Use the page-specific endpoint to get full canvas data.

---

### 4. Update Board
Update board metadata (title, description, current page, etc.).

**Endpoint:** `PATCH /board/:id`

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "New description",
  "currentPageId": "507f1f77bcf86cd799439013",
  "isPublic": true
}
```

**Response:** `200 OK`
```json
{
  "message": "Board updated successfully",
  "board": { /* updated board object */ }
}
```

---

### 5. Delete Board
Delete a board and all its pages (owner only).

**Endpoint:** `DELETE /board/:id`

**Response:** `200 OK`
```json
{
  "message": "Board deleted successfully"
}
```

---

## Page Endpoints

### 1. List Pages
Get all pages for a board (without canvas data for performance).

**Endpoint:** `GET /board/:boardId/pages`

**Response:** `200 OK`
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "board": "507f1f77bcf86cd799439011",
    "name": "Page 1",
    "order": 0,
    "thumbnail": "data:image/png;base64,...",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "board": "507f1f77bcf86cd799439011",
    "name": "Brainstorming",
    "order": 1,
    "thumbnail": "",
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
]
```

---

### 2. Get Page by ID
Get a specific page with full canvas data.

**Endpoint:** `GET /board/:boardId/pages/:pageId`

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "board": "507f1f77bcf86cd799439011",
  "name": "Page 1",
  "order": 0,
  "canvasData": "{\"version\":\"6.0.0\",\"objects\":[...]}",
  "thumbnail": "data:image/png;base64,...",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

---

### 3. Create Page
Create a new page in a board.

**Endpoint:** `POST /board/:boardId/pages`

**Request Body:**
```json
{
  "name": "New Page",
  "canvasData": "{}",
  "thumbnail": "",
  "order": 2
}
```

**Response:** `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "board": "507f1f77bcf86cd799439011",
  "name": "New Page",
  "order": 2,
  "canvasData": "{}",
  "thumbnail": "",
  "createdAt": "2024-01-15T12:00:00.000Z",
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

---

### 4. Update Page
Update page metadata (name, order, etc.).

**Endpoint:** `PATCH /board/:boardId/pages/:pageId`

**Request Body:**
```json
{
  "name": "Renamed Page",
  "order": 1
}
```

**Response:** `200 OK`
```json
{
  "message": "Page updated successfully",
  "page": { /* updated page object */ }
}
```

---

### 5. Update Canvas Data (Optimized)
Update only the canvas data and thumbnail. This is the most frequently called endpoint.

**Endpoint:** `PATCH /board/:boardId/pages/:pageId/canvas`

**Request Body:**
```json
{
  "canvasData": "{\"version\":\"6.0.0\",\"objects\":[...]}",
  "thumbnail": "data:image/png;base64,..."
}
```

**Response:** `200 OK`
```json
{
  "message": "Canvas saved successfully",
  "page": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Page 1",
    "updatedAt": "2024-01-15T12:30:00.000Z"
  }
}
```

**Performance Notes:**
- Uses atomic `findOneAndUpdate`
- Returns minimal data (no canvasData in response)
- Optimized for frequent auto-save calls

---

### 6. Delete Page
Delete a page from a board.

**Endpoint:** `DELETE /board/:boardId/pages/:pageId`

**Response:** `200 OK`
```json
{
  "message": "Page deleted successfully",
  "newCurrentPageId": "507f1f77bcf86cd799439012"
}
```

**Rules:**
- Cannot delete the last page
- If deleting current page, switches to first page
- Returns new current page ID

---

### 7. Duplicate Page
Create a copy of an existing page.

**Endpoint:** `POST /board/:boardId/pages/:pageId/duplicate`

**Response:** `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439015",
  "board": "507f1f77bcf86cd799439011",
  "name": "Page 1 (Copy)",
  "order": 1,
  "canvasData": "{...copied data...}",
  "thumbnail": "data:image/png;base64,...",
  "createdAt": "2024-01-15T13:00:00.000Z",
  "updatedAt": "2024-01-15T13:00:00.000Z"
}
```

---

### 8. Reorder Pages
Change the order of pages in a board.

**Endpoint:** `PATCH /board/:boardId/pages/reorder`

**Request Body:**
```json
{
  "pageIds": [
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439014"
  ]
}
```

**Response:** `200 OK`
```json
{
  "message": "Pages reordered successfully"
}
```

**Rules:**
- Must include all page IDs
- Order in array determines new order
- Updates both board.pages array and page.order field

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "canvasData is required"
}
```

### 401 Unauthorized
```json
{
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "message": "You don't have permission to edit this board"
}
```

### 404 Not Found
```json
{
  "message": "Board not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Server error",
  "error": "Detailed error message"
}
```

---

## Permission Levels

### Owner
- Full control over board and pages
- Can delete board
- Can manage collaborators
- Can perform all operations

### Editor (Collaborator)
- Can create, update, delete pages
- Can update canvas data
- Cannot delete board
- Cannot manage collaborators

### Viewer (Collaborator)
- Read-only access
- Can view board and pages
- Cannot modify anything

---

## Rate Limiting Recommendations

For production, implement rate limiting:

```javascript
// Canvas updates (frequent)
PATCH /board/:boardId/pages/:pageId/canvas
→ 60 requests per minute per user

// Page operations (moderate)
POST/PATCH/DELETE /board/:boardId/pages/*
→ 30 requests per minute per user

// Board operations (infrequent)
POST/PATCH/DELETE /board/*
→ 10 requests per minute per user
```

---

## Best Practices

### 1. Auto-Save Strategy
```javascript
// Debounce canvas saves
const debouncedSave = debounce(async () => {
  await axios.patch(
    `/board/${boardId}/pages/${pageId}/canvas`,
    { canvasData, thumbnail }
  );
}, 2000); // Save 2 seconds after last change
```

### 2. Page Switching
```javascript
// Save current page before switching
await axios.patch(
  `/board/${boardId}/pages/${currentPageId}/canvas`,
  { canvasData: getCurrentCanvas() }
);

// Switch current page
await axios.patch(`/board/${boardId}`, {
  currentPageId: newPageId
});

// Load new page
const { data } = await axios.get(
  `/board/${boardId}/pages/${newPageId}`
);
loadCanvas(data.canvasData);
```

### 3. Error Handling
```javascript
try {
  await axios.patch(`/board/${boardId}/pages/${pageId}/canvas`, data);
} catch (error) {
  if (error.response?.status === 403) {
    // Permission denied - switch to read-only mode
  } else if (error.response?.status === 404) {
    // Page deleted - reload board
  } else {
    // Network error - retry with exponential backoff
  }
}
```

### 4. Optimistic Updates
```javascript
// Update UI immediately
updateLocalCanvas(newData);

// Save to server in background
axios.patch(`/board/${boardId}/pages/${pageId}/canvas`, newData)
  .catch(error => {
    // Revert on error
    revertLocalCanvas();
    showError("Failed to save changes");
  });
```

---

## Migration from Old API

### Old Approach (Embedded Pages)
```javascript
// ❌ Old: Update entire pages array
PATCH /board/:id
{
  "pages": [
    { "id": "page-1", "name": "Page 1", "canvasData": "..." },
    { "id": "page-2", "name": "Page 2", "canvasData": "..." }
  ]
}
```

### New Approach (Referenced Pages)
```javascript
// ✅ New: Update specific page
PATCH /board/:boardId/pages/:pageId/canvas
{
  "canvasData": "..."
}

// ✅ New: Create page
POST /board/:boardId/pages
{
  "name": "Page 2"
}
```

### Migration Checklist
- [ ] Replace `PATCH /board/:id` with page-specific endpoints
- [ ] Use `POST /board/:boardId/pages` for new pages
- [ ] Use `PATCH /board/:boardId/pages/:pageId/canvas` for canvas saves
- [ ] Use `DELETE /board/:boardId/pages/:pageId` for page deletion
- [ ] Update page switching to use `PATCH /board/:id` with `currentPageId`
- [ ] Handle page IDs as MongoDB ObjectIds (not "page-1" strings)

---

## Testing with cURL

### Create Board
```bash
curl -X POST http://localhost:3000/board \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Board","isPublic":false}'
```

### Add Page
```bash
curl -X POST http://localhost:3000/board/BOARD_ID/pages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Page 2","canvasData":"{}"}'
```

### Update Canvas
```bash
curl -X PATCH http://localhost:3000/board/BOARD_ID/pages/PAGE_ID/canvas \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"canvasData":"{\"objects\":[]}"}'
```

### Get Board
```bash
curl -X GET http://localhost:3000/board/BOARD_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Changelog

### v2.0.0 (Current)
- ✅ Separated pages into dedicated collection
- ✅ Added dedicated page endpoints
- ✅ Optimized canvas update endpoint
- ✅ Added page duplication
- ✅ Added page reordering
- ✅ Improved permission checks
- ✅ Added backward compatibility

### v1.0.0 (Legacy)
- Embedded pages in board document
- Single update endpoint for all changes
- Hardcoded page IDs ("page-1", "page-2")
