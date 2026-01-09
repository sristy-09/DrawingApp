import { useRef, useEffect, useCallback } from "react";
import * as fabric from "fabric";
import type { Tool } from "../types/types";

export function useFabricCanvas({
  color,
  brushWidth,
  tool,
  onToolChange,
}: {
  color: string;
  brushWidth: number;
  tool: Tool;
  onToolChange?: (tool: Tool) => void; // Optional callback to update tool state
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasInstance = useRef<fabric.Canvas | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const lastPosXRef = useRef<number>(0);
  const lastPosYRef = useRef<number>(0);

  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef<boolean>(false);

  const activeToolHandlersRef = useRef<{
    down?: any;
    move?: any;
    up?: any;
    extra?: any;
  }>({});

  // Track current shape being drawn and eraser state
  const currentShapeRef = useRef<fabric.Object | null>(null);
  const isDrawingShapeRef = useRef<boolean>(false);
  const eraserCircleRef = useRef<fabric.Circle | null>(null);
  const isErasingRef = useRef<boolean>(false);

  function cleanupToolHandlers(canvas: fabric.Canvas) {
    const h = activeToolHandlersRef.current;

    if (h.down) canvas.off("mouse:down", h.down);
    if (h.move) canvas.off("mouse:move", h.move);
    if (h.up) canvas.off("mouse:up", h.up);
    if (h.extra) canvas.off("path:created", h.extra);
    activeToolHandlersRef.current = {};

    // Clean up any leftover shape
    if (currentShapeRef.current) {
      canvas.remove(currentShapeRef.current);
      currentShapeRef.current = null;
    }
    isDrawingShapeRef.current = false;

    // Cleanup any leftover eraser circle
    if (eraserCircleRef.current) {
      canvas.remove(eraserCircleRef.current);
      eraserCircleRef.current = null;
    }
    isErasingRef.current = false;
  }

  // -----------------------------
  // ZOOM FUNCTIONS
  // -----------------------------
  const zoomIn = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    const currentZoom = canvas.getZoom();
    const newZoom = Math.min(currentZoom * 1.1, 5); // Max 5x zoom
    canvas.setZoom(newZoom);

    if (canvas?.isDrawingMode && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = brushWidth;
    }

    canvas.renderAll();
  }, [brushWidth]);

  const zoomOut = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    const currentZoom = canvas.getZoom();
    const newZoom = Math.max(currentZoom / 1.1, 0.1); // Min 0.1x zoom
    canvas.setZoom(newZoom);

    if (canvas?.isDrawingMode && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = brushWidth;
    }

    canvas.renderAll();
  }, [brushWidth]);

  const resetZoom = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    canvas.setZoom(1);
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];

    if (canvas?.isDrawingMode && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = brushWidth;
    }

    canvas.renderAll();
  }, [brushWidth]);

  const getZoom = useCallback(() => {
    const canvas = canvasInstance.current;
    return canvas ? canvas.getZoom() : 1;
  }, []);

  // -----------------------------
  // UNDO AND REDO FUNCTIONS
  // -----------------------------
  const undo = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas || historyIndexRef.current <= 0) return;

    isUndoRedoRef.current = true;
    historyIndexRef.current--;

    const state = historyRef.current[historyIndexRef.current];
    canvas.loadFromJSON(state, () => {
      canvas.renderAll();
      isUndoRedoRef.current = false;
    });
  }, []);

  const redo = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1)
      return;

    isUndoRedoRef.current = true;
    historyIndexRef.current++;

    const state = historyRef.current[historyIndexRef.current];
    canvas.loadFromJSON(state, () => {
      canvas.renderAll();
      isUndoRedoRef.current = false;
    });
  }, []);

  const saveHistory = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas || isUndoRedoRef.current) return;

    const json = canvas.toJSON();
    const state = JSON.stringify(json);

    // Remove any redo states
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1
    );

    // Add new state
    historyRef.current.push(state);
    historyIndexRef.current++;

    // Limit history to 50 states
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, []);

  // Update the canvas event listeners to save history
  useEffect(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    const handleHistoryEvent = () => {
      if (!isUndoRedoRef.current) {
        saveHistory();
      }
    };

    canvas.on("object:added", handleHistoryEvent);
    canvas.on("object:modified", handleHistoryEvent);
    canvas.on("object:removed", handleHistoryEvent);
    canvas.on("path:created", handleHistoryEvent);

    // save initial state
    saveHistory();

    return () => {
      canvas.off("object:added", handleHistoryEvent);
      canvas.off("object:modified", handleHistoryEvent);
      canvas.off("object:removed", handleHistoryEvent);
      canvas.off("path:created", handleHistoryEvent);
    };
  }, [saveHistory]);

  // -----------------------------
  // THUMBNAIL GENERATION
  // -----------------------------
  const getThumbnail = useCallback((width = 300, height = 200) => {
    const canvas = canvasInstance.current;
    if (!canvas) return "";

    // Don't generate thumbnail while user is drawing
    if (isDrawingShapeRef.current || isErasingRef.current) {
      return "";
    }

    try {
      // Store current zoom and viewport
      const currentZoom = canvas.getZoom();
      const currentVPT = canvas.viewportTransform?.slice() as
        | fabric.TMat2D
        | undefined;

      // Reset zoom and viewport for thumbnail
      canvas.setZoom(1);
      canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
      canvas.renderAll();

      // Generate thumbnail as data URL
      const dataURL = canvas.toDataURL({
        format: "png",
        quality: 0.8,
        multiplier: Math.min(
          width / canvas.getWidth(),
          height / canvas.getHeight()
        ),
      });

      // Restore zoom and viewport
      canvas.setZoom(currentZoom);
      if (currentVPT) {
        canvas.viewportTransform = currentVPT;
      }
      canvas.renderAll();

      return dataURL;
    } catch (error) {
      console.error("❌ Thumbnail generation error:", error);
      return "";
    }
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

      /* ----------------------------------
       CLEANUP PREVIOUS TOOL
      ---------------------------------- */
      cleanupToolHandlers(canvas);

      // Restore any faded objects(eraser safety)
      canvas.forEachObject((obj) => {
        if (obj.opacity !== 1) {
          obj.set({ opacity: 1 });
        }
      });

      // Clear top context (eraser cursor)
      canvas.contextTop?.clearRect(0, 0, canvas.width!, canvas.height!);

      // Reset panning
      isPanningRef.current = false;

      /* ----------------------------------
       BASE CANVAS STATE
      ---------------------------------- */
      canvas.isDrawingMode = _tool === "brush";
      canvas.selection = _tool === "select";

      /* ----------------------------------
       CURSORS
      ---------------------------------- */
      // Set cursor based on tool - FIXED: Always show crosshair for drawing tools
      if (_tool === "pan") {
        canvas.defaultCursor = "grab";
        canvas.hoverCursor = "grab";
      } else if (_tool === "brush" || _tool === "eraser") {
        canvas.defaultCursor = "crosshair";
        canvas.hoverCursor = "crosshair";
      } else if (_tool === "rect" || _tool === "circle" || _tool === "line") {
        canvas.defaultCursor = "crosshair";
        canvas.hoverCursor = "crosshair";
      } else if (_tool === "select") {
        canvas.defaultCursor = "default";
        canvas.hoverCursor = "move";
      } else {
        canvas.defaultCursor = "default";
        canvas.hoverCursor = "default";
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

      // Configure brush for drawing
      if (_tool === "brush") {
        canvas.freeDrawingBrush.color = _color;
        canvas.freeDrawingBrush.width = _width;
      }

      // Discard active selection when switching away from select tool
      if (_tool !== "select") {
        canvas.discardActiveObject();
      }

      canvas.renderAll();

      /* ----------------------------------
       BRUSH TOOL
      ---------------------------------- */
      // Handle brush drawing
      if (_tool === "brush") {
        const onPathCreated = (e: any) => {
          if (!e.path) return;

          e.path.set({
            strokeUniform: true, // it tells fabric "Do NOT scale the stroke based on viewport zoom"
            objectCaching: false,
            selectable: true,
            evented: false,
          });

          e.path.setCoords();
          canvas.requestRenderAll();
        };

        canvas.on("path:created", onPathCreated);
        activeToolHandlersRef.current.extra = onPathCreated;
      }

      /* ----------------------------------
       ERASER TOOL
      ---------------------------------- */
      // Handle eraser - drag to select and preview deletion
      if (_tool === "eraser") {
        let touchedObjects = new Set<fabric.Object>();
        const eraserRadius = _width * 3; // Eraser size

        const checkObjectIntersection = (
          obj: fabric.Object,
          cursorX: number,
          cursorY: number
        ): boolean => {
          if (obj === eraserCircleRef.current) return false;

          // Ignore objects marked as excludeFromExport (temp objects)
          if ((obj as any).excludeFromExport) return false;

          const objBounds = obj.getBoundingRect();
          const distance = Math.sqrt(
            Math.pow(cursorX - (objBounds.left + objBounds.width / 2), 2) +
              Math.pow(cursorY - (objBounds.top + objBounds.height / 2), 2)
          );

          // Check if cursor circle intersects with object
          return (
            distance <
            eraserRadius + Math.max(objBounds.width, objBounds.height) / 2
          );
        };

        const onDown = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
          isErasingRef.current = true;
          touchedObjects.clear();
          const pointer = canvas.getPointer(e.e);

          // Create eraser circle cursor
          eraserCircleRef.current = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: eraserRadius,
            fill: "transparent",
            stroke: "#999999",
            strokeWidth: 2,
            strokeDasharray: [5, 5],
            selectable: false,
            evented: false,
            excludeFromExport: true,
            objectCaching: false,
            opacity: 0.6,
            originX: "center",
            originY: "center",
          });
          canvas.add(eraserCircleRef.current);
          canvas.renderAll();
        };

        const onMove = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
          if (!isErasingRef.current || !eraserCircleRef.current) return;

          const pointer = canvas.getPointer(e.e);

          // Move eraser circle with cursor
          eraserCircleRef.current.set({
            left: pointer.x,
            top: pointer.y,
          });

          // Check intersection with all objects
          canvas.forEachObject((obj) => {
            if (obj === eraserCircleRef.current) return;
            if ((obj as any).excludeFromExport) return;

            const isIntersecting = checkObjectIntersection(
              obj,
              pointer.x,
              pointer.y
            );

            if (isIntersecting) {
              if (!touchedObjects.has(obj)) {
                touchedObjects.add(obj);
                obj.set({ opacity: 0.3 }); // Preview deletion
              }
            } else {
              if (touchedObjects.has(obj)) {
                obj.set({ opacity: 1 }); // Restore opacity
                touchedObjects.delete(obj);
              }
            }
          });

          canvas.renderAll();
        };

        const onUp = () => {
          if (!isErasingRef.current) return;

          isErasingRef.current = false;

          // Delete all touched objects
          touchedObjects.forEach((obj) => {
            obj.set({ opacity: 1 });
            canvas.remove(obj);
          });
          touchedObjects.clear();

          // Remove the eraser circle
          if (eraserCircleRef.current) {
            canvas.remove(eraserCircleRef.current);
            eraserCircleRef.current = null;
          }

          canvas.discardActiveObject();
          canvas.requestRenderAll();
        };

        canvas.on("mouse:down", onDown);
        canvas.on("mouse:move", onMove);
        canvas.on("mouse:up", onUp);

        activeToolHandlersRef.current = {
          down: onDown,
          move: onMove,
          up: onUp,
        };
      }

      /* ----------------------------------
       PAN TOOL
      ---------------------------------- */
      // Handle pan tool
      if (_tool === "pan") {
        const onDown = (e: any) => {
          const evt = e.e as MouseEvent | PointerEvent;
          if (evt.altKey || _tool === "pan") {
            isPanningRef.current = true;
            canvas.defaultCursor = "grabbing";
            canvas.selection = false;
            lastPosXRef.current = evt.clientX;
            lastPosYRef.current = evt.clientY;
          }
        };

        const onMove = (e: any) => {
          const evt = e.e as MouseEvent | PointerEvent;
          if (isPanningRef.current && canvas.viewportTransform) {
            const vpt = canvas.viewportTransform;
            vpt[4] += evt.clientX - lastPosXRef.current;
            vpt[5] += evt.clientY - lastPosYRef.current;
            canvas.requestRenderAll();
            lastPosXRef.current = evt.clientX;
            lastPosYRef.current = evt.clientY;
          }
        };

        const onUp = () => {
          isPanningRef.current = false;
          canvas.defaultCursor = "grab";
        };

        canvas.on("mouse:down", onDown);
        canvas.on("mouse:move", onMove);
        canvas.on("mouse:up", onUp);

        activeToolHandlersRef.current = {
          down: onDown,
          move: onMove,
          up: onUp,
        };
      }

      /* ----------------------------------
       SHAPE TOOLS
      ---------------------------------- */
      // Handle shape drawing tools
      if (
        _tool !== "brush" &&
        _tool !== "eraser" &&
        _tool !== "select" &&
        _tool !== "pan"
      ) {
        const onDown = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
          const canvas = canvasInstance.current;
          if (!canvas) return;

          isDrawingShapeRef.current = true;
          const pointer = canvas.getPointer(e.e);
          const startX = pointer.x;
          const startY = pointer.y;

          const opts = {
            left: startX,
            top: startY,
            fill: "transparent",
            stroke: _color,
            strokeWidth: _width,
            selectable: true,
            evented: true,
            hoverCursor: "move",
            hasControls: true,
            hasBorders: true,
          };

          let shape: fabric.Object | null = null;

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
            currentShapeRef.current = shape;
            (shape as any)._startX = startX;
            (shape as any)._startY = startY;
            canvas.add(shape);
            canvas.requestRenderAll();
          }
        };

        const onMove = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
          if (!currentShapeRef.current || !isDrawingShapeRef.current) return;
          const canvas = canvasInstance.current;
          if (!canvas) return;

          const shape = currentShapeRef.current;
          const pointer = canvas.getPointer(e.e);
          const x = pointer.x;
          const y = pointer.y;
          const startX = (shape as any)._startX;
          const startY = (shape as any)._startY;

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
          if (currentShapeRef.current && isDrawingShapeRef.current) {
            const shape = currentShapeRef.current;

            // Make shape selectable and movable
            shape.set({
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
            });
            shape.setCoords();

            // Set the newly created shape as active object to show selection
            canvas.discardActiveObject();
            canvas.setActiveObject(shape);
            canvas.renderAll();

            // Auto-switch to select tool after drawing shape
            if (onToolChange) {
              setTimeout(() => {
                onToolChange("select");
              }, 0);
            }
          }
          isDrawingShapeRef.current = false;
          currentShapeRef.current = null;
          canvas?.requestRenderAll();
        };

        canvas.on("mouse:down", onDown);
        canvas.on("mouse:move", onMove);
        canvas.on("mouse:up", onUp);

        activeToolHandlersRef.current = {
          down: onDown,
          move: onMove,
          up: onUp,
        };
      }
    },
    [onToolChange]
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

    // Use Fabric.js built-in mouse:wheel event for zoom
    fab.on("mouse:wheel", (opt) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY;
      let zoom = fab.getZoom();

      // Apply zoom - scroll up (negative delta) = zoom in, scroll down (positive delta) = zoom out
      let newZoom: number;
      if (delta < 0) {
        newZoom = zoom * 1.05; // Zoom in
      } else {
        newZoom = zoom * 0.95; // Zoom out
      }

      // Clamp zoom between 0.1x and 5x
      newZoom = Math.max(0.1, Math.min(5, newZoom));

      // Zoom at cursor position
      fab.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), newZoom);

      if (fab.isDrawingMode && fab.freeDrawingBrush) {
        fab.freeDrawingBrush.width = brushWidth;
      }

      fab.renderAll();
    });

    return () => {
      window.removeEventListener("resize", resize);
      fab.off("mouse:wheel");
      cleanupToolHandlers(fab);
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

    // Get canvas JSON and filter out temporary objects
    const canvasJSON = canvas.toJSON();

    // Filter out objects marked as excludeFromExport
    if (canvasJSON.objects) {
      canvasJSON.objects = canvasJSON.objects.filter(
        (obj: any) => !obj.excludeFromExport
      );
    }

    return JSON.stringify(canvasJSON);
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
    getThumbnail,
    undo,
    redo,
  };
}
