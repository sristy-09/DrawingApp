import Toolbar, { toolIcons } from "./Toolbar";
import FabricCanvas from "./FabricCanvas";
import { useBoard } from "../hooks/useBoard";
import {
  FaCheck,
  FaRedo,
  FaSearchMinus,
  FaSearchPlus,
  FaUndo,
  FaBars,
  FaHome,
  FaSignInAlt,
  FaSignOutAlt,
  FaTrash,
  FaSave,
  FaPlus,
  FaFile,
  FaCopy,
  FaEdit,
  FaArrowUp,
  FaArrowDown,
  FaEllipsisV,
} from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import { useDragToolBar } from "../hooks/useDragToolBar";
import { useNavigate } from "react-router";
import { getData } from "../../core/context/userContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "../../core/components/ui/dropdown-menu";

const Board: React.FC = () => {
  const {
    tool,
    setTool,
    brushWidth,
    setBrushWidth,
    brushWidths,
    showToolOptions,
    setShowToolOptions,
    toolOptionsRef,
    canvasRef,
    color,
    setColor,
    saveStatus,
    zoom = 1,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleUndo,
    handleRedo,
    handleClear,
    handleSave,
    handleToolChange,
    toolsWithOptions,
    activeDrawingTool,
    pages,
    currentPageId,
    isLoadingPage,
    handleAddPage,
    handleSwitchPage,
    handleDeletePage,
    handleRenamePage,
    handleDuplicatePage,
    handleReorderPages,
  } = useBoard();

  const { toolbarRef, getToolOptionsStyle } = useDragToolBar();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = getData();
  const [menuOpen, setMenuOpen] = useState(false);

  // Page rename state
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Page context menu state


  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleDashboard = () => {
    navigate("/dashboard");
  };

  // Start rename
  const startRename = (pageId: string, currentName: string) => {
    setRenamingPageId(pageId);
    setRenameValue(currentName);
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 50);
  };

  // Commit rename
  const commitRename = () => {
    if (renamingPageId && renameValue.trim()) {
      handleRenamePage(renamingPageId, renameValue.trim());
    }
    setRenamingPageId(null);
    setRenameValue("");
  };

  // Move page up or down
  const movePage = (pageId: string, direction: "up" | "down") => {
    const idx = pages.findIndex(p => p._id === pageId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === pages.length - 1) return;

    const newIds = pages.map(p => p._id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newIds[idx], newIds[swapIdx]] = [newIds[swapIdx], newIds[idx]];
    handleReorderPages(newIds);
  };

  // Close tool options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toolOptionsRef.current &&
        !toolOptionsRef.current.contains(event.target as Node) &&
        toolbarRef.current &&
        !toolbarRef.current.contains(event.target as Node)
      ) {
        setShowToolOptions(false);
      }
    };

    if (showToolOptions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showToolOptions]);

  // Predefined color palette - theme-aware
  const getColorPalette = () => {
    const isDark = document.documentElement.classList.contains('dark');
    return [
      isDark ? "#FFFFFF" : "#000000", // White in dark mode, Black in light mode
      "#FF0000", // Red
      "#00FF00", // Green
      "#0000FF", // Blue
      "#FFFF00", // Yellow
      "#FF00FF", // Magenta
      "#00FFFF", // Cyan
      "#FF8800", // Orange
      "#8800FF", // Purple
      "#00FF88", // Mint
      "#FF0088", // Pink
    ];
  };

  const colorPalette = getColorPalette();

  return (
    <div className="board-container h-screen w-screen overflow-hidden relative bg-background">
      <Toolbar
        tool={tool}
        setTool={setTool}
        handleToolChange={handleToolChange}
        toolsWithOptions={toolsWithOptions}
        showToolOptions={showToolOptions}
      />

      <FabricCanvas
        ref={canvasRef}
        color={color}
        brushWidth={brushWidth}
        tool={tool}
        onToolChange={handleToolChange}
        currentPageId={currentPageId}
      />

      {/* Page loading overlay */}
      {isLoadingPage && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/50 pointer-events-none">
          <div className="flex items-center gap-2 bg-card border-2 border-border rounded-lg shadow-lg px-4 py-2">
            <svg
              className="animate-spin h-5 w-5 text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-medium text-card-foreground">Switching page...</span>
          </div>
        </div>
      )}

      {/* Tool Options Panel (Excalidraw-style) */}
      {showToolOptions && toolsWithOptions.includes(activeDrawingTool) && (
        <div
          ref={toolOptionsRef}
          style={getToolOptionsStyle()}
          className="z-30 bg-card border-2 border-border rounded-xl shadow-xl p-4 min-w-[280px] max-w-[320px]"
        >
          {/* Header */}
          <div className="mb-4 pb-3 border-b border-border">
            <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              {toolIcons[activeDrawingTool]}
              <span className="capitalize">{activeDrawingTool} Options</span>
            </h3>
          </div>

          {/* Stroke Color */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Stroke Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {colorPalette.map((paletteColor) => (
                <button
                  key={paletteColor}
                  onClick={() => setColor(paletteColor)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all relative ${color === paletteColor
                    ? "border-primary scale-110 shadow-md"
                    : "border-border hover:scale-105"
                    }`}
                  style={{ backgroundColor: paletteColor }}
                  title={paletteColor}
                >
                  {color === paletteColor && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaCheck
                        className={`text-sm ${paletteColor === "#000000"
                          ? "text-white"
                          : "text-white"
                          }`}
                        style={{
                          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                        }}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Custom Color Picker */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-border rounded-lg text-sm font-mono uppercase focus:outline-none focus:border-primary bg-background text-foreground"
                placeholder="#000000"
                maxLength={7}
              />
            </div>
          </div>

          {/* Stroke Width */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Stroke Width
            </label>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {brushWidths.map((width) => (
                <button
                  key={width}
                  onClick={() => setBrushWidth(width)}
                  className={`h-10 rounded-lg border-2 transition-all flex items-center justify-center ${brushWidth === width
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 bg-card"
                    }`}
                  title={`${width}px`}
                >
                  <div
                    className="rounded-full bg-foreground"
                    style={{
                      width: `${Math.min(width * 2, 16)}px`,
                      height: `${Math.min(width * 2, 16)}px`,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hamburger Menu - Top Left Corner */}
      <div className="fixed top-4 left-4 z-30">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 hover:bg-accent bg-card rounded-lg transition-colors shadow-lg border-2 border-border"
              title="Menu"
            >
              <FaBars className="text-card-foreground text-xl" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            {isAuthenticated && (
              <>
                <DropdownMenuLabel className="font-semibold">
                  {user?.username || user?.email}
                </DropdownMenuLabel>
              </>
            )}
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleDashboard} className="cursor-pointer">
              <FaHome className="mr-2" />
              <span>Dashboard</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleClear}
              className="cursor-pointer">
              <FaTrash className="w-4 h-4" />
              <span>Clear Canvas</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleSave}
              className="cursor-pointer">
              <FaSave className="w-4 h-4" />
              <span>Save</span>
            </DropdownMenuItem>

            {isAuthenticated && pages.length > 0 && (
              <>
                <DropdownMenuSeparator />

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FaFile className="w-4 h-4" />
                    <span>Pages ({pages.length})</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-[200px]">
                    {pages.map((page, index) => (
                      <DropdownMenuItem
                        key={page._id}
                        onClick={() => handleSwitchPage(page._id)}
                        className={`cursor-pointer ${currentPageId === page._id ? "bg-accent" : ""
                          }`}
                      >
                        <span className="flex-1">
                          {index + 1}. {page.name}
                        </span>
                        {currentPageId === page._id && (
                          <span className="text-xs text-muted-foreground ml-2">●</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleAddPage} className="cursor-pointer">
                      <FaPlus className="w-4 h-4" />
                      <span>Add Page</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}

            <DropdownMenuSeparator />

            {isAuthenticated ? (<DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-blue-400"
            >
              <FaSignOutAlt className="mr-2 text-blue-400" />
              <span>Sign Out</span>
            </DropdownMenuItem>) : (
              <DropdownMenuItem onClick={() => navigate("/login")} className="cursor-pointer text-blue-400">
                <FaSignInAlt className="mr-2 text-blue-400" />
                <span>Sign In</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Zoom and Undo/Redo Controls - Bottom Left */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center space-x-3">
        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-card border-2 border-border rounded-lg shadow-lg p-2">
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Zoom Out"
          >
            <FaSearchMinus className="text-card-foreground" />
          </button>

          <button
            onClick={handleResetZoom}
            className="text-sm text-card-foreground font-medium min-w-[60px] text-center px-2 py-1 hover:bg-accent rounded transition-colors"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Zoom In"
          >
            <FaSearchPlus className="text-card-foreground" />
          </button>
        </div>

        {/* Undo/Redo Controls */}
        <div className="flex items-center space-x-1 bg-card border-2 border-border rounded-lg shadow-lg p-2">
          <button
            onClick={handleUndo}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Undo"
          >
            <FaUndo className="text-card-foreground" />
          </button>

          <button
            onClick={handleRedo}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Redo"
          >
            <FaRedo className="text-card-foreground" />
          </button>
        </div>
      </div>

      {/* Page Navigation Bar - Bottom Center (Only for authenticated users) */}
      {isAuthenticated && pages.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex items-center space-x-1 bg-card border-2 border-border rounded-lg shadow-lg p-1.5">
            {pages.map((page, index) => (
              <div key={page._id} className="relative group">
                {/* Page button */}
                <button
                  onClick={() => handleSwitchPage(page._id)}
                  disabled={isLoadingPage}
                  className={`px-3 py-1.5 rounded transition-all text-sm font-medium min-w-[36px] ${currentPageId === page._id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-accent text-card-foreground"
                    } ${isLoadingPage ? "opacity-50 cursor-wait" : ""}`}
                  title={page.name}
                >
                  {index + 1}
                </button>

                {/* Page context menu (three-dot) on hover */}
                <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="w-4 h-4 bg-muted rounded-full flex items-center justify-center hover:bg-accent border border-border shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FaEllipsisV className="text-[8px] text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[160px]" align="center">
                      <DropdownMenuLabel className="text-xs truncate max-w-[140px]">
                        {page.name}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => startRename(page._id, page.name)}
                        className="cursor-pointer text-sm"
                      >
                        <FaEdit className="w-3 h-3 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicatePage(page._id)}
                        className="cursor-pointer text-sm"
                      >
                        <FaCopy className="w-3 h-3 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      {index > 0 && (
                        <DropdownMenuItem
                          onClick={() => movePage(page._id, "up")}
                          className="cursor-pointer text-sm"
                        >
                          <FaArrowUp className="w-3 h-3 mr-2" />
                          Move Left
                        </DropdownMenuItem>
                      )}
                      {index < pages.length - 1 && (
                        <DropdownMenuItem
                          onClick={() => movePage(page._id, "down")}
                          className="cursor-pointer text-sm"
                        >
                          <FaArrowDown className="w-3 h-3 mr-2" />
                          Move Right
                        </DropdownMenuItem>
                      )}
                      {pages.length > 1 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeletePage(page._id)}
                            className="cursor-pointer text-sm text-red-500 focus:text-red-500"
                          >
                            <FaTrash className="w-3 h-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}

            {/* Divider */}
            <div className="w-px h-6 bg-border mx-1" />

            {/* Add page button */}
            <button
              onClick={handleAddPage}
              className="px-2.5 py-1.5 rounded hover:bg-accent text-card-foreground transition-colors text-sm"
              title="Add Page"
            >
              <FaPlus className="text-xs" />
            </button>
          </div>
        </div>
      )}

      {/* Page Rename Modal */}
      {renamingPageId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => setRenamingPageId(null)}
        >
          <div
            className="bg-card border-2 border-border rounded-xl shadow-2xl p-6 min-w-[320px] max-w-[400px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-card-foreground mb-4">Rename Page</h3>
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setRenamingPageId(null);
              }}
              className="w-full px-3 py-2 border-2 border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-background text-foreground mb-4"
              placeholder="Page name"
              maxLength={100}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenamingPageId(null)}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={commitRename}
                className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Status Indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        {saveStatus === "saving" && (
          <div className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-medium">Saving...</span>
          </div>
        )}

        {saveStatus === "saved" && (
          <div className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-medium">Saved</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Board;
