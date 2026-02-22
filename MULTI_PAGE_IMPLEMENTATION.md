# Multi-Page Support Implementation

## Overview
Multi-page support for the Fabric.js drawing board. Each board contains multiple pages, with each page stored as its own MongoDB document. Pages maintain independent canvas data and undo/redo history stacks on the client.

## Key Features
- ✅ Multiple pages per board (authenticated users only)
- ✅ Independent canvas data for each page (stored in separate Page documents)
- ✅ Separate undo/redo history per page (client-side)
- ✅ Page switching without history cross-contamination
- ✅ Auto-save via the dedicated page canvas endpoint
- ✅ Page navigation UI (bottom center bar + hamburger menu dropdown)
- ✅ Per-page context menu (rename, duplicate, move, delete)
- ✅ Backward compatibility with legacy single-page boards
- ✅ Full frontend ↔ backend synchronization via Page API

## Architecture

### Data Flow
```
Frontend (useBoard.ts)  ←→  Page API endpoints  ←→  Page MongoDB collection
                        ←→  Board API endpoints ←→  Board MongoDB collection
```

- **Canvas data** is saved/loaded via `PATCH /board/:boardId/pages/:pageId/canvas`
- **Page metadata** (name, order) is managed via `PATCH /board/:boardId/pages/:pageId`
- **Board-level state** (currentPageId) is updated via `PATCH /board/:id`
- **Pages are listed** via `GET /board/:id` (populated) or `GET /board/:boardId/pages`

## Backend

### Models

#### Page Model (`server/models/Page.js`)
Each page is its own document in the `pages` collection:
| Field | Type | Description |
|-------|------|-------------|
| `board` | ObjectId (ref: Board) | Parent board reference |
| `name` | String | Display name (e.g., "Page 1") |
| `order` | Number | Position in the page list |
| `canvasData` | String | JSON-serialized Fabric.js canvas state |
| `thumbnail` | String | Base64 or URL snapshot |
| `createdAt` | Date | Immutable creation timestamp |
| `updatedAt` | Date | Auto-updated on save |

- Compound index on `{ board, order }` for efficient queries
- Pre-save hook auto-increments `order` for new pages
- Virtual `id` enabled via `toJSON({ virtuals: true })`

#### Board Model (`server/models/Board.js`)
| Field | Type | Description |
|-------|------|-------------|
| `pages` | [ObjectId] | References to Page documents |
| `currentPageId` | ObjectId | Last active page for this board |
| `canvasData` | String | Legacy field, `select: false` (hidden by default) |

### Controllers

#### Board Controller (`server/controllers/boardController.js`)
- **`createBoard`** — Creates board + initial "Page 1" document, links them
- **`getBoardById`** — Auto-migrates legacy boards via `migrateLegacyBoard()`, populates pages
- **`updateBoard`** — Updates `currentPageId` (validates page exists)
- **`deleteBoard`** — Cascades: deletes all Page documents via `Page.deleteMany()`

#### Page Controller (`server/controllers/pageController.js`)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/:boardId/pages` | GET | List pages (excludes canvasData for performance) |
| `/:boardId/pages/:pageId` | GET | Get single page with full canvasData |
| `/:boardId/pages` | POST | Create new page |
| `/:boardId/pages/reorder` | PATCH | Reorder pages (literal path, before `:pageId`) |
| `/:boardId/pages/:pageId` | PATCH | Update page metadata |
| `/:boardId/pages/:pageId/canvas` | PATCH | Optimized canvas-only save (atomic `findOneAndUpdate`) |
| `/:boardId/pages/:pageId` | DELETE | Delete page (prevents deleting last page) |
| `/:boardId/pages/:pageId/duplicate` | POST | Clone page with "(Copy)" suffix |

### Route Order (`server/routes/page.js`)
**Critical:** The `/reorder` literal path is defined BEFORE `/:pageId` parameterized routes to prevent Express from matching `reorder` as a pageId.

## Frontend

