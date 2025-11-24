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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasInstance = useRef<fabric.Canvas | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const lastPosXRef = useRef<number>(0);
  const lastPosYRef = useRef<number>(0);

  // -----------------------------
  // ZOOM FUNCTIONS
  // -----------------------------
  const zoomIn = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    const currentZoom = canvas.getZoom();
    const newZoom = Math.min(currentZoom * 1.1, 5); // Max 5x zoom
    canvas.setZoom(newZoom);
    canvas.renderAll();
  }, []);

  const zoomOut = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    const currentZoom = canvas.getZoom();
    const newZoom = Math.max(currentZoom / 1.1, 0.1); // Min 0.1x zoom
    canvas.setZoom(newZoom);
    canvas.renderAll();
  }, []);

  const resetZoom = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    canvas.setZoom(1);
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    canvas.renderAll();
  }, []);

  const getZoom = useCallback(() => {
    const canvas = canvasInstance.current;
    return canvas ? canvas.getZoom() : 1;
  }, []);

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

      // Reset panning
      isPanningRef.current = false;

      canvas.isDrawingMode = _tool === "brush" || _tool === "eraser";
      canvas.selection = _tool === "select";

      if (_tool === "pan") {
        canvas.defaultCursor = "grab";
      } else if (_tool === "brush" || _tool === "eraser") {
        canvas.defaultCursor = "crosshair";
      } else {
        canvas.defaultCursor = "default";
      }

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

      // Configure brush for drawing or erasing
      if (_tool === "eraser") {
        canvas.freeDrawingBrush.color = "#FFFFFF"; // White for eraser
        canvas.freeDrawingBrush.width = _width * 2; // Eraser is wider
      } else {
        canvas.freeDrawingBrush.color = _color;
        canvas.freeDrawingBrush.width = _width;
      }

      // Discard active selection when switching away from select tool
      if (_tool !== "select") {
        canvas.discardActiveObject();
      }

      canvas.renderAll();

      // Remove previous listeners
      canvas.off("mouse:down");
      canvas.off("mouse:move");
      canvas.off("mouse:up");
      canvas.off("path:created");

      // Handle brush and eraser
      if (_tool === "brush" || _tool === "eraser") {
        canvas.on("path:created", (e) => {
          if (e.path) {
            e.path.selectable = false;
            e.path.evented = false;

            // For eraser, set globalCompositeOperation to erase
            if (_tool === "eraser") {
              e.path.globalCompositeOperation = "destination-out";
            }
          }
        });
      }

      // Handle pan tool
      if (_tool === "pan") {
        canvas.on("mouse:down", (e) => {
          const evt = e.e as MouseEvent | PointerEvent;
          if (evt.altKey || _tool === "pan") {
            isPanningRef.current = true;
            canvas.defaultCursor = "grabbing";
            canvas.selection = false;
            lastPosXRef.current = evt.clientX;
            lastPosYRef.current = evt.clientY;
          }
        });

        canvas.on("mouse:move", (e) => {
          const evt = e.e as MouseEvent | PointerEvent;
          if (isPanningRef.current && canvas.viewportTransform) {
            const vpt = canvas.viewportTransform;
            vpt[4] += evt.clientX - lastPosXRef.current;
            vpt[5] += evt.clientY - lastPosYRef.current;
            canvas.requestRenderAll();
            lastPosXRef.current = evt.clientX;
            lastPosYRef.current = evt.clientY;
          }
        });

        canvas.on("mouse:up", () => {
          isPanningRef.current = false;
          canvas.defaultCursor = "grab";
        });
      }

      // Handle shape drawing tools
      if (
        _tool !== "brush" &&
        _tool !== "eraser" &&
        _tool !== "select" &&
        _tool !== "pan"
      ) {
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
            shape.set({
              selectable: false,
              evented: false,
              hasControls: false,
              hasBorders: false,
            });
            shape.setCoords();
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
      backgroundColor: "#FFFFFF",
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

    // Mouse wheel zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      let zoom = fab.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 5) zoom = 5;
      if (zoom < 0.1) zoom = 0.1;

      fab.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), zoom);
      fab.renderAll();
    };

    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("resize", resize);
      el.removeEventListener("wheel", handleWheel);
      fab.dispose();
      canvasInstance.current = null;
    };
  }, []);

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
    zoomIn,
    zoomOut,
    resetZoom,
    getZoom,
  };
}
