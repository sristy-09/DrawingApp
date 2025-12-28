import Toolbar from "./Toolbar";
import FabricCanvas from "./FabricCanvas";
import { useBoard } from "../hooks/useBoard";
import { FaSearchMinus, FaSearchPlus } from "react-icons/fa";

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
  } = useBoard();

  return (
    <div className="board-container h-screen w-screen overflow-hidden relative">
      <Toolbar
        tool={tool}
        setTool={setTool}
        brushWidth={brushWidth}
        setBrushWidth={setBrushWidth}
        onClear={clearCanvas}
        onSave={saveBoard}
      />

      <FabricCanvas
        ref={canvasRef}
        color={color}
        brushWidth={brushWidth}
        tool={tool}
      />

      {/* Zoom Controls - Bottom Left */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center space-x-2 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-2">
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Zoom Out"
        >
          <FaSearchMinus className="text-gray-700" />
        </button>

        <button
          onClick={handleResetZoom}
          className="text-sm text-gray-700 font-medium min-w-[60px] text-center px-3 py-1 hover:bg-gray-100 rounded transition-colors"
          title="Reset Zoom"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
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
