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

export interface Board {
  _id: string;
  title: string;
  description?: string;
  canvasData?: string;
  thumbnail?: string;
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
  loadFromJson: (json: string) => void; //  Load canvas data
  saveToJson: () => string; // Serialize to JSON
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  getZoom: () => number;
  getThumbnail: (width?: number, height?: number) => string;
}

export interface FabricCanvasProps {
  color: string;
  brushWidth: number;
  tool: Tool;
  loadJson?: string;
  onToolChange?: (tool: Tool) => void;
}

export interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
}

export type DockPosition = "top" | "right" | "bottom" | "left";
