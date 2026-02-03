import { useEffect, useRef, useState, useCallback } from "react";
import type { FabricCanvasRef, Tool } from "../types/types";
import { useParams } from "react-router";
import axios from "axios";
import { debounce } from "lodash";

export function useBoard() {
  const API_URL = import.meta.env.VITE_API_URL;
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<FabricCanvasRef>(null);
  const [color, setColor] = useState<string>("#000000");
  const [brushWidth, setBrushWidth] = useState<number>(3);
  const [tool, setTool] = useState<Tool>("brush");
  const [activeDrawingTool, setActiveDrawingTool] = useState<Tool>("brush"); // Track which drawing tool is active
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [zoom, setZoom] = useState<number>(1);

  // Track if canvas has actually changed
  const hasChangedRef = useRef(false);

  const lastSavedDataRef = useRef<string>("");
  const isDrawingRef = useRef<boolean>(false); // Track if user is actively drawing
  const isSavingRef = useRef<boolean>(false); // Track if save is in progress

  // Track the currently selected object
  const selectedObjectRef = useRef<any>(null);

  // Tools that have customization options
  const toolsWithOptions: Tool[] = ["brush", "rect", "circle", "line", "text"];

  // Brush width presets
  const brushWidths = [1, 2, 3, 5, 8, 12];

  const [showToolOptions, setShowToolOptions] = useState(false);
  const toolOptionsRef = useRef<HTMLDivElement>(null);

  const handleClear = () => {
    clearCanvas();
  };

  const handleSave = () => {
    saveBoard();
  };

  const handleToolChange = (newTool: Tool) => {
    // Store previous tool
    setTool(newTool);

    // If it's a drawing tool, remember it as the active drawing tool
    if (toolsWithOptions.includes(newTool)) {
      setActiveDrawingTool(newTool);
      setShowToolOptions(true);
    } else if (newTool === "select") {
      // When switching to select, keep the popup open if we have an active drawing tool
      if (toolsWithOptions.includes(activeDrawingTool)) {
        setShowToolOptions(true);
      } else {
        setShowToolOptions(false);
      }
    } else {
      // For eraser, pan, or other tools
      setShowToolOptions(false);
    }
  };

  // Modified color setter to updated selected object
  const handleColorChange = (newColor: string) => {
    setColor(newColor);

    // Update the selected object if it exists
    if (selectedObjectRef.current) {
      const canvas = canvasRef.current?.getCanvas();
      if (canvas) {
        // For text objects, update fill color; for other objects, update stroke
        if (selectedObjectRef.current.type === "textbox") {
          selectedObjectRef.current.set({
            fill: newColor,
          });
        } else {
          selectedObjectRef.current.set({
            stroke: newColor,
          });
        }
        selectedObjectRef.current.setCoords();
        canvas.fire("object:modified", { target: selectedObjectRef.current });
        canvas.renderAll();

        // Wait longer and only save to history, not to backend
        setTimeout(() => {
          // Only mark as changed, don't trigger backend save immediately
          hasChangedRef.current = true;
        }, 100);
      }
    }
  };

  // Modified brush width setter to update selected object
  const handleBrushWidthChange = (newWidth: number) => {
    setBrushWidth(newWidth);

    // Update the selected object if it exists
    if (selectedObjectRef.current) {
      const canvas = canvasRef.current?.getCanvas();
      if (canvas) {
        selectedObjectRef.current.set({
          strokeWidth: newWidth,
        });
        selectedObjectRef.current.setCoords(); // IMPORTANT: Update coordinates
        canvas.fire("object:modified", { target: selectedObjectRef.current });
        canvas.renderAll();

        // Wait longer and only save to history, not to backend
        setTimeout(() => {
          // Only mark as changed, don't trigger backend save immediately
          hasChangedRef.current = true;
        }, 100);
      }
    }
  };

  const clearCanvas = () => {
    selectedObjectRef.current = null;
    canvasRef.current?.clear();
  };

  const saveBoard = async (includeThumbnail = false) => {
    if (!canvasRef.current || isSavingRef.current) return;

    // Don't save while user is actively drawing
    if (isDrawingRef.current) {
      return;
    }

    const json = canvasRef.current.saveToJson();

    // Don't save if nothing changed (unless we're adding a thumbnail)
    if (!includeThumbnail && json === lastSavedDataRef.current) {
      return;
    }

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      const payload: { canvasData: string; thumbnail?: string } = {
        canvasData: json,
      };

      // Add thumbnail if requested
      if (includeThumbnail && !isDrawingRef.current) {
        const thumbnail = canvasRef.current.getThumbnail?.(400, 300);

        if (thumbnail) {
          payload.thumbnail = thumbnail;
        }
      }

      await axios.patch(`${API_URL}/board/${id}`, payload);

      lastSavedDataRef.current = json;
      setSaveStatus("saved");

      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("❌ Error saving board:", error);
      setSaveStatus("idle");
    } finally {
      isSavingRef.current = false;
    }
  };

  // Create debounced save function - only save when not drawing
  const debouncedSave = useCallback(
    debounce(() => {
      if (hasChangedRef.current && !isDrawingRef.current) {
        saveBoard(false);
      }
    }, 2000),
    [id],
  );

  // Debounced thumbnail generation (5 seconds) - only when not drawing
  const debouncedThumbnailSave = useCallback(
    debounce(() => {
      if (hasChangedRef.current && !isDrawingRef.current) {
        saveBoard(true);
        hasChangedRef.current = false;
      }
    }, 5000),
    [id],
  );

  const handleCanvasChange = () => {
    hasChangedRef.current = true;
    debouncedSave();
    debouncedThumbnailSave();
  };

  useEffect(() => {
    const loadBoard = async () => {
      try {
        const res = await axios.get(`${API_URL}/board/${id}`);
        const json = res.data.canvasData;

        if (json && canvasRef.current?.loadFromJson) {
          canvasRef.current.loadFromJson(json);
          lastSavedDataRef.current = json;

          setTimeout(() => {
            canvasRef.current?.applySettings?.({ color, brushWidth, tool });
          }, 50);
        }
      } catch (error) {
        console.error("Error loading board:", error);
      }
    };
    loadBoard();
  }, [id]);

  // Track drawing state to prevent saves during drawing
  useEffect(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;

    const handleMouseDown = () => {
      isDrawingRef.current = true;
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;

      // Trigger save after drawing completes
      if (hasChangedRef.current) {
        debouncedSave();
        debouncedThumbnailSave();
      }
    };

    // Track when an object is selected
    const handleSelectionCreated = (e: any) => {
      if (e.selected && e.selected[0]) {
        const obj = e.selected[0];
        selectedObjectRef.current = obj;

        // Update UI to show current object's properties
        if (obj.type === "textbox") {
          // For text objects, use fill color
          if (obj.fill) {
            setColor(obj.fill);
          }
        } else {
          // For other objects, use stroke color
          if (obj.stroke) {
            setColor(obj.stroke);
          }
        }
        if (obj.strokeWidth) {
          setBrushWidth(obj.strokeWidth);
        }

        // Determine which tool this object belongs to and show its popup
        let objectTool: Tool | null = null;
        if (obj.type === "rect") {
          objectTool = "rect";
        } else if (obj.type === "circle") {
          objectTool = "circle";
        } else if (obj.type === "line") {
          objectTool = "line";
        } else if (obj.type === "path") {
          objectTool = "brush";
        } else if (obj.type === "textbox") {
          objectTool = "text";
        }

        if (objectTool && toolsWithOptions.includes(objectTool)) {
          setActiveDrawingTool(objectTool);
          setShowToolOptions(true);
        }
      }
    };

    // Track when selection is updated (when switching between objects)
    const handleSelectionUpdated = (e: any) => {
      if (e.selected && e.selected[0]) {
        const obj = e.selected[0];
        selectedObjectRef.current = obj;

        // Update UI to show current object's properties
        if (obj.type === "textbox") {
          // For text objects, use fill color
          if (obj.fill) {
            setColor(obj.fill);
          }
        } else {
          // For other objects, use stroke color
          if (obj.stroke) {
            setColor(obj.stroke);
          }
        }
        if (obj.strokeWidth) {
          setBrushWidth(obj.strokeWidth);
        }

        // Determine which tool this object belongs to and show its popup
        let objectTool: Tool | null = null;
        if (obj.type === "rect") {
          objectTool = "rect";
        } else if (obj.type === "circle") {
          objectTool = "circle";
        } else if (obj.type === "line") {
          objectTool = "line";
        } else if (obj.type === "path") {
          objectTool = "brush";
        } else if (obj.type === "textbox") {
          objectTool = "text";
        }

        if (objectTool && toolsWithOptions.includes(objectTool)) {
          setActiveDrawingTool(objectTool);
          setShowToolOptions(true);
        }
      }
    };

    // Track when selection is cleared
    const handleSelectionCleared = () => {
      selectedObjectRef.current = null;
      // Don't close popup when selection is cleared
      // User might want to draw more shapes
    };

    // Track drawing state
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:up", handleMouseUp);

    // Track selection changes
    canvas.on("selection:created", handleSelectionCreated);
    canvas.on("selection:updated", handleSelectionUpdated);
    canvas.on("selection:cleared", handleSelectionCleared);

    // Track canvas changes
    canvas.on("object:modified", handleCanvasChange);
    canvas.on("object:added", handleCanvasChange);
    canvas.on("path:created", handleCanvasChange);
    canvas.on("object:removed", handleCanvasChange);

    return () => {
      debouncedSave.cancel();
      debouncedThumbnailSave.cancel();
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("selection:created", handleSelectionCreated);
      canvas.off("selection:updated", handleSelectionUpdated);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.off("object:modified", handleCanvasChange);
      canvas.off("object:added", handleCanvasChange);
      canvas.off("path:created", handleCanvasChange);
      canvas.off("object:removed", handleCanvasChange);
    };
  }, [debouncedSave, debouncedThumbnailSave, activeDrawingTool]);

  // When color/brushWidth/tool change, apply new settings
  useEffect(() => {
    if (!canvasRef.current || !canvasRef.current.applySettings) return;
    canvasRef.current.applySettings({ color, brushWidth, tool });
  }, [color, brushWidth, tool]);

  // Update zoom state
  useEffect(() => {
    const interval = setInterval(() => {
      if (canvasRef.current) {
        setZoom(canvasRef.current.getZoom());
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("board-force-light");
    return () => {
      document.documentElement.classList.remove("board-force-light");
    };
  }, []);

  const handleZoomIn = () => canvasRef.current?.zoomIn();
  const handleZoomOut = () => canvasRef.current?.zoomOut();
  const handleResetZoom = () => canvasRef.current?.resetZoom();

  const handleUndo = () => canvasRef.current?.undo();
  const handleRedo = () => canvasRef.current?.redo();

  return {
    canvasRef,
    color,
    brushWidth,
    brushWidths,
    showToolOptions,
    setShowToolOptions,
    toolOptionsRef,
    tool, // Current active tool (for toolbar highlight)
    activeDrawingTool, // Last drawing tool (for popup content)
    setTool,
    setColor: handleColorChange,
    setBrushWidth: handleBrushWidthChange,
    clearCanvas,
    saveBoard: () => saveBoard(false),
    saveStatus,
    zoom,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleUndo,
    handleRedo,
    handleClear,
    handleSave,
    handleToolChange,
    toolsWithOptions,
  };
}
