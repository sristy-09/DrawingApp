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
  FaMoon,
  FaSun,
  FaDesktop,
  FaSignInAlt,
  FaSignOutAlt,
  FaTrash,
} from "react-icons/fa";
import { useEffect, useState } from "react";
import { useDragToolBar } from "../hooks/useDragToolBar";
import { useNavigate } from "react-router";
import { useTheme } from "../../core/context/themeProvider";
import { getData } from "../../core/context/userContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
    handleToolChange,
    toolsWithOptions,
    activeDrawingTool,
  } = useBoard();

  const { toolbarRef, getToolOptionsStyle } = useDragToolBar();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = getData();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleDashboard = () => {
    navigate("/dashboard");
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
      />

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

            <DropdownMenuLabel className="text-xs text-gray-500">
              Theme
            </DropdownMenuLabel>

            <DropdownMenuItem
              onClick={() => setTheme("light")}
              className="cursor-pointer"
            >
              <FaSun className="mr-2" />
              <span>Light</span>
              {theme === "light" && <FaCheck className="ml-auto text-blue-500" />}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setTheme("dark")}
              className="cursor-pointer"
            >
              <FaMoon className="mr-2" />
              <span>Dark</span>
              {theme === "dark" && <FaCheck className="ml-auto text-blue-500" />}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setTheme("system")}
              className="cursor-pointer"
            >
              <FaDesktop className="mr-2" />
              <span>System</span>
              {theme === "system" && <FaCheck className="ml-auto text-blue-500" />}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleClear}
              className="cursor-pointer">
              <FaTrash className="w-4 h-4" />
              <span>Clear Canvas</span>
            </DropdownMenuItem>

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
