import { useEffect, useRef, useState, useCallback } from "react";
import type { FabricCanvasRef, Tool } from "../types/types";
import { useParams } from "react-router";
import axios from "axios";
import { debounce } from "lodash";
import type { TMat2D } from "fabric";

export function useBoard() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<FabricCanvasRef>(null);
  const [color, setColor] = useState<string>("#000000");
  const [brushWidth, setBrushWidth] = useState<number>(3);
  const [tool, setTool] = useState<Tool>("brush");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [zoom, setZoom] = useState<number>(1);

  const lastSavedDataRef = useRef<string>("");
  const isDrawingRef = useRef<boolean>(false); // Track if user is actively drawing
  const isSavingRef = useRef<boolean>(false); // Track if save is in progress

  const clearCanvas = () => canvasRef.current?.clear();

  // Simple thumbnail generation without toolbar
  const generateThumbnail = async (): Promise<string> => {
    console.log("🎨 Starting thumbnail generation...");

    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) {
      console.error("❌ Canvas not found");
      return "";
    }

    // Don't generate thumbnail while user is drawing
    if (isDrawingRef.current) {
      console.log("⏭️ Skipping thumbnail - user is drawing");
      return "";
    }

    try {
      // Store current state
      const currentZoom = canvas.getZoom();
      const currentVPT: TMat2D = canvas.viewportTransform
        ? ([...canvas.viewportTransform] as TMat2D)
        : [1, 0, 0, 1, 0, 0];

      // Reset for thumbnail
      canvas.setZoom(1);
      canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
      canvas.renderAll();

      // Wait for render
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Generate thumbnail directly from canvas
      const thumbnail = canvas.toDataURL({
        format: "png",
        quality: 0.8,
        multiplier: Math.min(400 / canvas.getWidth(), 300 / canvas.getHeight()),
      });

      console.log("✅ Thumbnail created, length:", thumbnail.length);

      // Restore state
      canvas.setZoom(currentZoom);
      if (currentVPT) canvas.viewportTransform = currentVPT;
      canvas.renderAll();

      return thumbnail;
    } catch (error) {
      console.error("❌ Thumbnail error:", error);
      return "";
    }
  };

  const saveBoard = async (includeThumbnail = false) => {
    if (!canvasRef.current || isSavingRef.current) return;

    // Don't save while user is actively drawing
    if (isDrawingRef.current) {
      console.log("⏭️ Skipping save - user is drawing");
      return;
    }

    const json = canvasRef.current.saveToJson();

    // Don't save if nothing changed (unless we're adding a thumbnail)
    if (!includeThumbnail && json === lastSavedDataRef.current) {
      console.log("⏭️ Skipping save - no changes");
      return;
    }

    console.log(
      includeThumbnail
        ? "💾 Saving with thumbnail..."
        : "💾 Saving without thumbnail..."
    );

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      const payload: { canvasData: string; thumbnail?: string } = {
        canvasData: json,
      };

      // Add thumbnail if requested
      if (includeThumbnail) {
        const thumbnail = await generateThumbnail();

        if (thumbnail) {
          payload.thumbnail = thumbnail;
          console.log("✅ Thumbnail added to payload");
        } else {
          console.log("⚠️ Thumbnail generation failed, skipping thumbnail");
        }
      }

      const res = await axios.patch(
        `http://localhost:3000/board/${id}`,
        payload
      );

      lastSavedDataRef.current = json;
      setSaveStatus("saved");

      setTimeout(() => setSaveStatus("idle"), 2000);

      console.log("✅ Saved successfully");
    } catch (error) {
      console.error("❌ Error saving board:", error);
      setSaveStatus("idle");
    } finally {
      isSavingRef.current = false;
    }
  };

  // Track if canvas has actually changed
  const hasChangedRef = useRef(false);

  // Create debounced save function - only save when not drawing
  const debouncedSave = useCallback(
    debounce(() => {
      if (hasChangedRef.current && !isDrawingRef.current) {
        saveBoard(false);
      }
    }, 2000),
    [id]
  );

  // Debounced thumbnail generation (5 seconds) - only when not drawing
  const debouncedThumbnailSave = useCallback(
    debounce(() => {
      if (hasChangedRef.current && !isDrawingRef.current) {
        console.log("⏰ 5 seconds elapsed - saving with thumbnail");
        saveBoard(true);
        hasChangedRef.current = false;
      } else {
        console.log("⏭️ No changes or user drawing - skipping thumbnail");
      }
    }, 5000),
    [id]
  );

  const handleCanvasChange = () => {
    console.log("🎨 Canvas changed");
    hasChangedRef.current = true;
    debouncedSave();
    debouncedThumbnailSave();
  };

  useEffect(() => {
    const loadBoard = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/board/${id}`);
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
      console.log("🖊️ Drawing started");
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;
      console.log("🖊️ Drawing ended");

      // Trigger save after drawing completes
      if (hasChangedRef.current) {
        debouncedSave();
        debouncedThumbnailSave();
      }
    };

    // Track drawing state
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:up", handleMouseUp);

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
      canvas.off("object:modified", handleCanvasChange);
      canvas.off("object:added", handleCanvasChange);
      canvas.off("path:created", handleCanvasChange);
      canvas.off("object:removed", handleCanvasChange);
    };
  }, [debouncedSave, debouncedThumbnailSave]);

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

  return {
    canvasRef,
    color,
    brushWidth,
    tool,
    setTool,
    setColor,
    setBrushWidth,
    clearCanvas,
    saveBoard: () => saveBoard(false),
    saveStatus,
    zoom,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
  };
}