### Types (`client/src/features/board/types/types.ts`)
```ts
interface Page {
  _id: string;    // MongoDB ObjectId string
  id: string;     // Alias (Mongoose virtual)
  name: string;
  canvasData: string;
  thumbnail?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}
```

### useBoard Hook (`client/src/features/board/hooks/useBoard.ts`)

#### ID Normalization
All backend responses are normalized via `normalizePage()` which maps `_id → id` to ensure both fields are always available.

#### Page Management Functions
| Function | API Call | Description |
|----------|----------|-------------|
| `handleAddPage()` | `POST /board/:boardId/pages` | Creates page on server, then switches to it |
| `handleSwitchPage(pageId)` | `PATCH .../canvas` + `PATCH /board/:id` | Saves current page, loads target, updates server's currentPageId |
| `handleDeletePage(pageId)` | `DELETE /board/:boardId/pages/:pageId` | Deletes from server, switches if deleting active page |
| `handleRenamePage(pageId, name)` | `PATCH /board/:boardId/pages/:pageId` | Updates name on server |
| `handleDuplicatePage(pageId)` | `POST .../pages/:pageId/duplicate` | Server clones the page |
| `handleReorderPages(newPageIds)` | `PATCH .../pages/reorder` | Optimistic local reorder + server sync |

#### Save Strategy
- **Per-canvas-change:** Debounced at 2s → `PATCH /board/:boardId/pages/:pageId/canvas`
- **With thumbnail:** Debounced at 5s → same endpoint with `thumbnail` field
- **On page switch:** Immediate save of current page before loading new one
- **Guest users:** Save to Redux/localStorage only (no multi-page)

#### Board Load Logic
1. `GET /board/:id` (returns board with populated pages)
2. Normalize all pages via `normalizePage()`
3. Restore `currentPageId` from server (or fallback to first page)
4. Load active page's `canvasData` into Fabric.js canvas

### useFabricCanvas Hook (`client/src/features/board/hooks/useFabricCanvas.ts`)
- `pageHistoriesRef`: `Map<pageId, {history, index}>` — per-page undo/redo stacks
- `saveCurrentPageState()`: Snapshots current canvas into history before switch
- `loadPageState(canvasData)`: Loads canvas from JSON without resetting history map
- History limited to 50 states per page

### Board Component (`client/src/features/board/components/Board.tsx`)

#### Page Navigation Bar (bottom center)
- Numbered page buttons
- Per-page context menu (hover to reveal ⋮ button):
  - **Rename** — opens modal dialog
  - **Duplicate** — clones page
  - **Move Left/Right** — reorders
  - **Delete** — with guard (can't delete last page)
- "+" button to add new page
- Loading overlay during page switches

#### Hamburger Menu
- Pages submenu listing all pages by name
- Active page indicator (●)
- Add Page option

## User Experience

### For Authenticated Users
1. Open board → see page navigation at bottom center
2. Click numbered buttons to switch pages
3. Hover over a page button → context menu appears (⋮)
4. Right-click context menu: Rename, Duplicate, Move, Delete
5. Click "+" to add a new blank page
6. Each page independently saves canvas + undo/redo history
7. On reload, the last active page is restored

### For Guest Users
- Multi-page feature is completely hidden
- Single canvas experience (as before)
- Canvas saved to localStorage

## Files Modified
- `server/models/Page.js` — added `toJSON` virtuals
- `server/models/Board.js` — unchanged
- `server/controllers/boardController.js` — unchanged
- `server/controllers/pageController.js` — unchanged
- `server/routes/page.js` — fixed route ordering
- `client/src/features/board/types/types.ts` — added `_id`, `order` fields
- `client/src/features/board/hooks/useBoard.ts` — full rewrite for API sync
- `client/src/features/board/hooks/useFabricCanvas.ts` — unchanged
- `client/src/features/board/components/Board.tsx` — full UI for page management
- `client/src/features/board/components/FabricCanvas.tsx` — unchanged
