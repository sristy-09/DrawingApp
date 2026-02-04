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
  const isEditingTextRef = useRef<boolean>(false); // Track if user is actively editing text
  const isTypingRef = useRef<boolean>(false); // Track if user is actively typing
  const typingTimeoutRef = useRef<number | null>(null); // Track typing timeout
  const isInteractingRef = useRef<boolean>(false); // Track if user is actively interacting (moving, resizing, etc.)
  const isSavingRef = useRef<boolean>(false); // Track if save is in progress
  const lastInteractionTimeRef = useRef<number>(0); // Track last interaction time

  // Track the currently selected object
  const selectedObjectRef = useRef<any>(null);

  // Tools that have customization options
  const toolsWithOptions: Tool[] = ["brush", "rect", "circle", "line", "text"];

  // Brush width presets
  const brushWidths = [1, 2, 3, 5, 8, 12];

  const [showToolOptions, setShowToolOptions] = useState(false);
  const toolOptionsRef = useRef<HTMLDivElement>(null);

  // Helper function to check if user is actively interacting
  const isUserActivelyInteracting = () => {
    return isDrawingRef.current || isEditingTextRef.current || isInteractingRef.current || isTypingRef.current;
  };

  // Helper function to update interaction time
  const updateInteractionTime = () => {
    lastInteractionTimeRef.current = Date.now();
  };

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

  const saveBoard = async (includeThumbnail = false, forceImmediate = false) => {
    if (!canvasRef.current || isSavingRef.current) return;

    // Skip interaction checks if this is a forced immediate save (like text exit)
    if (!forceImmediate) {
      // Don't save while user is actively interacting with the canvas
      if (isUserActivelyInteracting()) {
        return;
      }

      // Additional check: don't save if user was recently interacting (within 500ms)
      const timeSinceLastInteraction = Date.now() - lastInteractionTimeRef.current;
      if (timeSinceLastInteraction < 500) {
        return;
      }
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

      // Add thumbnail if requested and not interacting
      if (includeThumbnail && !isUserActivelyInteracting()) {
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

  // Create debounced save function - only save when not actively interacting
  const debouncedSave = useCallback(
    debounce(() => {
      if (hasChangedRef.current && !isUserActivelyInteracting()) {
        // Additional check for recent interactions
        const timeSinceLastInteraction = Date.now() - lastInteractionTimeRef.current;
        if (timeSinceLastInteraction >= 1000) { // Wait 1 second after last interaction
          saveBoard(false);
        }
      }
    }, 3000), // Increased debounce time to 3 seconds
    [id],
  );

  // Debounced thumbnail generation (8 seconds) - only when not actively interacting
  const debouncedThumbnailSave = useCallback(
    debounce(() => {
      if (hasChangedRef.current && !isUserActivelyInteracting()) {
        const timeSinceLastInteraction = Date.now() - lastInteractionTimeRef.current;
        if (timeSinceLastInteraction >= 2000) { // Wait 2 seconds after last interaction for thumbnail
          saveBoard(true);
          hasChangedRef.current = false;
        }
      }
    }, 8000), // Increased debounce time to 8 seconds
    [id],
  );

  const handleCanvasChange = () => {
    hasChangedRef.current = true;
    updateInteractionTime(); // Update interaction time on any canvas change
    
    // Don't trigger saves if user is actively typing
    if (isTypingRef.current) {
      return; // Skip triggering saves during typing
    }
    
    // Only trigger immediate saves if not actively interacting
    if (!isUserActivelyInteracting()) {
      debouncedSave();
      debouncedThumbnailSave();
    }
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
      isInteractingRef.current = true;
      updateInteractionTime();
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;
      
      // Keep interaction flag for a brief moment to prevent immediate saves
      setTimeout(() => {
        isInteractingRef.current = false;
        updateInteractionTime();
      }, 100);

      // Trigger save after drawing completes, but not immediately
      if (hasChangedRef.current) {
        setTimeout(() => {
          if (!isUserActivelyInteracting()) {
            debouncedSave();
            debouncedThumbnailSave();
          }
        }, 500);
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

    // Track text editing state
    const handleTextEditingEntered = () => {
      isEditingTextRef.current = true;
      isTypingRef.current = false; // Reset typing state when entering edit mode
      updateInteractionTime();
    };

    const handleTextChanged = () => {
      // User is actively typing
      isTypingRef.current = true;
      updateInteractionTime();
      hasChangedRef.current = true;
      
      // Clear any existing typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set typing flag to false after 300ms of no typing (user stopped typing)
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        typingTimeoutRef.current = null;
      }, 300);
      
      // DO NOT trigger any saves during typing - only mark as changed
      // Save will happen only when user exits text editing
    };

    const handleTextEditingExited = () => {
      isEditingTextRef.current = false;
      isTypingRef.current = false;
      updateInteractionTime();
      
      // Clear any pending typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      // IMPORTANT: Save to database when user exits text editing
      // Use setTimeout to avoid blocking the text exit event
      // Use forceImmediate=true to bypass interaction checks
      if (hasChangedRef.current) {
        setTimeout(() => {
          saveBoard(false, true); // Force immediate save, bypass checks
        }, 100); // Small delay to ensure text exit is complete
      }
    };

    // Track object interactions (moving, scaling, rotating)
    const handleObjectMoving = () => {
      isInteractingRef.current = true;
      updateInteractionTime();
    };

    const handleObjectScaling = () => {
      isInteractingRef.current = true;
      updateInteractionTime();
    };

    const handleObjectRotating = () => {
      isInteractingRef.current = true;
      updateInteractionTime();
    };

    const handleObjectModified = () => {
      isInteractingRef.current = false;
      updateInteractionTime();
      
      // Don't trigger saves if user is actively typing
      if (!isTypingRef.current) {
        handleCanvasChange();
      } else {
        // Just mark as changed, but don't trigger saves
        hasChangedRef.current = true;
      }
    };

    // Track drawing state
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:up", handleMouseUp);

    // Track text editing state
    canvas.on("text:editing:entered", handleTextEditingEntered);
    canvas.on("text:changed", handleTextChanged);
    canvas.on("text:editing:exited", handleTextEditingExited);

    // Track object interactions
    canvas.on("object:moving", handleObjectMoving);
    canvas.on("object:scaling", handleObjectScaling);
    canvas.on("object:rotating", handleObjectRotating);
    canvas.on("object:modified", handleObjectModified);

    // Track selection changes
    canvas.on("selection:created", handleSelectionCreated);
    canvas.on("selection:updated", handleSelectionUpdated);
    canvas.on("selection:cleared", handleSelectionCleared);

    // Track canvas changes (but not object:modified since we handle it separately)
    canvas.on("object:added", handleCanvasChange);
    canvas.on("path:created", handleCanvasChange);
    canvas.on("object:removed", handleCanvasChange);

    return () => {
      debouncedSave.cancel();
      debouncedThumbnailSave.cancel();
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("text:editing:entered", handleTextEditingEntered);
      canvas.off("text:changed", handleTextChanged);
      canvas.off("text:editing:exited", handleTextEditingExited);
      canvas.off("object:moving", handleObjectMoving);
      canvas.off("object:scaling", handleObjectScaling);
      canvas.off("object:rotating", handleObjectRotating);
      canvas.off("object:modified", handleObjectModified);
      canvas.off("selection:created", handleSelectionCreated);
      canvas.off("selection:updated", handleSelectionUpdated);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.off("object:added", handleCanvasChange);
      canvas.off("path:created", handleCanvasChange);
      canvas.off("object:removed", handleCanvasChange);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.off("object:modified", handleCanvasChange);
      canvas.off("object:added", handleCanvasChange);
      canvas.off("path:created", handleCanvasChange);
      canvas.off("object:removed", handleCanvasChange);
    };
  }, [debouncedSave, debouncedThumbnailSave, activeDrawingTool]);

  // Periodic save mechanism - ensures saves happen even if user stops interacting
  useEffect(() => {
    const periodicSave = setInterval(() => {
      if (hasChangedRef.current && !isUserActivelyInteracting()) {
        const timeSinceLastInteraction = Date.now() - lastInteractionTimeRef.current;
        if (timeSinceLastInteraction >= 5000) { // 5 seconds of inactivity
          saveBoard(false);
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(periodicSave);
  }, [saveBoard]);

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
