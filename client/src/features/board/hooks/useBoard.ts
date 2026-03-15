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
  const isDrawingRef = useRef<boolean>(false); // Track if user is actively drawing
  const isEditingTextRef = useRef<boolean>(false); // Track if user is actively editing text
  const isTypingRef = useRef<boolean>(false); // Track if user is actively typing
  const typingTimeoutRef = useRef<number | null>(null); // Track typing timeout
  const isInteractingRef = useRef<boolean>(false); // Track if user is actively interacting (moving, resizing, etc.)
  const isSavingRef = useRef<boolean>(false); // Track if save is in progress
  const lastInteractionTimeRef = useRef<number>(0); // Track last interaction time

  // Track the currently selected object
  const selectedObjectRef = useRef<any>(null);

  // Tools that have customization options
  const toolsWithOptions: Tool[] = ["brush", "rect", "circle", "line", "text"];

  // Brush width presets
  const brushWidths = [1, 2, 3, 5, 8, 12];

  const [showToolOptions, setShowToolOptions] = useState(false);
  const toolOptionsRef = useRef<HTMLDivElement>(null);

  // Helper function to check if user is actively interacting
  const isUserActivelyInteracting = () => {
    return isDrawingRef.current || isEditingTextRef.current || isInteractingRef.current || isTypingRef.current;
  };

  // Helper function to update interaction time
  const updateInteractionTime = () => {
    lastInteractionTimeRef.current = Date.now();
  };

  const handleClear = () => {
    clearCanvas();
  };

  const handleSave = () => {
    saveBoard(false);
  };

  const handleToolChange = (newTool: Tool) => {
    // Store previous tool
    setTool(newTool);

    // If it's a drawing tool, remember it as the active drawing tool
    if (toolsWithOptions.includes(newTool)) {
      setActiveDrawingTool(newTool);
      setShowToolOptions(true);
    } else if (newTool === "select") {
      // When switching to select, keep the popup open if we have an active drawing tool
      if (toolsWithOptions.includes(activeDrawingTool)) {
        setShowToolOptions(true);
      } else {
        setShowToolOptions(false);
      }
    } else {
      // For eraser, pan, or other tools
      setShowToolOptions(false);
    }
  };

  // Modified color setter to update selected object
  const handleColorChange = (newColor: string) => {
    setColor(newColor);

    // Update the selected object if it exists
    if (selectedObjectRef.current) {
      const canvas = canvasRef.current?.getCanvas();
      if (canvas) {
        // For text objects, update fill color; for other objects, update stroke
        if (selectedObjectRef.current.type === "textbox") {
          selectedObjectRef.current.set({
            fill: newColor,
          });
        } else {
          selectedObjectRef.current.set({
            stroke: newColor,
          });
        }
        selectedObjectRef.current.setCoords();
        canvas.fire("object:modified", { target: selectedObjectRef.current });
        canvas.renderAll();

        // Wait longer and only save to history, not to backend
        setTimeout(() => {
          // Only mark as changed, don't trigger backend save immediately
          hasChangedRef.current = true;
        }, 100);
      }
    }
  };

  // Modified brush width setter to update selected object
  const handleBrushWidthChange = (newWidth: number) => {
    setBrushWidth(newWidth);

    // Update the selected object if it exists
    if (selectedObjectRef.current) {
      const canvas = canvasRef.current?.getCanvas();
      if (canvas) {
        selectedObjectRef.current.set({
          strokeWidth: newWidth,
        });
        selectedObjectRef.current.setCoords(); // IMPORTANT: Update coordinates
        canvas.fire("object:modified", { target: selectedObjectRef.current });
        canvas.renderAll();

        // Wait longer and only save to history, not to backend
        setTimeout(() => {
          // Only mark as changed, don't trigger backend save immediately
          hasChangedRef.current = true;
        }, 100);
      }
    }
  };

  const clearCanvas = () => {
    selectedObjectRef.current = null;
    canvasRef.current?.clear();
  };

  const saveBoard = async (includeThumbnail = false, forceImmediate = false) => {
    if (!canvasRef.current || isSavingRef.current) return;

    // Skip interaction checks if this is a forced immediate save (like text exit)
    if (!forceImmediate) {
      // Don't save while user is actively interacting with the canvas
      if (isUserActivelyInteracting()) {
        return;
      }

      // Additional check: don't save if user was recently interacting (within 500ms)
      const timeSinceLastInteraction = Date.now() - lastInteractionTimeRef.current;
      if (timeSinceLastInteraction < 500) {
        return;
      }
    }

    const json = canvasRef.current.saveToJson();

    // Don't save if nothing changed (unless we're adding a thumbnail)
    if (!includeThumbnail && json === lastSavedDataRef.current) {
      return;
    }

    // GUEST USER: Save to Redux/localStorage (no multi-page for guests)
    if (!isAuthenticated) {
      dispatch(setCanvasData(json));
      lastSavedDataRef.current = json;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1000);
      return;
    }

    // AUTHENTICATED USER: Save to backend via Page API
    if (!currentPageId || !id) return;

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      const payload: { canvasData: string; thumbnail?: string } = {
        canvasData: json,
      };

      // Add thumbnail if requested and not interacting
      if (includeThumbnail && !isUserActivelyInteracting()) {
        const thumbnail = canvasRef.current.getThumbnail?.(400, 300);

        if (thumbnail) {
          payload.thumbnail = thumbnail;
        }
      }

      // Use the page-specific canvas endpoint
      await axios.patch(
        `${API_URL}/board/${id}/pages/${currentPageId}/canvas`,
        payload,
      );

      // Also update the page's canvasData in local state
      setPages((prev) =>
        prev.map((p) =>
          p._id === currentPageId ? { ...p, canvasData: json } : p,
        ),
      );

      lastSavedDataRef.current = json;
      setSaveStatus("saved");

      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("❌ Error saving page canvas:", error);
      setSaveStatus("idle");
    } finally {
      isSavingRef.current = false;
    }
  };

  // Create debounced save function - only save when not actively interacting
  const debouncedSave = useCallback(
    debounce(() => {
      if (hasChangedRef.current && !isUserActivelyInteracting()) {
        // Additional check for recent interactions
        const timeSinceLastInteraction = Date.now() - lastInteractionTimeRef.current;
        if (timeSinceLastInteraction >= 1000) { // Wait 1 second after last interaction
          saveBoard(false);
        }
      }
    }, 3000), // Increased debounce time to 3 seconds
    [id],
  );

  // Debounced thumbnail generation (8 seconds) - only when not actively interacting
  const debouncedThumbnailSave = useCallback(
    debounce(() => {
      if (hasChangedRef.current && !isUserActivelyInteracting()) {
        const timeSinceLastInteraction = Date.now() - lastInteractionTimeRef.current;
        if (timeSinceLastInteraction >= 2000) { // Wait 2 seconds after last interaction for thumbnail
          saveBoard(true);
          hasChangedRef.current = false;
        }
      }
    }, 8000), // Increased debounce time to 8 seconds
    [id],
  );

  const handleCanvasChange = () => {
    hasChangedRef.current = true;
    updateInteractionTime(); // Update interaction time on any canvas change

    // Don't trigger saves if user is actively typing
    if (isTypingRef.current) {
      return; // Skip triggering saves during typing
    }

    // Only trigger immediate saves if not actively interacting
    if (!isUserActivelyInteracting()) {
      debouncedSave();
      debouncedThumbnailSave();
    }
  };

  // Set guest mode on mount
  useEffect(() => {
    dispatch(setIsGuest(!isAuthenticated));
  }, [isAuthenticated, dispatch]);

  // =============================================
  // LOAD BOARD DATA
  // =============================================
  useEffect(() => {
    const loadBoard = async () => {
      // GUEST USER: Load from Redux/localStorage (no multi-page)
      if (!isAuthenticated) {
        dispatch(loadGuestBoardData());
        setPages([]);
        setCurrentPageId("");

        // Wait for Redux state to update
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

      // AUTHENTICATED USER: Load from backend with multi-page support
      try {
        const res = await axios.get(`${API_URL}/board/${id}`);
        const boardData = res.data;

        // Check if board has pages (populated by backend)
        if (boardData.pages && boardData.pages.length > 0) {
          const normalizedPages = boardData.pages.map(normalizePage);
          setPages(normalizedPages);

          // Use server's currentPageId, or first page as fallback
          const activePageId =
            boardData.currentPageId || normalizedPages[0]._id;

          setCurrentPageId(activePageId);

          // Find the active page and load its canvas data
          const activePage =
            normalizedPages.find((p: Page) => p._id === activePageId) ||
            normalizedPages[0];

          if (activePage?.canvasData && canvasRef.current?.loadFromJson) {
            canvasRef.current.loadFromJson(activePage.canvasData);
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

  // Track drawing state to prevent saves during drawing
  useEffect(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;

    const handleMouseDown = () => {
      isDrawingRef.current = true;
      isInteractingRef.current = true;
      updateInteractionTime();
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;

      // Keep interaction flag for a brief moment to prevent immediate saves
      setTimeout(() => {
        isInteractingRef.current = false;
        updateInteractionTime();
      }, 100);

      // Trigger save after drawing completes, but not immediately
      if (hasChangedRef.current) {
        setTimeout(() => {
          if (!isUserActivelyInteracting()) {
            debouncedSave();
            debouncedThumbnailSave();
          }
        }, 500);
      }
    };

    // Track when an object is selected
    const handleSelectionCreated = (e: any) => {
      if (e.selected && e.selected[0]) {
        const obj = e.selected[0];
        selectedObjectRef.current = obj;

        // Update UI to show current object's properties
        if (obj.type === "textbox") {
          // For text objects, use fill color
          if (obj.fill) {
            setColor(obj.fill);
          }
        } else {
          // For other objects, use stroke color
          if (obj.stroke) {
            setColor(obj.stroke);
          }
        }
        if (obj.strokeWidth) {
          setBrushWidth(obj.strokeWidth);
        }

        // Determine which tool this object belongs to and show its popup
        let objectTool: Tool | null = null;
        if (obj.type === "rect") {
          objectTool = "rect";
        } else if (obj.type === "circle") {
          objectTool = "circle";
        } else if (obj.type === "line") {
          objectTool = "line";
        } else if (obj.type === "path") {
          objectTool = "brush";
        } else if (obj.type === "textbox") {
          objectTool = "text";
        }

        if (objectTool && toolsWithOptions.includes(objectTool)) {
          setActiveDrawingTool(objectTool);
          setShowToolOptions(true);
        }
      }
    };

    // Track when selection is updated (when switching between objects)
    const handleSelectionUpdated = (e: any) => {
      if (e.selected && e.selected[0]) {
        const obj = e.selected[0];
        selectedObjectRef.current = obj;

        // Update UI to show current object's properties
        if (obj.type === "textbox") {
          // For text objects, use fill color
          if (obj.fill) {
            setColor(obj.fill);
          }
        } else {
          // For other objects, use stroke color
          if (obj.stroke) {
            setColor(obj.stroke);
          }
        }
        if (obj.strokeWidth) {
          setBrushWidth(obj.strokeWidth);
        }

        // Determine which tool this object belongs to and show its popup
        let objectTool: Tool | null = null;
        if (obj.type === "rect") {
          objectTool = "rect";
        } else if (obj.type === "circle") {
          objectTool = "circle";
        } else if (obj.type === "line") {
          objectTool = "line";
        } else if (obj.type === "path") {
          objectTool = "brush";
        } else if (obj.type === "textbox") {
          objectTool = "text";
        }

        if (objectTool && toolsWithOptions.includes(objectTool)) {
          setActiveDrawingTool(objectTool);
          setShowToolOptions(true);
        }
      }
    };

    // Track when selection is cleared
    const handleSelectionCleared = () => {
      selectedObjectRef.current = null;
      // Don't close popup when selection is cleared
      // User might want to draw more shapes
    };

    // Track text editing state
    const handleTextEditingEntered = () => {
      isEditingTextRef.current = true;
      isTypingRef.current = false; // Reset typing state when entering edit mode
      updateInteractionTime();
    };

    const handleTextChanged = () => {
      // User is actively typing
      isTypingRef.current = true;
      updateInteractionTime();
      hasChangedRef.current = true;

      // Clear any existing typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set typing flag to false after 300ms of no typing (user stopped typing)
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        typingTimeoutRef.current = null;
      }, 300);

      // DO NOT trigger any saves during typing - only mark as changed
      // Save will happen only when user exits text editing
    };

    const handleTextEditingExited = () => {
      isEditingTextRef.current = false;
      isTypingRef.current = false;
      updateInteractionTime();

      // Clear any pending typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      // IMPORTANT: Save to database when user exits text editing
      // Use setTimeout to avoid blocking the text exit event
      // Use forceImmediate=true to bypass interaction checks
      if (hasChangedRef.current) {
        setTimeout(() => {
          saveBoard(false, true); // Force immediate save, bypass checks
        }, 100); // Small delay to ensure text exit is complete
      }
    };

    // Track object interactions (moving, scaling, rotating)
    const handleObjectMoving = () => {
      isInteractingRef.current = true;
      updateInteractionTime();
    };

    const handleObjectScaling = () => {
      isInteractingRef.current = true;
      updateInteractionTime();
    };

    const handleObjectRotating = () => {
      isInteractingRef.current = true;
      updateInteractionTime();
    };

    const handleObjectModified = () => {
      isInteractingRef.current = false;
      updateInteractionTime();

      // Don't trigger saves if user is actively typing
      if (!isTypingRef.current) {
        handleCanvasChange();
      } else {
        // Just mark as changed, but don't trigger saves
        hasChangedRef.current = true;
      }
    };

    // Track drawing state
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:up", handleMouseUp);

    // Track text editing state
    canvas.on("text:editing:entered", handleTextEditingEntered);
    canvas.on("text:changed", handleTextChanged);
    canvas.on("text:editing:exited", handleTextEditingExited);

    // Track object interactions
    canvas.on("object:moving", handleObjectMoving);
    canvas.on("object:scaling", handleObjectScaling);
    canvas.on("object:rotating", handleObjectRotating);
    canvas.on("object:modified", handleObjectModified);

    // Track selection changes
    canvas.on("selection:created", handleSelectionCreated);
    canvas.on("selection:updated", handleSelectionUpdated);
    canvas.on("selection:cleared", handleSelectionCleared);

    // Track canvas changes (but not object:modified since we handle it separately)
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
      canvas.off("object:moving", handleObjectMoving);
      canvas.off("object:scaling", handleObjectScaling);
      canvas.off("object:rotating", handleObjectRotating);
      canvas.off("object:modified", handleObjectModified);
      canvas.off("selection:created", handleSelectionCreated);
      canvas.off("selection:updated", handleSelectionUpdated);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.off("object:added", handleCanvasChange);
      canvas.off("path:created", handleCanvasChange);
      canvas.off("object:removed", handleCanvasChange);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.off("object:modified", handleCanvasChange);
      canvas.off("object:added", handleCanvasChange);
      canvas.off("path:created", handleCanvasChange);
      canvas.off("object:removed", handleCanvasChange);
    };
  }, [debouncedSave, debouncedThumbnailSave, activeDrawingTool]);

  // Periodic save mechanism - ensures saves happen even if user stops interacting
  useEffect(() => {
    const periodicSave = setInterval(() => {
      if (hasChangedRef.current && !isUserActivelyInteracting()) {
        const timeSinceLastInteraction = Date.now() - lastInteractionTimeRef.current;
        if (timeSinceLastInteraction >= 5000) { // 5 seconds of inactivity
          saveBoard(false);
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(periodicSave);
  }, [saveBoard]);

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

  // Update default color when theme changes
  useEffect(() => {
    // Initialize theme tracking
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

      // Only invert if theme actually changed
      if (previousThemeRef.current !== currentTheme) {
        previousThemeRef.current = currentTheme;

        // Normalize current color for comparison
        const normalizedColor = color.toLowerCase().trim();

        // Invert current color if it's black or white
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

  // ADD PAGE — calls POST /board/:boardId/pages
  const handleAddPage = async () => {
    if (!isAuthenticated || !id) return;

    // Save current page canvas before switching
    if (canvasRef.current && currentPageId) {
      canvasRef.current.saveCurrentPageState?.();
      const currentJson = canvasRef.current.saveToJson();
      // Fire-and-forget save of current page
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

      // Update board currentPageId on server
      await axios.patch(`${API_URL}/board/${id}`, {
        currentPageId: newPage._id,
      });

      // Clear canvas for new page — pass the new page's ID explicitly since
      // setCurrentPageId is async and the hook still holds the old page's ID
      if (canvasRef.current) {
        canvasRef.current.loadFromJson("{}", newPage._id);
        lastSavedDataRef.current = "{}";
      }
    } catch (error) {
      console.error("❌ Error adding page:", error);
    }
  };

  // SWITCH PAGE — saves current, loads target, updates server currentPageId
  const handleSwitchPage = async (pageId: string) => {
    if (!isAuthenticated || pageId === currentPageId || isLoadingPage || !id)
      return;

    setIsLoadingPage(true);

    try {
      // Save current page state
      if (canvasRef.current && currentPageId) {
        canvasRef.current.saveCurrentPageState?.();
        const currentJson = canvasRef.current.saveToJson();

        // Update local state
        setPages((prev) =>
          prev.map((p) =>
            p._id === currentPageId ? { ...p, canvasData: currentJson } : p,
          ),
        );

        // Save to backend
        await axios.patch(
          `${API_URL}/board/${id}/pages/${currentPageId}/canvas`,
          { canvasData: currentJson },
        );
      }

      // Fetch the target page's full data (canvasData may have been excluded from list)
      const targetPage = pages.find((p) => p._id === pageId);
      let canvasData = targetPage?.canvasData || "{}";

      // If canvasData is missing, fetch from backend
      if (!canvasData || canvasData === "{}") {
        try {
          const res = await axios.get(`${API_URL}/board/${id}/pages/${pageId}`);
          canvasData = res.data.canvasData || "{}";
          // Update local state with fetched data
          setPages((prev) =>
            prev.map((p) => (p._id === pageId ? { ...p, canvasData } : p)),
          );
        } catch {
          // Use whatever we have
        }
      }

      // Switch
      setCurrentPageId(pageId);
      if (canvasRef.current) {
        // Pass pageId explicitly — React's setCurrentPageId is async so the canvas
        // hook still holds the old currentPageId prop at this point.
        canvasRef.current.loadPageState?.(canvasData, pageId);
        lastSavedDataRef.current = canvasData;
      }

      // Update server's currentPageId
      axios
        .patch(`${API_URL}/board/${id}`, {
          currentPageId: pageId,
        })
        .catch((err) => console.error("Error updating currentPageId:", err));
    } catch (error) {
      console.error("❌ Error switching page:", error);
    } finally {
      setIsLoadingPage(false);
    }
  };

  // DELETE PAGE — calls DELETE /board/:boardId/pages/:pageId
  const handleDeletePage = async (pageId: string) => {
    if (!isAuthenticated || pages.length <= 1 || !id) return;

    try {
      const res = await axios.delete(`${API_URL}/board/${id}/pages/${pageId}`);

      const newPages = pages.filter((p) => p._id !== pageId);
      setPages(newPages);

      // If deleting current page, switch to the page the server suggests or the first remaining
      if (pageId === currentPageId && newPages.length > 0) {
        const newCurrentId = res.data.newCurrentPageId || newPages[0]._id;
        setCurrentPageId(newCurrentId);

        const newCurrentPage =
          newPages.find((p) => p._id === newCurrentId) || newPages[0];
        if (canvasRef.current) {
          canvasRef.current.loadPageState?.(
            newCurrentPage.canvasData || "{}",
            newCurrentId,
          );
          lastSavedDataRef.current = newCurrentPage.canvasData || "{}";
        }
      }

      // Clean up history for the deleted page so memory doesn't grow unbounded
      canvasRef.current?.clearPageHistory?.(pageId);
    } catch (error) {
      console.error("❌ Error deleting page:", error);
    }
  };

  // RENAME PAGE — calls PATCH /board/:boardId/pages/:pageId
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

  // DUPLICATE PAGE — calls POST /board/:boardId/pages/:pageId/duplicate
  const handleDuplicatePage = async (pageId: string) => {
    if (!isAuthenticated || !id) return;

    // If duplicating current page, save its latest canvas first
    if (pageId === currentPageId && canvasRef.current) {
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

      // Insert after the original page
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

  // REORDER PAGES — calls PATCH /board/:boardId/pages/reorder
  const handleReorderPages = async (newPageIds: string[]) => {
    if (!isAuthenticated || !id) return;

    // Optimistic local update
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
      // Reload pages from server if reorder fails
      try {
        const res = await axios.get(`${API_URL}/board/${id}`);
        if (res.data.pages) {
          setPages(res.data.pages.map(normalizePage));
        }
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
