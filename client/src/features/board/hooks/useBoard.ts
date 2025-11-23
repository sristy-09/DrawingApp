import { useEffect, useRef, useState } from "react";
import type { FabricCanvasRef, Tool } from "../types/types";
import { useParams } from "react-router";
import axios from "axios";

export function useBoard() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<FabricCanvasRef>(null);
  const [color, setColor] = useState<string>("#000000");
  const [brushWidth, setBrushWidth] = useState<number>(3);
  const [tool, setTool] = useState<Tool>("brush");

  const clearCanvas = () => canvasRef.current?.clear();

  const saveBoard = async () => {
    if (!canvasRef.current) return;

    const json = canvasRef.current.saveToJson();

    try {
      const res = await axios.patch(`http://localhost:3000/board/${id}`, {
        canvasData: json,
      });

      console.log("Saved:", res.data);
    } catch (error) {
      console.error("Error saving board:", error);
    }
  };

  useEffect(() => {
    const loadBoard = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/board/${id}`);
        const json = res.data.canvasData;

        if (json && canvasRef.current?.loadFromJson) {
          canvasRef.current.loadFromJson(json);
        }
      } catch (error) {
        console.error("Error loading board:", error);
      }
    };
    loadBoard();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const lastModified = canvas.getCanvas()?.lastModified;

      // No modification → don't save
      if (!lastModified || Date.now() - lastModified < 3000) {
        return;
      }

      const json = canvas.saveToJson();

      try {
        await axios.put(`http://localhost:5000/api/boards/${id}`, {
          canvasData: json,
        });

        console.log("Auto-saved");
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
  };
}
