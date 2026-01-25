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
  onToolChange?: (tool: Tool) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasInstance = useRef<fabric.Canvas | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const lastPosXRef = useRef<number>(0);
  const lastPosYRef = useRef<number>(0);

  const activeToolHandlersRef = useRef<{
    down?: any;
    move?: any;
    up?: any;
    extra?: any;
  }>({});

  const currentShapeRef = useRef<fabric.Object | null>(null);
  const isDrawingShapeRef = useRef<boolean>(false);
  const eraserCircleRef = useRef<fabric.Circle | null>(null);
  const isErasingRef = useRef<boolean>(false);

  // UNDO/REDO STATE
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef<boolean>(false);

  const saveHistory = useCallback(() => {
    const canvas = canvasInstance.current;

    console.log("💾 saveHistory called", {
      hasCanvas: !!canvas,
      isUndoRedo: isUndoRedoRef.current,
      currentIndex: historyIndexRef.current,
      historyLength: historyRef.current.length,
    });

    if (!canvas) {
      console.log("❌ No canvas, skipping");
      return;
    }

    if (isUndoRedoRef.current) {
      console.log("❌ Undo/redo or loading in progress, skipping");
      return;
    }

    try {
      const json = canvas.toJSON();
      if (json.objects) {
        json.objects = json.objects.filter(
          (obj: any) => !obj.excludeFromExport,
        );
      }
      const state = JSON.stringify(json);

      const lastState = historyRef.current[historyIndexRef.current];
      if (lastState === state) {
        console.log("⏭️ State unchanged, skipping");
        return;
      }

      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(
          0,
          historyIndexRef.current + 1,
        );
      }

      historyRef.current.push(state);
      historyIndexRef.current++;

      console.log("✅ History saved!", {
        index: historyIndexRef.current,
        total: historyRef.current.length,
        objectCount: json.objects?.length || 0,
      });

      if (historyRef.current.length > 50) {
        historyRef.current.shift();
        historyIndexRef.current--;
      }
    } catch (error) {
      console.error("❌ Error saving history:", error);
    }
  }, []);

  const undo = useCallback(() => {
    const canvas = canvasInstance.current;

    console.log("⏪ Undo called", {
      hasCanvas: !!canvas,
      currentIndex: historyIndexRef.current,
      historyLength: historyRef.current.length,
    });

    if (!canvas) {
      console.log("❌ No canvas");
      return;
    }

    if (historyIndexRef.current <= 0) {
      console.log("❌ No more undo states (at beginning)");
      return;
    }

    console.log(
      "⏪ Undoing from index",
      historyIndexRef.current,
      "to",
      historyIndexRef.current - 1,
    );

    isUndoRedoRef.current = true;
    historyIndexRef.current--;

    const state = historyRef.current[historyIndexRef.current];

    try {
      const stateObj = JSON.parse(state);
      console.log(
        "📥 Loading state with",
        stateObj.objects?.length || 0,
        "objects",
      );

      canvas.loadFromJSON(stateObj, () => {
        canvas.renderOnAddRemove = true;
        canvas.requestRenderAll();
        console.log("✅ Undo complete");

        isUndoRedoRef.current = false;
      });
    } catch (error) {
      console.error("❌ Undo error:", error);
      isUndoRedoRef.current = false;
      historyIndexRef.current++;
    }
  }, []);

  const redo = useCallback(() => {
    const canvas = canvasInstance.current;

    console.log("⏩ Redo called", {
      hasCanvas: !!canvas,
      currentIndex: historyIndexRef.current,
      historyLength: historyRef.current.length,
    });

    if (!canvas) {
      console.log("❌ No canvas");
      return;
    }

    if (historyIndexRef.current >= historyRef.current.length - 1) {
      console.log("❌ No more redo states (at end)");
      return;
    }

    console.log(
      "⏩ Redoing from index",
      historyIndexRef.current,
      "to",
      historyIndexRef.current + 1,
    );

    isUndoRedoRef.current = true;
    historyIndexRef.current++;

    const state = historyRef.current[historyIndexRef.current];

    try {
      const stateObj = JSON.parse(state);
      console.log(
        "📥 Loading state with",
        stateObj.objects?.length || 0,
        "objects",
      );

      canvas.loadFromJSON(stateObj, () => {
        canvas.renderOnAddRemove = true;
        canvas.requestRenderAll();
        console.log("✅ Redo complete");

        isUndoRedoRef.current = false;
      });
    } catch (error) {
      console.error("❌ Redo error:", error);
      isUndoRedoRef.current = false;
      historyIndexRef.current--;
    }
  }, []);

  function cleanupToolHandlers(canvas: fabric.Canvas) {
    const h = activeToolHandlersRef.current;

    if (h.down) canvas.off("mouse:down", h.down);
    if (h.move) canvas.off("mouse:move", h.move);
    if (h.up) canvas.off("mouse:up", h.up);
    if (h.extra) canvas.off("path:created", h.extra);
    activeToolHandlersRef.current = {};

    if (currentShapeRef.current) {
      canvas.remove(currentShapeRef.current);
      currentShapeRef.current = null;
    }
    isDrawingShapeRef.current = false;

    if (eraserCircleRef.current) {
      canvas.remove(eraserCircleRef.current);
      eraserCircleRef.current = null;
    }
    isErasingRef.current = false;
  }

  const zoomIn = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    const currentZoom = canvas.getZoom();
    const newZoom = Math.min(currentZoom * 1.1, 5);
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
    const newZoom = Math.max(currentZoom / 1.1, 0.1);
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

  const getThumbnail = useCallback((width = 300, height = 200) => {
    const canvas = canvasInstance.current;
    if (!canvas) return "";

    if (isDrawingShapeRef.current || isErasingRef.current) {
      return "";
    }

    try {
      const currentZoom = canvas.getZoom();
      const currentVPT = canvas.viewportTransform?.slice() as
        | fabric.TMat2D
        | undefined;

      canvas.setZoom(1);
      canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
      canvas.renderAll();

      const dataURL = canvas.toDataURL({
        format: "png",
        quality: 0.8,
        multiplier: Math.min(
          width / canvas.getWidth(),
          height / canvas.getHeight(),
        ),
      });

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

  const clear = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    canvas.clear();

    historyRef.current = [];
    historyIndexRef.current = -1;

    setTimeout(() => {
      console.log("Saving cleared canvas state");
      saveHistory();
    }, 100);
  }, [saveHistory]);

  const getCanvas = useCallback(() => {
    return canvasInstance.current;
  }, []);

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

      cleanupToolHandlers(canvas);

      canvas.forEachObject((obj) => {
        if (obj.opacity !== 1) {
          obj.set({ opacity: 1 });
        }
      });

      canvas.contextTop?.clearRect(0, 0, canvas.width!, canvas.height!);
      isPanningRef.current = false;

      canvas.isDrawingMode = _tool === "brush";
      canvas.selection = _tool === "select";

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

      const shouldMakeSelectable =
        _tool === "select" ||
        _tool === "rect" ||
        _tool === "circle" ||
        _tool === "line";

      canvas.forEachObject((obj) => {
        obj.selectable = shouldMakeSelectable;
        obj.evented = shouldMakeSelectable;
        obj.hoverCursor = shouldMakeSelectable ? "move" : "default";
        obj.hasControls = _tool === "select";
        obj.hasBorders = shouldMakeSelectable;
      });

      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }

      if (_tool === "brush") {
        canvas.freeDrawingBrush.color = _color;
        canvas.freeDrawingBrush.width = _width;
      }

      if (_tool !== "select" && !shouldMakeSelectable) {
        canvas.discardActiveObject();
      }

      canvas.renderAll();

      // BRUSH TOOL
      if (_tool === "brush") {
        const onPathCreated = (e: any) => {
          if (!e.path) return;

          e.path.set({
            strokeUniform: true,
            objectCaching: false,
            selectable: true,
            evented: true,
          });

          e.path.setCoords();
          canvas.requestRenderAll();

          setTimeout(() => {
            saveHistory();
          }, 50);
        };

        canvas.on("path:created", onPathCreated);
        activeToolHandlersRef.current.extra = onPathCreated;
      }

      // ERASER TOOL
      if (_tool === "eraser") {
        let touchedObjects = new Set<fabric.Object>();
        const eraserRadius = _width * 3;

        const checkObjectIntersection = (
          obj: fabric.Object,
          cursorX: number,
          cursorY: number,
        ): boolean => {
          if (obj === eraserCircleRef.current) return false;
          if ((obj as any).excludeFromExport) return false;

          const objBounds = obj.getBoundingRect();
          const distance = Math.sqrt(
            Math.pow(cursorX - (objBounds.left + objBounds.width / 2), 2) +
              Math.pow(cursorY - (objBounds.top + objBounds.height / 2), 2),
          );

          return (
            distance <
            eraserRadius + Math.max(objBounds.width, objBounds.height) / 2
          );
        };

        const onDown = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
          isErasingRef.current = true;
          touchedObjects.clear();
          const pointer = canvas.getPointer(e.e);

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

          eraserCircleRef.current.set({
            left: pointer.x,
            top: pointer.y,
          });

          canvas.forEachObject((obj) => {
            if (obj === eraserCircleRef.current) return;
            if ((obj as any).excludeFromExport) return;

            const isIntersecting = checkObjectIntersection(
              obj,
              pointer.x,
              pointer.y,
            );

            if (isIntersecting) {
              if (!touchedObjects.has(obj)) {
                touchedObjects.add(obj);
                obj.set({ opacity: 0.3 });
              }
            } else {
              if (touchedObjects.has(obj)) {
                obj.set({ opacity: 1 });
                touchedObjects.delete(obj);
              }
            }
          });

          canvas.renderAll();
        };

        const onUp = () => {
          if (!isErasingRef.current) return;

          isErasingRef.current = false;

          touchedObjects.forEach((obj) => {
            obj.set({ opacity: 1 });
            canvas.remove(obj);
          });
          touchedObjects.clear();

          if (eraserCircleRef.current) {
            canvas.remove(eraserCircleRef.current);
            eraserCircleRef.current = null;
          }

          canvas.discardActiveObject();
          canvas.requestRenderAll();

          setTimeout(() => {
            saveHistory();
          }, 50);
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

      // PAN TOOL
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

      // SHAPE TOOLS
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

            shape.set({
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
            });
            shape.setCoords();

            canvas.discardActiveObject();
            canvas.setActiveObject(shape);
            canvas.renderAll();

            if (onToolChange) {
              setTimeout(() => {
                onToolChange("select");
              }, 0);
            }
          }
          isDrawingShapeRef.current = false;
          currentShapeRef.current = null;
          canvas?.requestRenderAll();

          setTimeout(() => {
            saveHistory();
          }, 50);
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
    [onToolChange, saveHistory],
  );

  const saveToJson = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return "";

    const canvasJSON = canvas.toJSON();

    if (canvasJSON.objects) {
      canvasJSON.objects = canvasJSON.objects.filter(
        (obj: any) => !obj.excludeFromExport,
      );
    }

    return JSON.stringify(canvasJSON);
  }, []);

  const loadFromJson = useCallback((json: string) => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    console.log("Loading canvas from JSON");

    canvas.renderOnAddRemove = false;

    canvas.loadFromJSON(json, () => {
      canvas.renderOnAddRemove = true;
      canvas.renderAll();
      console.log("Canvas loaded from JSON");

      historyRef.current = [];
      historyIndexRef.current = -1;

      try {
        const canvasJSON = canvas.toJSON();
        if (canvasJSON.objects) {
          canvasJSON.objects = canvasJSON.objects.filter(
            (obj: any) => !obj.excludeFromExport,
          );
        }
        const state = JSON.stringify(canvasJSON);

        historyRef.current.push(state);
        historyIndexRef.current = 0;

        console.log("💾 Initial state saved to history", {
          index: historyIndexRef.current,
          total: historyRef.current.length,
          objectCount: canvasJSON.objects?.length || 0,
        });
      } catch (error) {
        console.error("❌ Error saving initial state:", error);
      }
    });
  }, []);

  // MOUNT / UNMOUNT - REMOVE brushWidth from dependencies!
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

    fab.on("mouse:wheel", (opt) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY;
      let zoom = fab.getZoom();

      let newZoom: number;
      if (delta < 0) {
        newZoom = zoom * 1.05;
      } else {
        newZoom = zoom * 0.95;
      }

      newZoom = Math.max(0.1, Math.min(5, newZoom));
      fab.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), newZoom);

      if (fab.isDrawingMode && fab.freeDrawingBrush) {
        fab.freeDrawingBrush.width = brushWidth;
      }

      fab.renderAll();
    });

    console.log("Canvas initialized");
    console.log("Setting up history event listeners");

    const handleHistoryEvent = (e?: any) => {
      console.log("Canvas event triggered:", e?.type || "unknown");

      setTimeout(() => {
        if (!isUndoRedoRef.current) {
          console.log("Calling saveHistory from event");
          saveHistory();
        } else {
          console.log("Skipping saveHistory (undo/redo/loading in progress)");
        }
      }, 50);
    };

    fab.on("object:added", handleHistoryEvent);
    fab.on("object:modified", handleHistoryEvent);
    fab.on("object:removed", handleHistoryEvent);

    console.log("✅ History listeners attached to canvas");

    setTimeout(() => {
      console.log("💾 Saving initial canvas state");
      saveHistory();
    }, 300);

    return () => {
      console.log("🧹 Disposing canvas");
      fab.off("object:added", handleHistoryEvent);
      fab.off("object:modified", handleHistoryEvent);
      fab.off("object:removed", handleHistoryEvent);
      fab.off("path:created", handleHistoryEvent);
      window.removeEventListener("resize", resize);
      fab.off("mouse:wheel");
      cleanupToolHandlers(fab);
      fab.dispose();
      canvasInstance.current = null;
    };
  }, [saveHistory]); // REMOVED brushWidth from here!

  // UPDATE SETTINGS WHEN PROPS CHANGE
  useEffect(() => {
    applySettings({ color, brushWidth, tool });
  }, [color, brushWidth, tool, applySettings]);

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
