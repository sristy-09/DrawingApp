import Toolbar from "./Toolbar";
import FabricCanvas from "./FabricCanvas";
import { useBoard } from "../hooks/useBoard";
import { FaBars, FaSearchMinus, FaSearchPlus, FaTimes } from "react-icons/fa";
import { useState } from "react";
import type { Tool } from "../types/types";

const Board: React.FC = () => {
  const {
    tool,
    setTool,
    brushWidth,
    setBrushWidth,
    clearCanvas,
    canvasRef,
    color,
    saveBoard,
    saveStatus,
    zoom = 1,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleUndo,
    handleRedo
  } = useBoard();

  const [menuOpen, setMenuOpen] = useState(false);

  const handleClear = () => {
    clearCanvas();
    setMenuOpen(false);
  };

  const handleSave = () => {
    saveBoard();
    setMenuOpen(false);
  };

  const handleToolChange = (newTool: Tool) => {
    setTool(newTool);
  };

  // Predefined color palette
  const colorPalette = [
    "#000000", // Black
    "#FFFFFF", // White
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

  return (
    <div className="board-container h-screen w-screen overflow-hidden relative">
      <Toolbar tool={tool} setTool={setTool} />

      <FabricCanvas
        ref={canvasRef}
        color={color}
        brushWidth={brushWidth}
        tool={tool}
        onToolChange={handleToolChange}
      />

      {/* Hamburger Menu Button - Top Left Corner */}
      <div className="fixed top-4 left-4 z-30">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 hover:bg-gray-200 bg-white rounded-lg transition-colors shadow-lg border-2 border-gray-300"
          title="Menu"
        >
          <FaBars className="text-gray-700 text-xl" />
        </button>
      </div>

      {/* Hamburger Menu Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white bg-opacity-95 backdrop-blur-sm shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Menu header */}
        <div className="flex items-center justify-between p-2 border-b bg-gray-100 bg-opacity-90">
          <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Close"
          >
            <FaTimes className="text-gray-700 text-xl" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="p-3 space-y-4 overflow-auto h-[calc(100%-60px)]">
          {/* Undo/Redo Buttons */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">History</label>
            <div className="flex items-center space-x-2">
              <button onClick={handleUndo}
              className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center">

              </button>
            </div>

          </div>

          {/* Brush Width Control */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Brush Width
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="1"
                max="20"
                value={brushWidth}
                onChange={(e) => setBrushWidth(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                {brushWidth}px
              </span>
            </div>

            {/* Visual Preview */}
            <div className="flex items-center justify-center p-4 bg-gray-50 rounded">
              <div
                className="bg-gray-800 rounded-full"
                style={{
                  width: `${brushWidth * 2}px`,
                  height: `${brushWidth * 2}px`,
                }}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={handleClear}
              className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Clear Canvas</span>
            </button>

            <button
              onClick={handleSave}
              className="px-2 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              <span>Save Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Controls - Bottom Left */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center space-x-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-2">
        <button
          onClick={handleZoomOut}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Zoom Out"
        >
          <FaSearchMinus className="text-gray-700" />
        </button>

        <button
          onClick={handleResetZoom}
          className="text-sm text-gray-700 font-medium min-w-[60px] text-center px-2 py-1 hover:bg-gray-100 rounded transition-colors"
          title="Reset Zoom"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={handleZoomIn}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Zoom In"
        >
          <FaSearchPlus className="text-gray-700" />
        </button>
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
