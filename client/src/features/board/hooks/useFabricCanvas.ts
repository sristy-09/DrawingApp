import { useRef, useEffect, useCallback } from "react";
import * as fabric from "fabric";
import type { Tool } from "../types/types";

export function useFabricCanvas({
  color,
  brushWidth,
  tool,
}: {
  color: string;
  brushWidth: number;
  tool: Tool;
}) {
  // const lastUpdatedRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasInstance = useRef<fabric.Canvas | null>(null);

  // -----------------------------
  // APPLY SETTINGS
  // -----------------------------
  const applySettings = useCallback(
    ({
      color: _color,
      brushWidth: _width,
      tool: _tool,
    }: {
      color: string;
      brushWidth: number;
      tool: Tool;
    }) => {
      const canvas = canvasInstance.current;
      if (!canvas) return;

      canvas.isDrawingMode = _tool === "brush";
      canvas.selection = _tool === "select";
      canvas.defaultCursor = _tool === "brush" ? "crosshair" : "default";

      // Make all objects selectable or not based on tool
      canvas.forEachObject((obj) => {
        obj.selectable = _tool === "select";
        obj.evented = _tool === "select";
        obj.hoverCursor = _tool === "select" ? "move" : "default";
        obj.hasControls = _tool === "select";
        obj.hasBorders = _tool === "select";
      });

      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }

      canvas.freeDrawingBrush.color = _color;
      canvas.freeDrawingBrush.width = _width;

      // Discard active selection when switching away from select tool
      if (_tool !== "select") {
        canvas.discardActiveObject();
      }

      canvas.renderAll();

      // Remove previous listeners
      canvas.off("mouse:down");
      canvas.off("mouse:move");
      canvas.off("mouse:up");

      // Also listen to path created event to make brush strokes follow the same pattern
      canvas.off("path:created");

      // When a brush stroke is completed, set its initial selectability
      if (_tool === "brush") {
        canvas.on("path:created", (e) => {
          if (e.path) {
            e.path.selectable = false;
            e.path.evented = false;
          }
        });
      }

      if (_tool !== "brush" && _tool !== "select") {
        let shape: fabric.Object | null = null;
        let isDrawing = false;
        let startX = 0;
        let startY = 0;

        const onDown = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
          const canvas = canvasInstance.current;
          if (!canvas) return;

          isDrawing = true;
          const pointer = canvas.getPointer(e.e);
          startX = pointer.x;
          startY = pointer.y;

          const opts = {
            left: startX,
            top: startY,
            fill: "transparent",
            stroke: _color,
            strokeWidth: _width,
            selectable: false,
            evented: false,
            hoverCursor: "default",
            hasControls: false,
            hasBorders: false,
          };

          switch (_tool) {
            case "rect":
              shape = new fabric.Rect({ ...opts, width: 0, height: 0 });
              break;
            case "circle":
              shape = new fabric.Circle({ ...opts, radius: 0 });
              break;
            case "line":
              shape = new fabric.Line([startX, startY, startX, startY], opts);
              break;
          }

          if (shape) {
            canvas.add(shape);
            canvas.requestRenderAll();
          }
        };

        const onMove = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
          if (!shape || !isDrawing) return;
          const canvas = canvasInstance.current;
          if (!canvas) return;

          const pointer = canvas.getPointer(e.e);
          const x = pointer.x;
          const y = pointer.y;

          switch (_tool) {
            case "rect": {
              const width = Math.abs(x - startX);
              const height = Math.abs(y - startY);
              const left = x < startX ? x : startX;
              const top = y < startY ? y : startY;
              shape.set({ left, top, width, height });
              break;
            }
            case "circle": {
              const dx = x - startX;
              const dy = y - startY;
              const radius = Math.sqrt(dx * dx + dy * dy);
              (shape as fabric.Circle).set({ radius });
              break;
            }
            case "line":
              (shape as fabric.Line).set({ x2: x, y2: y });
              break;
          }

          canvas.requestRenderAll();
        };

        const onUp = () => {
          if (shape && isDrawing) {
            // Explicitly set all properties to ensure they stick
            shape.set({
              selectable: false,
              evented: false,
              hasControls: false,
              hasBorders: false,
            });
            shape.setCoords(); // Update coordinates
          }
          isDrawing = false;
          shape = null;
          canvas?.requestRenderAll();
        };

        canvas.on("mouse:down", onDown);
        canvas.on("mouse:move", onMove);
        canvas.on("mouse:up", onUp);
      }
    },
    []
  );

  // -----------------------------
  // CLEAR CANVAS
  // -----------------------------
  const clear = useCallback(() => {
    canvasInstance.current?.clear();
  }, []);

  // -----------------------------
  // GET CANVAS INSTANCE
  // -----------------------------
  const getCanvas = useCallback(() => {
    return canvasInstance.current;
  }, []);

  // -----------------------------
  // MOUNT / UNMOUNT (ONLY ONCE)
  // -----------------------------
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const fab = new fabric.Canvas(el, {
      isDrawingMode: tool === "brush",
      selection: tool === "select",
    });

    canvasInstance.current = fab;

    const resize = () => {
      el.width = window.innerWidth;
      el.height = window.innerHeight;
      fab.setWidth(window.innerWidth);
      fab.setHeight(window.innerHeight);
      fab.renderAll();
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      fab.dispose();
      canvasInstance.current = null;
    };
  }, []); // Empty dependency array - only run once on mount

  // -----------------------------
  // UPDATE SETTINGS WHEN PROPS CHANGE
  // -----------------------------
  useEffect(() => {
    applySettings({ color, brushWidth, tool });
  }, [color, brushWidth, tool, applySettings]);

  // save canvas to JSON
  const saveToJson = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return "";
    return JSON.stringify(canvas.toJSON());
  }, []);

  // Load canvas from JSON
  const loadFromJson = useCallback((json: string) => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    canvas.loadFromJSON(json, () => {
      canvas.renderAll();
    });
  }, []);

  return {
    canvasRef,
    canvasInstance,
    clear,
    getCanvas,
    applySettings,
    loadFromJson,
    saveToJson,
  };
}
