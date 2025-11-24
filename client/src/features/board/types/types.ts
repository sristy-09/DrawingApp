import * as fabric from "fabric";

export type Tool = "select" | "brush" | "rect" | "circle" | "line";
export type SaveStatus = "idle" | "saving" | "saved";

export interface Board {
  _id: string;
  title: string;
  description?: string;
  canvasData?: string;
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
}

export interface FabricCanvasProps {
  color: string;
  brushWidth: number;
  tool: Tool;
  loadJson?: string;
}

export interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  onClear: () => void;
  onSave?: () => void; // Manual save
}
