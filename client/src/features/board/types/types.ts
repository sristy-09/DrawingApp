import * as fabric from "fabric";

export type Tool =
  | "select"
  | "brush"
  | "eraser"
  | "pan"
  | "rect"
  | "circle"
  | "line";
export type SaveStatus = "idle" | "saving" | "saved";

export interface Page {
  _id: string; // MongoDB ObjectId string from backend
  id: string; // Alias (Mongoose virtual or mapped from _id)
  name: string;
  canvasData: string;
  thumbnail?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Board {
  _id: string;
  title: string;
  description?: string;
  canvasData?: string;
  thumbnail?: string;
  pages?: Page[];
  currentPageId?: string;
  isPublic: boolean;
  owner: { username: string };
}

export interface FabricCanvasRef {
  clear: () => void;
  getCanvas: () => (fabric.Canvas & { lastModified?: number }) | null;
  applySettings: (settings: {
    color: string;
    brushWidth: number;
    tool: Tool;
  }) => void;
  loadFromJson: (json: string, targetPageId?: string) => void;
  saveToJson: () => string;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  getZoom: () => number;
  getThumbnail: (width?: number, height?: number) => string;
  undo: () => void;
  redo: () => void;
  saveCurrentPageState: () => void;
  loadPageState: (canvasData: string, targetPageId?: string) => void;
  clearPageHistory: (pageId: string) => void;
}

export interface FabricCanvasProps {
  color: string;
  brushWidth: number;
  tool: Tool;
  loadJson?: string;
  onToolChange?: (tool: Tool) => void;
  currentPageId?: string;
}

export interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  handleToolChange: (tool: Tool) => void;
  toolsWithOptions: Tool[];
  showToolOptions: boolean;
}

export type DockPosition = "top" | "right" | "bottom" | "left";
