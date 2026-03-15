import { useRef, useEffect, useCallback } from "react";
import * as fabric from "fabric";
import type { Tool } from "../types/types";

export function useFabricCanvas({
  color,
  brushWidth,
  tool,
  onToolChange,
  currentPageId,
}: {
  color: string;
  brushWidth: number;
  tool: Tool;
  onToolChange?: (tool: Tool) => void;
  currentPageId?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasInstance = useRef<fabric.Canvas | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const lastPosXRef = useRef<number>(0);
  const lastPosYRef = useRef<number>(0);
  const previousThemeRef = useRef<string | null>(null);

  const activeToolHandlersRef = useRef<{
    down?: any;
    move?: any;
    up?: any;
    extra?: any;
    textEntered?: any;
    textChanged?: any;
    textExited?: any;
    dblclick?: any;
  }>({});

  // Track current shape being drawn and eraser state
  const currentShapeRef = useRef<fabric.Object | null>(null);
  const isDrawingShapeRef = useRef<boolean>(false);
  const eraserCircleRef = useRef<fabric.Circle | null>(null);
  const isErasingRef = useRef<boolean>(false);

  // Text editing state
  const editingTextRef = useRef<fabric.Textbox | null>(null);
  const isEditingTextRef = useRef<boolean>(false);
  const textCursorPositionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  
  // UNDO/REDO STATE - Per-page history
  const pageHistoriesRef = useRef<
    Map<string, { history: string[]; index: number }>
  >(new Map());
  const isUndoRedoRef = useRef<boolean>(false);
  const isLoadingPageRef = useRef<boolean>(false); // Guard for page switching

  // 🔑 FIX: Keep a ref that always holds the LATEST currentPageId.
  // Updated synchronously during render (not in a useEffect) so it's always
  // current even inside callbacks that were created before this render.
  // This avoids stale-closure bugs where saveHistory/undo/redo write to the
  // wrong page's history stack after a page switch.
  const currentPageIdRef = useRef<string>(currentPageId || "default");
  const nextPageId = currentPageId || "default";
  if (currentPageIdRef.current !== nextPageId) {
    console.log(
      `📄 [useFabricCanvas] currentPageId updated: "${currentPageIdRef.current}" → "${nextPageId}"`,
    );
    currentPageIdRef.current = nextPageId;
  }

  // Get current page's history — always reads from the live ref, never a stale closure
  const getCurrentPageHistory = useCallback(() => {
    const pageId = currentPageIdRef.current;
    if (!pageHistoriesRef.current.has(pageId)) {
      console.log(
        `📋 [History] Creating new history entry for page "${pageId}"`,
      );
      pageHistoriesRef.current.set(pageId, { history: [], index: -1 });
    }
    return pageHistoriesRef.current.get(pageId)!;
  }, []); // ✅ No dependency on currentPageId — uses the ref instead

  // Get canvas background color based on theme
  const getCanvasBackgroundColor = useCallback(() => {
    const isDark = document.documentElement.classList.contains("dark");
    return isDark ? "#1a1a1a" : "#FFFFFF";
  }, []);

  // Check if theme has changed
  const hasThemeChanged = useCallback(() => {
    const currentTheme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    const changed =
      previousThemeRef.current !== null &&
      previousThemeRef.current !== currentTheme;
    previousThemeRef.current = currentTheme;
    return changed;
  }, []);

  const saveHistory = useCallback(() => {
    const canvas = canvasInstance.current;

    if (!canvas) {
      return;
    }

    // Skip saving during undo/redo or page loading
    if (isUndoRedoRef.current || isLoadingPageRef.current) {
      console.log(
        `⏸️  [saveHistory] Skipped — isUndoRedo=${isUndoRedoRef.current}, isLoadingPage=${isLoadingPageRef.current}`,
      );
      return;
    }

    try {
      const json = canvas.toJSON();
      // Filter out temp objects
      if (json.objects) {
        json.objects = json.objects.filter(
          (obj: any) => !obj.excludeFromExport,
        );
      }
      const state = JSON.stringify(json);

      const pageHistory = getCurrentPageHistory();
      const pageId = currentPageIdRef.current; // for logging

      // Don't save if state hasn't changed
      const lastState = pageHistory.history[pageHistory.index];
      if (lastState === state) {
        return;
      }

      // Remove any redo states
      if (pageHistory.index < pageHistory.history.length - 1) {
        console.log(
          `✂️  [saveHistory][${pageId}] Trimming ${pageHistory.history.length - 1 - pageHistory.index} redo state(s)`,
        );
        pageHistory.history = pageHistory.history.slice(
          0,
          pageHistory.index + 1,
        );
      }

      // Add new state
      pageHistory.history.push(state);
      pageHistory.index++;

      // Limit history to 50 states
      if (pageHistory.history.length > 50) {
        pageHistory.history.shift();
        pageHistory.index--;
      }

      console.log(
        `💾 [saveHistory][${pageId}] Saved state #${pageHistory.index} (total: ${pageHistory.history.length})`,
      );
    } catch (error) {
      console.error("❌ Error saving history:", error);
    }
  }, [getCurrentPageHistory]);

  // Stable ref for saveHistory — allows mount effect to always call
  // the latest saveHistory without depending on it (preventing canvas re-creation)
  const saveHistoryRef = useRef(saveHistory);
  useEffect(() => {
    saveHistoryRef.current = saveHistory;
  }, [saveHistory]);

  // ===== UNDO FUNCTION =====
  const undo = useCallback(() => {
    const canvas = canvasInstance.current;

    if (!canvas) {
      console.warn("⚠️ [undo] No canvas instance");
      return;
    }

    const pageHistory = getCurrentPageHistory();
    const pageId = currentPageIdRef.current;

    console.log(
      `↩️  [undo][${pageId}] index=${pageHistory.index}, historyLen=${pageHistory.history.length}`,
    );

    // No more undo states
    if (pageHistory.index <= 0) {
      console.log(
        `⛔ [undo][${pageId}] Nothing to undo (index=${pageHistory.index})`,
      );
      return;
    }

    isUndoRedoRef.current = true;
    pageHistory.index--;

    const state = pageHistory.history[pageHistory.index];
    console.log(`↩️  [undo][${pageId}] Restoring state #${pageHistory.index}`);

    try {
      const stateObj = JSON.parse(state);

      canvas.loadFromJSON(stateObj, () => {
        canvas.renderOnAddRemove = true;
        canvas.requestRenderAll();

        // Small delay to let Fabric.js finish
        setTimeout(() => {
          isUndoRedoRef.current = false;
          console.log(`✅ [undo][${pageId}] Done`);
        }, 50);
      });
    } catch (error) {
      console.error("❌ Undo error:", error);
      isUndoRedoRef.current = false;
      pageHistory.index++; // Restore index on error
    }
  }, [getCurrentPageHistory]);

  // ===== REDO FUNCTION =====
  const redo = useCallback(() => {
    const canvas = canvasInstance.current;

    if (!canvas) {
      console.warn("⚠️ [redo] No canvas instance");
      return;
    }

    const pageHistory = getCurrentPageHistory();
    const pageId = currentPageIdRef.current;

    console.log(
      `↪️  [redo][${pageId}] index=${pageHistory.index}, historyLen=${pageHistory.history.length}`,
    );

    // No more redo states
    if (pageHistory.index >= pageHistory.history.length - 1) {
      console.log(`⛔ [redo][${pageId}] Nothing to redo`);
      return;
    }

    isUndoRedoRef.current = true;
    pageHistory.index++;

    const state = pageHistory.history[pageHistory.index];
    console.log(`↪️  [redo][${pageId}] Restoring state #${pageHistory.index}`);

    try {
      const stateObj = JSON.parse(state);

      canvas.loadFromJSON(stateObj, () => {
        canvas.renderOnAddRemove = true;
        canvas.requestRenderAll();

        // Small delay to let Fabric.js finish
        setTimeout(() => {
          isUndoRedoRef.current = false;
          console.log(`✅ [redo][${pageId}] Done`);
        }, 50);
      });
    } catch (error) {
      console.error("❌ Redo error:", error);
      isUndoRedoRef.current = false;
      pageHistory.index--; // Restore index on error
    }
  }, [getCurrentPageHistory]);

  function cleanupToolHandlers(canvas: fabric.Canvas) {
    const h = activeToolHandlersRef.current;

    if (h.down) canvas.off("mouse:down", h.down);
    if (h.move) canvas.off("mouse:move", h.move);
    if (h.up) canvas.off("mouse:up", h.up);
    if (h.extra) canvas.off("path:created", h.extra);
    if (h.textEntered) canvas.off("text:editing:entered", h.textEntered);
    if (h.textChanged) canvas.off("text:changed", h.textChanged);
    if (h.textExited) canvas.off("text:editing:exited", h.textExited);
    if (h.dblclick) canvas.off("mouse:dblclick", h.dblclick);
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

    // Exit text editing mode cleanly
    exitTextEditing(canvas);
  }

  // Text editing helper functions
  const exitTextEditing = useCallback((canvas: fabric.Canvas) => {
    if (editingTextRef.current && isEditingTextRef.current) {
      const textObj = editingTextRef.current;
      
      // Store cursor position before exiting
      if (textObj.selectionStart !== undefined && textObj.selectionEnd !== undefined) {
        textCursorPositionRef.current = {
          start: textObj.selectionStart,
          end: textObj.selectionEnd
        };
      }
      
      textObj.exitEditing();
      
      // Remove empty or whitespace-only text objects
      const text = textObj.text?.trim() || '';
      if (text === '') {
        canvas.remove(textObj);
        canvas.requestRenderAll();
        setTimeout(() => saveHistory(), 0);
      }
      
      editingTextRef.current = null;
      isEditingTextRef.current = false;
    }
  }, [saveHistory]);

  const enterTextEditing = useCallback((textObj: fabric.Textbox, canvas: fabric.Canvas) => {
    // Exit any existing text editing first
    exitTextEditing(canvas);
    
    editingTextRef.current = textObj;
    isEditingTextRef.current = true;
    
    textObj.enterEditing();
    
    // Restore cursor position if available
    const savedPosition = textCursorPositionRef.current;
    if (savedPosition && textObj.text) {
      const textLength = textObj.text.length;
      textObj.selectionStart = Math.min(savedPosition.start, textLength);
      textObj.selectionEnd = Math.min(savedPosition.end, textLength);
    }
    
    canvas.requestRenderAll();
  }, [exitTextEditing]);

  const createTextBox = useCallback((x: number, y: number, canvas: fabric.Canvas) => {
    const textBox = new fabric.Textbox('', {
      left: x,
      top: y,
      width: 200,
      fontSize: 16,
      fontFamily: 'Arial',
      fill: color,
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      lockScalingFlip: true,
      splitByGrapheme: true,
    });

    canvas.add(textBox);
    canvas.setActiveObject(textBox);
    
    // Enter editing mode immediately
    enterTextEditing(textBox, canvas);
    
    return textBox;
  }, [color, enterTextEditing]);

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
          height / canvas.getHeight(),
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
  // CLEAR CANVAS
  // -----------------------------
  const clear = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    canvas.clear();

    // Clear current page's history
    const pageHistory = getCurrentPageHistory();
    pageHistory.history = [];
    pageHistory.index = -1;

    // Save empty state
    setTimeout(() => {
      saveHistory();
    }, 100);
  }, [saveHistory, getCurrentPageHistory]);

  // -----------------------------
  // GET CANVAS INSTANCE
  // -----------------------------
  const getCanvas = useCallback(() => {
    return canvasInstance.current;
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
      } else if (_tool === "text") {
        canvas.defaultCursor = "text";
        canvas.hoverCursor = "text";
      } else if (_tool === "select") {
        canvas.defaultCursor = "default";
        canvas.hoverCursor = "move";
      } else {
        canvas.defaultCursor = "default";
        canvas.hoverCursor = "default";
      }

      /* ----------------------------------
       OBJECT SELECTABILITY
      ---------------------------------- */
      // Make all objects selectable ONLY when in select mode
      // OR when in a drawing tool mode (so we can see the active selection)
      const shouldMakeSelectable = _tool === "select";

      canvas.forEachObject((obj) => {
        obj.selectable = shouldMakeSelectable;
        obj.evented = shouldMakeSelectable;
        obj.hoverCursor = shouldMakeSelectable ? "move" : "default";
        obj.hasControls = shouldMakeSelectable; // Show controls only in select mode
        obj.hasBorders = shouldMakeSelectable;
        
        // Special handling for text objects
        if (obj instanceof fabric.Textbox) {
          // In text mode: editable but not resizable
          // In select mode: movable + resizable  
          // In other modes: not selectable
          if (_tool === "text") {
            obj.selectable = true;
            obj.evented = true;
            obj.hasControls = false; // No resize controls in text mode
            obj.hasBorders = true;
            obj.lockScalingX = true;
            obj.lockScalingY = true;
          } else if (_tool === "select") {
            obj.selectable = true;
            obj.evented = true;
            obj.hasControls = true; // Show resize controls in select mode
            obj.hasBorders = true;
            obj.lockScalingX = false;
            obj.lockScalingY = false;
          } else {
            obj.selectable = false;
            obj.evented = false;
            obj.hasControls = false;
            obj.hasBorders = false;
          }
        }
      });

      // Always discard active object when switching tools, unless we are in select mode
      if (_tool !== "select") {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }

      if (!canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      }

      // Configure brush for drawing
      if (_tool === "brush") {
        canvas.freeDrawingBrush.color = _color;
        canvas.freeDrawingBrush.width = _width;
      }

      // Don't discard active selection when switching between drawing tools
      // Only discard when switching to non-selectable tools

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
            evented: true,
          });

          e.path.setCoords();
          canvas.requestRenderAll();

          setTimeout(() => {
            saveHistory();
          }, 0);
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
          cursorY: number,
        ): boolean => {
          if (obj === eraserCircleRef.current) return false;

          // Ignore objects marked as excludeFromExport (temp objects)
          if ((obj as any).excludeFromExport) return false;

          const objBounds = obj.getBoundingRect();
          const distance = Math.sqrt(
            Math.pow(cursorX - (objBounds.left + objBounds.width / 2), 2) +
              Math.pow(cursorY - (objBounds.top + objBounds.height / 2), 2),
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
              pointer.y,
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

          setTimeout(() => {
            saveHistory();
          }, 0);
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
        _tool !== "pan" &&
        _tool !== "text"
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

          // Save History once
          setTimeout(() => {
            saveHistory();
          }, 0);
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
       TEXT TOOL
      ---------------------------------- */
      // Handle text tool
      if (_tool === "text" || _tool === "select") {
        const onDown = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
          const target = e.target;
          
          // If clicking on an existing text object in text or select mode
          if (target && target instanceof fabric.Textbox && (_tool === "text" || _tool === "select")) {
            // Only allow editing in text mode or select mode
            enterTextEditing(target, canvas);
            return;
          }
          
          // If in text mode and clicking on empty canvas, create new text
          if (_tool === "text" && !target) {
            const pointer = canvas.getPointer(e.e);
            createTextBox(pointer.x, pointer.y, canvas);
            
            // Save history after creating text
            setTimeout(() => saveHistory(), 100);
          }
        };

        const onDblClick = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
          const target = e.target;
          
          // Double-click on text object in any mode (text or select) enters editing
          if (target && target instanceof fabric.Textbox && (_tool === "text" || _tool === "select")) {
            enterTextEditing(target, canvas);
          }
        };

        const onTextEntered = (e: any) => {
          const textObj = e.target;
          if (textObj instanceof fabric.Textbox) {
            editingTextRef.current = textObj;
            isEditingTextRef.current = true;
          }
        };

        const onTextChanged = (e: any) => {
          // This event fires while user is typing
          // We'll handle debounced history saves here
          const textObj = e.target;
          if (textObj instanceof fabric.Textbox && isEditingTextRef.current) {
            // Mark that text is being actively modified
            // The parent component will handle debounced API saves
          }
        };

        const onTextExited = (e: any) => {
          const textObj = e.target;
          if (textObj instanceof fabric.Textbox) {
            // Store cursor position
            if (textObj.selectionStart !== undefined && textObj.selectionEnd !== undefined) {
              textCursorPositionRef.current = {
                start: textObj.selectionStart,
                end: textObj.selectionEnd
              };
            }
            
            // Remove empty text objects
            const text = textObj.text?.trim() || '';
            if (text === '') {
              canvas.remove(textObj);
              canvas.requestRenderAll();
              setTimeout(() => saveHistory(), 0);
            } else {
              // Save history for text content changes
              setTimeout(() => saveHistory(), 0);
            }
            
            editingTextRef.current = null;
            isEditingTextRef.current = false;
          }
        };

        canvas.on("mouse:down", onDown);
        canvas.on("mouse:dblclick", onDblClick);
        canvas.on("text:editing:entered", onTextEntered);
        canvas.on("text:changed", onTextChanged);
        canvas.on("text:editing:exited", onTextExited);

        activeToolHandlersRef.current = {
          down: onDown,
          dblclick: onDblClick,
          textEntered: onTextEntered,
          textChanged: onTextChanged,
          textExited: onTextExited,
        };
      }
    },
    [onToolChange, saveHistory],
  );

  // save canvas to JSON
  const saveToJson = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return "";

    // Get canvas JSON and filter out temporary objects
    const canvasJSON = canvas.toJSON();

    // Filter out objects marked as excludeFromExport
    if (canvasJSON.objects) {
      canvasJSON.objects = canvasJSON.objects.filter(
        (obj: any) => !obj.excludeFromExport,
      );
    }

    return JSON.stringify(canvasJSON);
  }, []);

  // Generation counter — incremented on every loadFromJson call so that if
  // Fabric cancels an in-flight load (by starting a new one), the stale
  // callback can detect it was superseded and skip seeding the wrong state.
  const loadGenerationRef = useRef(0);

  // Load canvas from JSON
  const loadFromJson = useCallback(
    (json: string, targetPageId?: string) => {
      const canvas = canvasInstance.current;
      if (!canvas) return;

      // 🔑 Use the explicitly passed targetPageId first, then the live ref.
      const pageId = targetPageId || currentPageIdRef.current;

      // Bump generation so any previous in-flight callback knows it is stale
      loadGenerationRef.current += 1;
      const myGeneration = loadGenerationRef.current;

      console.log(
        `📥 [loadFromJson] gen=${myGeneration} Loading for page "${pageId}" (targetPageId="${targetPageId}", refId="${currentPageIdRef.current}")`,
      );

      // Guard: suppress event-driven history saves during load
      isLoadingPageRef.current = true;
      isUndoRedoRef.current = true;
      canvas.renderOnAddRemove = false;

      const seedHistory = () => {
        // Seed under the CURRENT live page ID at time of seeding,
        // not the captured pageId — by now currentPageIdRef may have
        // advanced to the real ID (e.g. first call captured "default").
        const activePageId = currentPageIdRef.current;
        try {
          const canvasJSON = canvas.toJSON();
          if (canvasJSON.objects) {
            canvasJSON.objects = canvasJSON.objects.filter(
              (obj: any) => !obj.excludeFromExport,
            );
          }
          const state = JSON.stringify(canvasJSON);
          pageHistoriesRef.current.set(activePageId, {
            history: [state],
            index: 0,
          });
          console.log(
            `🌱 [loadFromJson] gen=${myGeneration} Seeded history for page "${activePageId}" (index=0, len=1)`,
          );
        } catch (error) {
          console.error(
            `❌ [loadFromJson] gen=${myGeneration} Failed to seed history for page "${activePageId}":`,
            error,
          );
          pageHistoriesRef.current.set(activePageId, {
            history: [],
            index: -1,
          });
        }
      };

      canvas.loadFromJSON(json, () => {
        // If a newer loadFromJson call has already started, our canvas state
        // has been replaced — skip seeding to avoid clobbering the winner.
        if (myGeneration !== loadGenerationRef.current) {
          console.warn(
            `⚠️ [loadFromJson] gen=${myGeneration} superseded by gen=${loadGenerationRef.current} — skipping seed`,
          );
          return;
        }

        canvas.renderOnAddRemove = true;
        canvas.renderAll();
        seedHistory();

        setTimeout(() => {
          isUndoRedoRef.current = false;
          isLoadingPageRef.current = false;
          console.log(
            `✅ [loadFromJson] gen=${myGeneration} Guards released for page "${currentPageIdRef.current}"`,
          );
        }, 150);
      });

      // Fallback: if Fabric's callback never fires (empty JSON "{}" edge case
      // or StrictMode double-invoke cancellation), release guards and seed.
      setTimeout(() => {
        if (myGeneration !== loadGenerationRef.current) return; // superseded
        if (!isLoadingPageRef.current && !isUndoRedoRef.current) return; // already released

        console.warn(
          `⚠️ [loadFromJson] gen=${myGeneration} Fabric callback did not fire within 500ms — seeding manually`,
        );
        canvas.renderOnAddRemove = true;
        canvas.renderAll();
        seedHistory();
        isUndoRedoRef.current = false;
        isLoadingPageRef.current = false;
      }, 500);
    },
    [], // ✅ No dependencies — uses refs only
  );

  // Save current page state (for page switching)
  const saveCurrentPageState = useCallback(() => {
    const canvas = canvasInstance.current;
    if (!canvas) return;

    const pageHistory = getCurrentPageHistory();
    const pageId = currentPageIdRef.current;

    try {
      const json = canvas.toJSON();
      if (json.objects) {
        json.objects = json.objects.filter(
          (obj: any) => !obj.excludeFromExport,
        );
      }
      const state = JSON.stringify(json);

      // Update current history state
      if (pageHistory.index >= 0) {
        pageHistory.history[pageHistory.index] = state;
        console.log(
          `💾 [saveCurrentPageState] Saved current state for page "${pageId}" at index ${pageHistory.index}`,
        );
      } else {
        console.warn(
          `⚠️ [saveCurrentPageState] No history to update for page "${pageId}" (index=${pageHistory.index})`,
        );
      }
    } catch (error) {
      console.error("❌ Error saving page state:", error);
    }
  }, [getCurrentPageHistory]);

  // Load page state (for page switching)
  // targetPageId: the page we are switching TO — must be passed explicitly because the React prop (currentPageId) may not yet have updated when this is called.
  const loadPageState = useCallback(
    (canvasData: string, targetPageId?: string) => {
      const canvas = canvasInstance.current;
      if (!canvas) return;

      // 🔑 FIX: Use the explicitly passed targetPageId first, then the live ref.
      const pageId = targetPageId || currentPageIdRef.current;
      console.log(
        `🔄 [loadPageState] Switching to page "${pageId}" (targetPageId="${targetPageId}", refId="${currentPageIdRef.current}")`,
      );
      console.log(
        `🗂️  [loadPageState] pageHistoriesRef keys: [${Array.from(pageHistoriesRef.current.keys()).join(", ")}]`,
      );
      console.log(
        `🗂️  [loadPageState] Target page has existing history: ${pageHistoriesRef.current.has(pageId)}`,
      );

      // Guard: suppress all history saves during page load
      isLoadingPageRef.current = true;
      isUndoRedoRef.current = true;
      canvas.renderOnAddRemove = false;

      // Parse canvas data once; fall back to empty object on bad/empty JSON
      try {
        if (canvasData && canvasData !== "{}") {
          JSON.parse(canvasData); // validate
        }
      } catch {
        console.warn(
          `⚠️ [loadPageState] Invalid canvasData for page "${pageId}", falling back to empty`,
        );
        canvasData = "{}";
      }

      canvas.loadFromJSON(canvasData, () => {
        canvas.renderOnAddRemove = true;
        canvas.renderAll();

        // Seed history for the target page if it has never been visited.
        if (!pageHistoriesRef.current.has(pageId)) {
          try {
            const json = canvas.toJSON();
            if (json.objects) {
              json.objects = json.objects.filter(
                (obj: any) => !obj.excludeFromExport,
              );
            }
            const state = JSON.stringify(json);
            pageHistoriesRef.current.set(pageId, {
              history: [state],
              index: 0,
            });
            console.log(
              `🌱 [loadPageState] Seeded initial history for new page "${pageId}"`,
            );
          } catch {
            pageHistoriesRef.current.set(pageId, { history: [], index: -1 });
            console.warn(
              `⚠️ [loadPageState] Failed to seed history for page "${pageId}"`,
            );
          }
        } else {
          // Page already has history — preserve it intact so undo/redo continues to work
          const existing = pageHistoriesRef.current.get(pageId)!;
          console.log(
            `♻️  [loadPageState] Restored existing history for page "${pageId}": index=${existing.index}, len=${existing.history.length}`,
          );
        }

        // Small delay to let any queued event handlers fire (and be suppressed)
        setTimeout(() => {
          isUndoRedoRef.current = false;
          isLoadingPageRef.current = false;
          console.log(
            `✅ [loadPageState] Guards released for page "${pageId}"`,
          );
        }, 150);
      });
    },
    [], // ✅ No dependencies needed — uses refs
  );

  // Remove history entries for a deleted page
  const clearPageHistory = useCallback((pageId: string) => {
    console.log(`🗑️  [clearPageHistory] Clearing history for page "${pageId}"`);
    pageHistoriesRef.current.delete(pageId);
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
      backgroundColor: getCanvasBackgroundColor(),
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

    const handleHistoryEvent = () => {
      setTimeout(() => {
        if (!isUndoRedoRef.current && !isLoadingPageRef.current) {
          saveHistoryRef.current();
        } else {
          console.log(
            `⏸️  [handleHistoryEvent] Skipped — isUndoRedo=${isUndoRedoRef.current}, isLoadingPage=${isLoadingPageRef.current}`,
          );
        }
      }, 100);
    };

    fab.on("object:modified", handleHistoryEvent);
    fab.on("object:removed", handleHistoryEvent);

    console.log("🎨 [useFabricCanvas] Canvas mounted — listeners registered");
    // NOTE: We do NOT save an initial empty state here anymore.
    // loadFromJson (called by useBoard on mount) seeds the initial history entry
    // for the correct pageId itself. A competing setTimeout here caused a race
    // condition where this 300ms save fired while loadFromJson's guards were
    // still held (from a second loadFromJson call), resulting in history being
    // permanently empty (index=-1) until the user drew something.

    return () => {
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
  }, [getCanvasBackgroundColor, hasThemeChanged]); // NOTE: saveHistory removed — use saveHistoryRef instead to prevent canvas re-creation

  // -----------------------------
  // UPDATE SETTINGS WHEN PROPS CHANGE
  // -----------------------------
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
    saveCurrentPageState,
    loadPageState,
    clearPageHistory,
  };
}
