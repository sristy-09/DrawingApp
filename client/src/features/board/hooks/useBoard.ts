import { useCallback, useEffect, useRef, useState } from "react";
import type { FabricCanvasRef, Tool } from "../types/types";
import { useParams } from "react-router";
import axios from "axios";
import { debounce } from "lodash";

export function useBoard() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<FabricCanvasRef>(null);
  const [color, setColor] = useState<string>("#000000");
  const [brushWidth, setBrushWidth] = useState<number>(3);
  const [tool, setTool] = useState<Tool>("brush");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  const lastSavedDataRef = useRef<string>("");

  const clearCanvas = () => canvasRef.current?.clear();

  const saveBoard = async () => {
    if (!canvasRef.current) return;

    const json = canvasRef.current.saveToJson();

    // Don't save if nothing changed
    if (json === lastSavedDataRef.current) return;

    setSaveStatus("saving");

    try {
      const res = await axios.patch(`http://localhost:3000/board/${id}`, {
        canvasData: json,
      });

      lastSavedDataRef.current = json;
      setSaveStatus("saved");

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus("idle"), 2000);

      console.log("Saved:", res.data);
    } catch (error) {
      console.error("Error saving board:", error);
      setSaveStatus("idle");
    }
  };

  // Create debounced save function using lodash
  const debouncedSave = useCallback(
    debounce(() => {
      saveBoard();
    }, 2000),
    [id]
  );

  useEffect(() => {
    const loadBoard = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/board/${id}`);
        const json = res.data.canvasData;

        if (json && canvasRef.current?.loadFromJson) {
          canvasRef.current.loadFromJson(json);
          lastSavedDataRef.current = json;

          // Apply settings after a brief delay to ensure canvas is ready
          setTimeout(() => {
            canvasRef.current?.applySettings?.({ color, brushWidth, tool });
          }, 50);
        }
      } catch (error) {
        console.error("Error loading board:", error);
      }
    };
    loadBoard();
  }, [id]); // Only depend on ID to avoid reloading on every prop change

  // Debounced Auto-save with lodash
  useEffect(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;

    const handleCanvasChange = () => {
      debouncedSave();
    };

    canvas.on("object:modified", handleCanvasChange);
    canvas.on("object:added", handleCanvasChange);
    canvas.on("path:created", handleCanvasChange);
    canvas.on("object:removed", handleCanvasChange);

    return () => {
      debouncedSave.cancel(); // Cancel pending debounced calls
      canvas.off("object:modified", handleCanvasChange);
      canvas.off("object:added", handleCanvasChange);
      canvas.off("path:created", handleCanvasChange);
      canvas.off("object:removed", handleCanvasChange);
    };
  }, [debouncedSave]);

  // When color/brushWidth/tool change, ask the canvas instance to apply new settings.
  useEffect(() => {
    if (!canvasRef.current || !canvasRef.current.applySettings) return;
    canvasRef.current.applySettings({ color, brushWidth, tool });
  }, [color, brushWidth, tool]);

  return {
    canvasRef,
    color,
    brushWidth,
    tool,
    setTool,
    setColor,
    setBrushWidth,
    clearCanvas,
    saveBoard,
    saveStatus,
  };
}
