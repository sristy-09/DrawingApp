import { useEffect, useRef, useState, useCallback } from "react";
import type { FabricCanvasRef, Tool, Page } from "../types/types";
import { useParams } from "react-router";
import axios from "axios";
import { debounce } from "lodash";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  setCanvasData,
  setIsGuest,
  loadGuestBoardData,
} from "../../../store/boardSlice";
import { getData } from "../../core/context/userContext";

// Normalize a page object from the backend (_id → id)
function normalizePage(p: any): Page {
  return {
    ...p,
    _id: p._id || p.id,
    id: p._id || p.id,
  };
}

export function useBoard() {
  const API_URL = import.meta.env.VITE_API_URL;
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<FabricCanvasRef>(null);
  const previousThemeRef = useRef<string | null>(null);

  // Get theme-aware default color
  const getDefaultColor = () => {
    const isDark = document.documentElement.classList.contains("dark");
    return isDark ? "#FFFFFF" : "#000000";
  };

  const [color, setColor] = useState<string>(getDefaultColor());
  const [brushWidth, setBrushWidth] = useState<number>(3);
  const [tool, setTool] = useState<Tool>("eraser");
  const [activeDrawingTool, setActiveDrawingTool] = useState<Tool>("eraser");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [zoom, setZoom] = useState<number>(1);

  // Multi-page state
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string>("");
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  // Redux
  const dispatch = useAppDispatch();
  const guestCanvasData = useAppSelector((state) => state.board.canvasData);
  const { isAuthenticated } = getData();

  // Track if canvas has actually changed
  const hasChangedRef = useRef(false);
  const lastSavedDataRef = useRef<string>("");

  // ─── FIX #1 & #2: Replace the web of boolean interaction guards with a
  // single numeric counter. Every "I am busy" caller increments it; when
  // done it decrements. A debounced save that fires after a page-switch
  // reads the counter from a ref — it can never act on a stale closure value.
  const interactionDepthRef = useRef<number>(0);
  const isInteracting = () => interactionDepthRef.current > 0;
  const beginInteraction = () => {
    interactionDepthRef.current++;
  };
  const endInteraction = () => {
    interactionDepthRef.current = Math.max(0, interactionDepthRef.current - 1);
  };

  const isSavingRef = useRef<boolean>(false);
  const lastInteractionTimeRef = useRef<number>(0);

  // ─── FIX #2: store currentPageId in a ref so debounced callbacks that
  // were created before a page switch always read the correct value.
  const currentPageIdRef = useRef<string>("");
  useEffect(() => {
    currentPageIdRef.current = currentPageId;
  }, [currentPageId]);

  // ─── FIX #2: track whether a page-switch is in progress so any debounced
  // save that was already queued from the *previous* page is silently dropped.
  const isSwitchingPageRef = useRef<boolean>(false);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track the currently selected object
  const selectedObjectRef = useRef<any>(null);

  // Tools that have customization options
  const toolsWithOptions: Tool[] = ["brush", "rect", "circle", "line", "text"];

  // Brush width presets
  const brushWidths = [1, 2, 3, 5, 8, 12];

  const [showToolOptions, setShowToolOptions] = useState(false);
  const toolOptionsRef = useRef<HTMLDivElement>(null);

  const handleClear = () => clearCanvas();
  const handleSave = () => saveBoard(false);

  const handleToolChange = (newTool: Tool) => {
    setTool(newTool);
    if (toolsWithOptions.includes(newTool)) {
      setActiveDrawingTool(newTool);
      setShowToolOptions(true);
    } else if (newTool === "select") {
      setShowToolOptions(toolsWithOptions.includes(activeDrawingTool));
    } else {
      setShowToolOptions(false);
    }
  };

  // Modified color setter to update selected object
  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (selectedObjectRef.current) {
      const canvas = canvasRef.current?.getCanvas();
      if (canvas) {
        if (selectedObjectRef.current.type === "textbox") {
          selectedObjectRef.current.set({ fill: newColor });
        } else {
          selectedObjectRef.current.set({ stroke: newColor });
        }
        selectedObjectRef.current.setCoords();
        canvas.fire("object:modified", { target: selectedObjectRef.current });
        canvas.renderAll();
        hasChangedRef.current = true;
      }
    }
  };

  // Modified brush width setter to update selected object
  const handleBrushWidthChange = (newWidth: number) => {
    setBrushWidth(newWidth);
    if (selectedObjectRef.current) {
      const canvas = canvasRef.current?.getCanvas();
      if (canvas) {
        selectedObjectRef.current.set({ strokeWidth: newWidth });
        selectedObjectRef.current.setCoords();
        canvas.fire("object:modified", { target: selectedObjectRef.current });
        canvas.renderAll();
        hasChangedRef.current = true;
      }
    }
  };

  const clearCanvas = () => {
    selectedObjectRef.current = null;
    canvasRef.current?.clear();
  };

  // ─── FIX #3 & #5: saveBoard is now fully async and waits one animation
  // frame before serialising so Fabric has finished painting.
  const saveBoard = useCallback(
    async (includeThumbnail = false, forceImmediate = false) => {
      if (!canvasRef.current || isSavingRef.current) return;

      // ─── FIX #2: drop saves queued before a page switch
      if (isSwitchingPageRef.current) {
        console.log("⏭️  [saveBoard] Skipped — page switch in progress");
        return;
      }

      if (!forceImmediate) {
        if (isInteracting()) {
          console.log("⏭️  [saveBoard] Skipped — user is interacting");
          return;
        }
        const timeSinceLastInteraction =
          Date.now() - lastInteractionTimeRef.current;
        if (timeSinceLastInteraction < 500) {
          console.log("⏭️  [saveBoard] Skipped — interaction too recent");
          return;
        }
      }

      // ─── FIX #3: wait one animation frame so Fabric finishes painting
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );

      // Guard: abort if page switch started while we were waiting
      if (isSwitchingPageRef.current) return;

      const json = canvasRef.current.saveToJson();
      if (!includeThumbnail && json === lastSavedDataRef.current) return;

      // GUEST USER
      if (!isAuthenticated) {
        dispatch(setCanvasData(json));
        lastSavedDataRef.current = json;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1000);
        return;
      }

      // ─── FIX #4: use the ref — not the closure-captured state variable —
      // so we always save to the page that is *currently* active.
      const activePageId = currentPageIdRef.current;
      if (!activePageId || !id) return;

      isSavingRef.current = true;
      setSaveStatus("saving");

      try {
        const payload: { canvasData: string; thumbnail?: string } = {
          canvasData: json,
        };

        if (includeThumbnail && !isInteracting()) {
          const thumbnail = canvasRef.current.getThumbnail?.(400, 300);
          if (thumbnail) payload.thumbnail = thumbnail;
        }

        await axios.patch(
          `${API_URL}/board/${id}/pages/${activePageId}/canvas`,
          payload,
        );

        // Only update local state for the page we actually saved
        setPages((prev) =>
          prev.map((p) =>
            p._id === activePageId ? { ...p, canvasData: json } : p,
          ),
        );

        lastSavedDataRef.current = json;
        hasChangedRef.current = false;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (error) {
        console.error("❌ Error saving page canvas:", error);
        setSaveStatus("idle");
      } finally {
        isSavingRef.current = false;
      }
    },
    [id, isAuthenticated, dispatch, API_URL],
  );

  // ─── FIX #2: debounced saves read pageId from ref at call-time, so they
  // always target the right page even when they fire late.
  const debouncedSave = useCallback(
    debounce(() => {
      if (!hasChangedRef.current) return;
      if (isInteracting()) return;
      if (isSwitchingPageRef.current) return;
      const timeSinceLastInteraction =
        Date.now() - lastInteractionTimeRef.current;
      if (timeSinceLastInteraction < 1000) return;
      saveBoard(false);
    }, 3000),
    [saveBoard],
  );

  const debouncedThumbnailSave = useCallback(
    debounce(() => {
      if (!hasChangedRef.current) return;
      if (isInteracting()) return;
      if (isSwitchingPageRef.current) return;
      const timeSinceLastInteraction =
        Date.now() - lastInteractionTimeRef.current;
      if (timeSinceLastInteraction < 2000) return;
      saveBoard(true);
    }, 8000),
    [saveBoard],
  );

  const handleCanvasChange = useCallback(() => {
    hasChangedRef.current = true;
    lastInteractionTimeRef.current = Date.now();
    if (isInteracting()) return; // don't queue saves while drawing/typing
    debouncedSave();
    debouncedThumbnailSave();
  }, [debouncedSave, debouncedThumbnailSave]);

  // Set guest mode on mount
  useEffect(() => {
    dispatch(setIsGuest(!isAuthenticated));
  }, [isAuthenticated, dispatch]);

  // =============================================
  // LOAD BOARD DATA
  // =============================================
  useEffect(() => {
    const loadBoard = async () => {
      if (!isAuthenticated) {
        dispatch(loadGuestBoardData());
        setPages([]);
        setCurrentPageId("");
        setTimeout(() => {
          if (guestCanvasData && canvasRef.current?.loadFromJson) {
            canvasRef.current.loadFromJson(guestCanvasData);
            lastSavedDataRef.current = guestCanvasData;
            setTimeout(() => {
              canvasRef.current?.applySettings?.({ color, brushWidth, tool });
            }, 50);
          }
        }, 100);
        return;
      }

      try {
        const res = await axios.get(`${API_URL}/board/${id}`);
        const boardData = res.data;

        if (boardData.pages && boardData.pages.length > 0) {
          const normalizedPages = boardData.pages.map(normalizePage);
          setPages(normalizedPages);

          const activePageId =
            boardData.currentPageId || normalizedPages[0]._id;

          setCurrentPageId(activePageId);
          currentPageIdRef.current = activePageId; // sync ref immediately

          const activePage =
            normalizedPages.find((p: Page) => p._id === activePageId) ||
            normalizedPages[0];

          if (activePage?.canvasData && canvasRef.current?.loadFromJson) {
            // Pass activePageId explicitly so the canvas hook seeds history
            // for the correct page even before React re-renders with the
            // updated currentPageId prop.
            canvasRef.current.loadFromJson(activePage.canvasData, activePageId);
            lastSavedDataRef.current = activePage.canvasData;
          }
        }

        setTimeout(() => {
          canvasRef.current?.applySettings?.({ color, brushWidth, tool });
        }, 50);
      } catch (error) {
        console.error("Error loading board:", error);
      }
    };
    loadBoard();
  }, [id, isAuthenticated, dispatch]);

  // ─── FIX #1: interaction-tracking effect uses the counter helpers.
  // Handlers no longer have boolean-flip races; the counter can't go negative.
  useEffect(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;

    // ── Drawing / panning ──
    const handleMouseDown = () => {
      beginInteraction();
      lastInteractionTimeRef.current = Date.now();
    };
    const handleMouseUp = () => {
      // Release the interaction count after a brief settling delay
      setTimeout(() => {
        endInteraction();
        lastInteractionTimeRef.current = Date.now();
        if (hasChangedRef.current) {
          debouncedSave();
          debouncedThumbnailSave();
        }
      }, 150);
    };

    // ── Selection tracking (consolidated to avoid duplication) ──
    const syncSelectedObject = (e: any) => {
      const obj = e.selected?.[0];
      selectedObjectRef.current = obj ?? null;
      if (!obj) return;

      if (obj.type === "textbox" && obj.fill) setColor(obj.fill);
      else if (obj.stroke) setColor(obj.stroke);
      if (obj.strokeWidth) setBrushWidth(obj.strokeWidth);

      const toolMap: Record<string, Tool> = {
        rect: "rect",
        circle: "circle",
        line: "line",
        path: "brush",
        textbox: "text",
      };
      const objectTool = toolMap[obj.type];
      if (objectTool && toolsWithOptions.includes(objectTool)) {
        setActiveDrawingTool(objectTool);
        setShowToolOptions(true);
      }
    };
    const handleSelectionCleared = () => {
      selectedObjectRef.current = null;
    };

    // ── Text editing ──
    const handleTextEditingEntered = () => {
      beginInteraction();
      lastInteractionTimeRef.current = Date.now();
    };
    const handleTextChanged = () => {
      lastInteractionTimeRef.current = Date.now();
      hasChangedRef.current = true;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 300);
    };
    const handleTextEditingExited = () => {
      endInteraction();
      lastInteractionTimeRef.current = Date.now();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // If the user clicked blank canvas to create a NEW textbox, this exit
      // fired as a side-effect of the same click — skip the save.
      // isCreatingNewText() stays true until enterEditing() runs (rAF),
      // so we re-check after a frame to catch the genuine exit case.
      if (canvasRef.current?.isCreatingNewText?.()) return;
      if (hasChangedRef.current) {
        setTimeout(() => saveBoard(false, true), 100);
      }
    };

    // ── Object transform tracking ──
    const handleTransformStart = () => {
      beginInteraction();
      lastInteractionTimeRef.current = Date.now();
    };
    const handleObjectModified = () => {
      endInteraction();
      lastInteractionTimeRef.current = Date.now();
      handleCanvasChange();
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:up", handleMouseUp);
    canvas.on("text:editing:entered", handleTextEditingEntered);
    canvas.on("text:changed", handleTextChanged);
    canvas.on("text:editing:exited", handleTextEditingExited);
    canvas.on("object:moving", handleTransformStart);
    canvas.on("object:scaling", handleTransformStart);
    canvas.on("object:rotating", handleTransformStart);
    canvas.on("object:modified", handleObjectModified);
    canvas.on("selection:created", syncSelectedObject);
    canvas.on("selection:updated", syncSelectedObject);
    canvas.on("selection:cleared", handleSelectionCleared);
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
      canvas.off("object:moving", handleTransformStart);
      canvas.off("object:scaling", handleTransformStart);
      canvas.off("object:rotating", handleTransformStart);
      canvas.off("object:modified", handleObjectModified);
      canvas.off("selection:created", syncSelectedObject);
      canvas.off("selection:updated", syncSelectedObject);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.off("object:added", handleCanvasChange);
      canvas.off("path:created", handleCanvasChange);
      canvas.off("object:removed", handleCanvasChange);
    };
  }, [
    debouncedSave,
    debouncedThumbnailSave,
    handleCanvasChange,
    saveBoard,
    activeDrawingTool,
  ]);

  // Periodic save — only fires after genuine inactivity
  useEffect(() => {
    const periodicSave = setInterval(() => {
      if (!hasChangedRef.current) return;
      if (isInteracting()) return;
      if (isSwitchingPageRef.current) return;
      const timeSinceLastInteraction =
        Date.now() - lastInteractionTimeRef.current;
      if (timeSinceLastInteraction >= 5000) saveBoard(false);
    }, 10000);
    return () => clearInterval(periodicSave);
  }, [saveBoard]);

  // When color/brushWidth/tool change, apply new settings
  useEffect(() => {
    if (!canvasRef.current?.applySettings) return;
    canvasRef.current.applySettings({ color, brushWidth, tool });
  }, [color, brushWidth, tool]);

  // Update zoom state
  useEffect(() => {
    const interval = setInterval(() => {
      if (canvasRef.current) setZoom(canvasRef.current.getZoom());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Update default color when theme changes
  useEffect(() => {
    if (previousThemeRef.current === null) {
      previousThemeRef.current = document.documentElement.classList.contains(
        "dark",
      )
        ? "dark"
        : "light";
    }
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
      if (previousThemeRef.current !== currentTheme) {
        previousThemeRef.current = currentTheme;
        const normalizedColor = color.toLowerCase().trim();
        if (
          normalizedColor === "#000000" ||
          normalizedColor === "#000" ||
          normalizedColor === "black"
        ) {
          setColor("#FFFFFF");
        } else if (
          normalizedColor === "#ffffff" ||
          normalizedColor === "#fff" ||
          normalizedColor === "white"
        ) {
          setColor("#000000");
        }
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [color]);

  const handleZoomIn = () => canvasRef.current?.zoomIn();
  const handleZoomOut = () => canvasRef.current?.zoomOut();
  const handleResetZoom = () => canvasRef.current?.resetZoom();
  const handleUndo = () => canvasRef.current?.undo();
  const handleRedo = () => canvasRef.current?.redo();

  // =============================================
  // PAGE MANAGEMENT FUNCTIONS
  // =============================================

  // ADD PAGE
  const handleAddPage = async () => {
    if (!isAuthenticated || !id) return;

    if (canvasRef.current && currentPageId) {
      canvasRef.current.saveCurrentPageState?.();
      const currentJson = canvasRef.current.saveToJson();
      axios
        .patch(`${API_URL}/board/${id}/pages/${currentPageId}/canvas`, {
          canvasData: currentJson,
        })
        .catch((err) => console.error("Error saving before page add:", err));
    }

    try {
      const res = await axios.post(`${API_URL}/board/${id}/pages`, {
        name: `Page ${pages.length + 1}`,
      });
      const newPage = normalizePage(res.data);
      setPages((prev) => [...prev, newPage]);
      setCurrentPageId(newPage._id);
      currentPageIdRef.current = newPage._id;

      await axios.patch(`${API_URL}/board/${id}`, {
        currentPageId: newPage._id,
      });

      if (canvasRef.current) {
        canvasRef.current.loadFromJson("{}", newPage._id);
        lastSavedDataRef.current = "{}";
        hasChangedRef.current = false;
      }
    } catch (error) {
      console.error("❌ Error adding page:", error);
    }
  };

  // ─── FIX #2, #4, #5, #6: SWITCH PAGE
  // All steps are awaited in order. The isSwitchingPageRef flag prevents any
  // in-flight debounced save from writing old-page data to the new page.
  const handleSwitchPage = async (pageId: string) => {
    if (!isAuthenticated || pageId === currentPageId || isLoadingPage || !id)
      return;

    // ─── FIX #2: cancel any pending debounced saves immediately
    debouncedSave.cancel();
    debouncedThumbnailSave.cancel();
    isSwitchingPageRef.current = true;
    setIsLoadingPage(true);

    try {
      // ─── FIX #6: save current page to both in-memory history AND backend
      // before we touch currentPageId so we know exactly which page to write to.
      if (canvasRef.current && currentPageId) {
        canvasRef.current.saveCurrentPageState?.();

        // ─── FIX #3: wait a frame so Fabric finishes rendering before
        // serialising — avoids capturing a partially-painted canvas.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );

        const currentJson = canvasRef.current.saveToJson();

        // Update local cache
        setPages((prev) =>
          prev.map((p) =>
            p._id === currentPageId ? { ...p, canvasData: currentJson } : p,
          ),
        );

        // ─── FIX #5: await the backend save so we never proceed to load the
        // next page before the previous one is durably stored.
        await axios.patch(
          `${API_URL}/board/${id}/pages/${currentPageId}/canvas`,
          { canvasData: currentJson },
        );

        lastSavedDataRef.current = currentJson;
        hasChangedRef.current = false;
      }

      // Fetch target page data
      const targetPage = pages.find((p) => p._id === pageId);
      let canvasData = targetPage?.canvasData || "{}";

      if (!canvasData || canvasData === "{}") {
        try {
          const res = await axios.get(`${API_URL}/board/${id}/pages/${pageId}`);
          canvasData = res.data.canvasData || "{}";
          setPages((prev) =>
            prev.map((p) => (p._id === pageId ? { ...p, canvasData } : p)),
          );
        } catch {
          // Use whatever we have
        }
      }

      // ─── FIX #4: update the ref BEFORE calling loadPageState so the
      // canvas hook's currentPageIdRef is already correct when it seeds the
      // history entry for the target page.
      currentPageIdRef.current = pageId;
      setCurrentPageId(pageId);

      if (canvasRef.current) {
        canvasRef.current.loadPageState?.(canvasData, pageId);
        lastSavedDataRef.current = canvasData;
        hasChangedRef.current = false;
      }

      // Fire-and-forget server sync of currentPageId
      axios
        .patch(`${API_URL}/board/${id}`, { currentPageId: pageId })
        .catch((err) => console.error("Error updating currentPageId:", err));
    } catch (error) {
      console.error("❌ Error switching page:", error);
    } finally {
      setIsLoadingPage(false);
      // Keep the guard up briefly so loadPageState's internal 150ms timeout
      // finishes before any queued save can run.
      setTimeout(() => {
        isSwitchingPageRef.current = false;
      }, 300);
    }
  };

  // DELETE PAGE
  const handleDeletePage = async (pageId: string) => {
    if (!isAuthenticated || pages.length <= 1 || !id) return;
    try {
      const res = await axios.delete(`${API_URL}/board/${id}/pages/${pageId}`);
      const newPages = pages.filter((p) => p._id !== pageId);
      setPages(newPages);

      if (pageId === currentPageId && newPages.length > 0) {
        const newCurrentId = res.data.newCurrentPageId || newPages[0]._id;
        currentPageIdRef.current = newCurrentId;
        setCurrentPageId(newCurrentId);

        const newCurrentPage =
          newPages.find((p) => p._id === newCurrentId) || newPages[0];
        if (canvasRef.current) {
          canvasRef.current.loadPageState?.(
            newCurrentPage.canvasData || "{}",
            newCurrentId,
          );
          lastSavedDataRef.current = newCurrentPage.canvasData || "{}";
          hasChangedRef.current = false;
        }
      }
      canvasRef.current?.clearPageHistory?.(pageId);
    } catch (error) {
      console.error("❌ Error deleting page:", error);
    }
  };

  // RENAME PAGE
  const handleRenamePage = async (pageId: string, newName: string) => {
    if (!isAuthenticated || !id) return;
    try {
      await axios.patch(`${API_URL}/board/${id}/pages/${pageId}`, {
        name: newName,
      });
      setPages((prev) =>
        prev.map((p) => (p._id === pageId ? { ...p, name: newName } : p)),
      );
    } catch (error) {
      console.error("❌ Error renaming page:", error);
    }
  };

  // DUPLICATE PAGE
  const handleDuplicatePage = async (pageId: string) => {
    if (!isAuthenticated || !id) return;
    if (pageId === currentPageId && canvasRef.current) {
      // ─── FIX #3: wait for render before serialising
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const currentJson = canvasRef.current.saveToJson();
      await axios.patch(`${API_URL}/board/${id}/pages/${pageId}/canvas`, {
        canvasData: currentJson,
      });
    }
    try {
      const res = await axios.post(
        `${API_URL}/board/${id}/pages/${pageId}/duplicate`,
      );
      const duplicated = normalizePage(res.data);
      setPages((prev) => {
        const idx = prev.findIndex((p) => p._id === pageId);
        const newPages = [...prev];
        newPages.splice(idx + 1, 0, duplicated);
        return newPages;
      });
    } catch (error) {
      console.error("❌ Error duplicating page:", error);
    }
  };

  // REORDER PAGES
  const handleReorderPages = async (newPageIds: string[]) => {
    if (!isAuthenticated || !id) return;
    const reorderedPages = newPageIds
      .map((pid) => pages.find((p) => p._id === pid))
      .filter(Boolean) as Page[];
    setPages(reorderedPages);
    try {
      await axios.patch(`${API_URL}/board/${id}/pages/reorder`, {
        pageIds: newPageIds,
      });
    } catch (error) {
      console.error("❌ Error reordering pages:", error);
      try {
        const res = await axios.get(`${API_URL}/board/${id}`);
        if (res.data.pages) setPages(res.data.pages.map(normalizePage));
      } catch {
        // ignore
      }
    }
  };

  return {
    canvasRef,
    color,
    brushWidth,
    brushWidths,
    showToolOptions,
    setShowToolOptions,
    toolOptionsRef,
    tool,
    activeDrawingTool,
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
    // Multi-page support
    pages,
    currentPageId,
    isLoadingPage,
    handleAddPage,
    handleSwitchPage,
    handleDeletePage,
    handleRenamePage,
    handleDuplicatePage,
    handleReorderPages,
  };
}
