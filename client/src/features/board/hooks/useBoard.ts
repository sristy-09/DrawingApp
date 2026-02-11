import { useEffect, useRef, useState, useCallback } from "react";
import type { FabricCanvasRef, Tool, Page } from "../types/types";
import { useParams } from "react-router";
import axios from "axios";
import { debounce } from "lodash";
import { useAppDispatch, useAppSelector } from "../../../store/hooks"
import { setCanvasData, setIsGuest, loadGuestBoardData } from "../../../store/boardSlice";
import { getData } from "../../core/context/userContext";

export function useBoard() {
  const API_URL = import.meta.env.VITE_API_URL;
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<FabricCanvasRef>(null);
  const previousThemeRef = useRef<string | null>(null);
  
  // Get theme-aware default color
  const getDefaultColor = () => {
    const isDark = document.documentElement.classList.contains('dark');
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
  const [currentPageId, setCurrentPageId] = useState<string>("page-1");
  
  // Redux
  const dispatch = useAppDispatch();
  const guestCanvasData = useAppSelector((state) => state.board.canvasData);
  const { isAuthenticated } = getData();

  // Track if canvas has actually changed
  const hasChangedRef = useRef(false);

  const lastSavedDataRef = useRef<string>("");
  const isDrawingRef = useRef<boolean>(false); // Track if user is actively drawing
  const isSavingRef = useRef<boolean>(false); // Track if save is in progress

  // Track the currently selected object
  const selectedObjectRef = useRef<any>(null);

  // Tools that have customization options
  const toolsWithOptions: Tool[] = ["brush", "rect", "circle", "line"];

  // Brush width presets
  const brushWidths = [1, 2, 3, 5, 8, 12];

  const [showToolOptions, setShowToolOptions] = useState(false);
  const toolOptionsRef = useRef<HTMLDivElement>(null);

  const handleClear = () => {
    clearCanvas();
  };

  const handleSave = () => {
    saveBoard();
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

  // Modified color setter to updated selected object
  const handleColorChange = (newColor: string) => {
    setColor(newColor);

    // Update the selected object if it exists
    if (selectedObjectRef.current) {
      const canvas = canvasRef.current?.getCanvas();
      if (canvas) {
        selectedObjectRef.current.set({
          stroke: newColor,
        });
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

  const saveBoard = async (includeThumbnail = false) => {
    if (!canvasRef.current || isSavingRef.current) return;

    // Don't save while user is actively drawing
    if (isDrawingRef.current) {
      return;
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

    // AUTHENTICATED USER: Save to backend with multi-page support
    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      const payload: { canvasData?: string; thumbnail?: string; currentPageId?: string } = {
        canvasData: json,
        currentPageId: currentPageId,
      };

      // Add thumbnail if requested
      if (includeThumbnail && !isDrawingRef.current) {
        const thumbnail = canvasRef.current.getThumbnail?.(400, 300);

        if (thumbnail) {
          payload.thumbnail = thumbnail;
        }
      }

      await axios.patch(`${API_URL}/board/${id}`, payload);

      lastSavedDataRef.current = json;
      setSaveStatus("saved");

      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("❌ Error saving board:", error);
      setSaveStatus("idle");
    } finally {
      isSavingRef.current = false;
    }
  };

  // Create debounced save function - only save when not drawing
  const debouncedSave = useCallback(
    debounce(() => {
      if (hasChangedRef.current && !isDrawingRef.current) {
        saveBoard(false);
      }
    }, 2000),
    [id],
  );

  // Debounced thumbnail generation (5 seconds) - only when not drawing
  const debouncedThumbnailSave = useCallback(
    debounce(() => {
      if (hasChangedRef.current && !isDrawingRef.current) {
        saveBoard(true);
        hasChangedRef.current = false;
      }
    }, 5000),
    [id],
  );

  const handleCanvasChange = () => {
    hasChangedRef.current = true;
    debouncedSave();
    debouncedThumbnailSave();
  };

  // Set guest mode on mount
  useEffect(() => {
    dispatch(setIsGuest(!isAuthenticated));
  }, [isAuthenticated, dispatch]);

  // Load board data
  useEffect(() => {
    const loadBoard = async () => {
      // GUEST USER: Load from Redux/localStorage (no multi-page)
      if (!isAuthenticated) {
        dispatch(loadGuestBoardData());
        setPages([]);
        setCurrentPageId("default");
        
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

        // Check if board has pages
        if (boardData.pages && boardData.pages.length > 0) {
          setPages(boardData.pages);
          setCurrentPageId(boardData.pages[0].id);
          
          const firstPage = boardData.pages[0];
          if (firstPage.canvasData && canvasRef.current?.loadFromJson) {
            canvasRef.current.loadFromJson(firstPage.canvasData);
            lastSavedDataRef.current = firstPage.canvasData;
          }
        } else {
          // Legacy board without pages - migrate to page structure
          const legacyPage: Page = {
            id: "page-1",
            name: "Page 1",
            canvasData: boardData.canvasData || "{}",
            thumbnail: boardData.thumbnail || "",
          };
          setPages([legacyPage]);
          setCurrentPageId("page-1");
          
          if (boardData.canvasData && canvasRef.current?.loadFromJson) {
            canvasRef.current.loadFromJson(boardData.canvasData);
            lastSavedDataRef.current = boardData.canvasData;
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
  }, [id, isAuthenticated, dispatch, guestCanvasData]);

  // Track drawing state to prevent saves during drawing
  useEffect(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;

    const handleMouseDown = () => {
      isDrawingRef.current = true;
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;

      // Trigger save after drawing completes
      if (hasChangedRef.current) {
        debouncedSave();
        debouncedThumbnailSave();
      }
    };

    // Track when an object is selected
    const handleSelectionCreated = (e: any) => {
      if (e.selected && e.selected[0]) {
        const obj = e.selected[0];
        selectedObjectRef.current = obj;

        // Update UI to show current object's properties
        if (obj.stroke) {
          setColor(obj.stroke);
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
        if (obj.stroke) {
          setColor(obj.stroke);
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

    // Track drawing state
    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:up", handleMouseUp);

    // Track selection changes
    canvas.on("selection:created", handleSelectionCreated);
    canvas.on("selection:updated", handleSelectionUpdated);
    canvas.on("selection:cleared", handleSelectionCleared);

    // Track canvas changes
    canvas.on("object:modified", handleCanvasChange);
    canvas.on("object:added", handleCanvasChange);
    canvas.on("path:created", handleCanvasChange);
    canvas.on("object:removed", handleCanvasChange);

    return () => {
      debouncedSave.cancel();
      debouncedThumbnailSave.cancel();
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:up", handleMouseUp);
      canvas.off("selection:created", handleSelectionCreated);
      canvas.off("selection:updated", handleSelectionUpdated);
      canvas.off("selection:cleared", handleSelectionCleared);
      canvas.off("object:modified", handleCanvasChange);
      canvas.off("object:added", handleCanvasChange);
      canvas.off("path:created", handleCanvasChange);
      canvas.off("object:removed", handleCanvasChange);
    };
  }, [debouncedSave, debouncedThumbnailSave, activeDrawingTool]);

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
      previousThemeRef.current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }

    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      
      // Only invert if theme actually changed
      if (previousThemeRef.current !== currentTheme) {
        previousThemeRef.current = currentTheme;
        
        // Normalize current color for comparison
        const normalizedColor = color.toLowerCase().trim();
        
        // Invert current color if it's black or white
        if (normalizedColor === "#000000" || normalizedColor === "#000" || normalizedColor === "black") {
          setColor("#FFFFFF");
        } else if (normalizedColor === "#ffffff" || normalizedColor === "#fff" || normalizedColor === "white") {
          setColor("#000000");
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [color]);

  const handleZoomIn = () => canvasRef.current?.zoomIn();
  const handleZoomOut = () => canvasRef.current?.zoomOut();
  const handleResetZoom = () => canvasRef.current?.resetZoom();

  const handleUndo = () => canvasRef.current?.undo();
  const handleRedo = () => canvasRef.current?.redo();

  // Page management functions
  const handleAddPage = () => {
    if (!isAuthenticated) return; // Only for authenticated users
    
    const newPageId = `page-${Date.now()}`;
    const newPage: Page = {
      id: newPageId,
      name: `Page ${pages.length + 1}`,
      canvasData: "{}",
      thumbnail: "",
    };
    
    // Save current page before switching
    if (canvasRef.current) {
      const currentJson = canvasRef.current.saveToJson();
      const updatedPages = pages.map(p => 
        p.id === currentPageId ? { ...p, canvasData: currentJson } : p
      );
      setPages([...updatedPages, newPage]);
    } else {
      setPages([...pages, newPage]);
    }
    
    // Switch to new page
    setCurrentPageId(newPageId);
    
    // Clear canvas for new page
    if (canvasRef.current) {
      canvasRef.current.loadFromJson("{}");
    }
  };

  const handleSwitchPage = (pageId: string) => {
    if (!isAuthenticated || pageId === currentPageId) return;
    
    // Save current page state
    if (canvasRef.current) {
      canvasRef.current.saveCurrentPageState?.();
      const currentJson = canvasRef.current.saveToJson();
      
      const updatedPages = pages.map(p => 
        p.id === currentPageId ? { ...p, canvasData: currentJson } : p
      );
      setPages(updatedPages);
    }
    
    // Load new page
    const targetPage = pages.find(p => p.id === pageId);
    if (targetPage && canvasRef.current) {
      setCurrentPageId(pageId);
      canvasRef.current.loadPageState?.(targetPage.canvasData || "{}");
      lastSavedDataRef.current = targetPage.canvasData || "{}";
    }
  };

  const handleDeletePage = (pageId: string) => {
    if (!isAuthenticated || pages.length <= 1) return; // Keep at least one page
    
    const updatedPages = pages.filter(p => p.id !== pageId);
    setPages(updatedPages);
    
    // If deleting current page, switch to first page
    if (pageId === currentPageId && updatedPages.length > 0) {
      const firstPage = updatedPages[0];
      setCurrentPageId(firstPage.id);
      if (canvasRef.current) {
        canvasRef.current.loadPageState?.(firstPage.canvasData || "{}");
      }
    }
  };

  const handleRenamePage = (pageId: string, newName: string) => {
    if (!isAuthenticated) return;
    
    const updatedPages = pages.map(p => 
      p.id === pageId ? { ...p, name: newName } : p
    );
    setPages(updatedPages);
  };

  // Save all pages to backend
  const saveAllPages = async () => {
    if (!isAuthenticated || !canvasRef.current) return;
    
    // Update current page data
    const currentJson = canvasRef.current.saveToJson();
    const updatedPages = pages.map(p => 
      p.id === currentPageId ? { ...p, canvasData: currentJson } : p
    );
    
    try {
      await axios.patch(`${API_URL}/board/${id}`, { pages: updatedPages });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("❌ Error saving pages:", error);
    }
  };

  // Auto-save pages when they change
  useEffect(() => {
    if (isAuthenticated && pages.length > 0) {
      const timer = setTimeout(() => {
        saveAllPages();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [pages, currentPageId, isAuthenticated]);

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
    handleAddPage,
    handleSwitchPage,
    handleDeletePage,
    handleRenamePage,
    saveAllPages,
  };
}
