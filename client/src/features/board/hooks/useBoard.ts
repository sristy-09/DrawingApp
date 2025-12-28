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

  const clearCanvas = () => canvasRef.current?.clear();

  // FIXED: Better thumbnail generation without html2canvas
  const generateFullPageThumbnail = async (): Promise<string> => {
    console.log("🎨 Starting thumbnail generation...");

    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) {
      console.error("❌ Canvas not found");
      return "";
    }

    try {
      // Store current state
      const currentZoom = canvas.getZoom();
      const currentVPT: TMat2D = canvas.viewportTransform
        ? ([...canvas.viewportTransform] as TMat2D)
        : [1, 0, 0, 1, 0, 0];
      console.log("📊 Current zoom:", currentZoom);

      // Reset for thumbnail
      canvas.setZoom(1);
      canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
      canvas.renderAll();

      // Wait for render
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create thumbnail with toolbar simulation
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width = 400;
      thumbCanvas.height = 300;
      const ctx = thumbCanvas.getContext("2d");

      if (!ctx) {
        console.error("❌ Could not get context");
        return "";
      }

      // Draw white background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 400, 300);

      // Draw toolbar
      ctx.fillStyle = "#F3F4F6";
      ctx.fillRect(0, 0, 400, 50);
      ctx.fillStyle = "#1F2937";
      ctx.font = "bold 16px Arial";
      ctx.fillText("Drawing Board", 15, 30);

      // Get canvas image
      const canvasDataURL = canvas.toDataURL({
        multiplier: 1,
        format: "png",
        quality: 0.8,
      });
      console.log(
        "📸 Canvas data URL generated, length:",
        canvasDataURL.length
      );

      // Load and draw canvas image
      const img = new Image();
      const result = await new Promise<string>((resolve) => {
        img.onload = () => {
          const scale = Math.min(
            400 / canvas.getWidth(),
            250 / canvas.getHeight()
          );
          const w = canvas.getWidth() * scale;
          const h = canvas.getHeight() * scale;
          const x = (400 - w) / 2;
          const y = 50 + (250 - h) / 2;

          ctx.drawImage(img, x, y, w, h);
          const thumbnail = thumbCanvas.toDataURL("image/png", 0.8);
          console.log("✅ Thumbnail created, length:", thumbnail.length);
          resolve(thumbnail);
        };
        img.onerror = () => {
          console.error("❌ Image load failed");
          resolve("");
        };
        img.src = canvasDataURL;
      });

      // Restore state
      canvas.setZoom(currentZoom);
      if (currentVPT) canvas.viewportTransform = currentVPT;
      canvas.renderAll();

      return result;
    } catch (error) {
      console.error("❌ Thumbnail error:", error);
      return "";
    }
  };

  const saveBoard = async (includeThumbnail = false) => {
    if (!canvasRef.current) return;

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

    setSaveStatus("saving");

    try {
      const payload: { canvasData: string; thumbnail?: string } = {
        canvasData: json,
      };

      // Add thumbnail if requested
      if (includeThumbnail) {
        const thumbnail = await generateFullPageThumbnail();

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

      console.log("Saved:", res.data);
    } catch (error) {
      console.error("Error saving board:", error);
      setSaveStatus("idle");
    }
  };

  // Track if canvas has actually changed
  const hasChangedRef = useRef(false);

  // Create debounced save function using lodash
  const debouncedSave = useCallback(
    debounce(() => {
      if (hasChangedRef.current) {
        saveBoard(false);
      }
    }, 2000),
    [id]
  );

  // Debounced thumbnail generation (5 seconds)
  const debouncedThumbnailSave = useCallback(
    debounce(() => {
      if (hasChangedRef.current) {
        console.log("⏰ 5 seconds elapsed - saving with thumbnail");
        saveBoard(true); // Save with thumbnail
        hasChangedRef.current = false; // Reset after thumbnail save
      } else {
        console.log("⏭️ No changes detected - skipping thumbnail generation");
      }
    }, 5000),
    [id]
  );

  const handleCanvasChange = () => {
    console.log("🎨 Canvas changed");
    hasChangedRef.current = true; // Mark that changes have been made
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

  // Debounced Auto-save with lodash
  useEffect(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;

    canvas.on("object:modified", handleCanvasChange);
    canvas.on("object:added", handleCanvasChange);
    canvas.on("path:created", handleCanvasChange);
    canvas.on("object:removed", handleCanvasChange);

    return () => {
      debouncedSave.cancel();
      debouncedThumbnailSave.cancel();
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
