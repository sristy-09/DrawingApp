import type { JSX } from "react";
import {
  FaRegCircle,
  FaMinus,
  FaMousePointer,
  FaPaintBrush,
  FaRegSquare,
  FaEraser,
  FaHandPaper,
  FaGripVertical,
} from "react-icons/fa";
import type { Tool, ToolbarProps } from "../types/types";
import { useDragToolBar } from "../hooks/useDragToolBar";

export const toolIcons: Record<Tool, JSX.Element> = {
  select: <FaMousePointer />,
  brush: <FaPaintBrush />,
  eraser: <FaEraser />,
  pan: <FaHandPaper />,
  rect: <FaRegSquare />,
  circle: <FaRegCircle />,
  line: <FaMinus />,
};

const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  handleToolChange,
  toolsWithOptions,
  showToolOptions,
}) => {
  const {
    toolbarRef,
    getToolbarStyle,
    isDragging,
    isVertical,
    handleDragStart,
  } = useDragToolBar();

  return (
    <>
      {/* Draggable Tools Panel */}
      <div
        ref={toolbarRef}
        style={getToolbarStyle()}
        className={`z-40 bg-white border-2 border-gray-300 rounded-xl shadow-lg p-3 ${
          isDragging ? "opacity-80 " : ""
        }`}
      >
        <div
          className={`flex ${
            isVertical ? "flex-col" : "flex-row"
          } items-center gap-2`}
        >
          {/* Drag Handle - ONLY drag from here */}
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className="p-2 hover:bg-gray-100 rounded transition-colors cursor-grab active:cursor-grabbing"
            title="Drag to reposition"
          >
            <FaGripVertical className="text-gray-400" />
          </div>

          {/* Tool Buttons */}
          {Object.keys(toolIcons).map((key) => {
            const typedKey = key as Tool;
            const hasOptions = toolsWithOptions.includes(typedKey);
            return (
              <button
                key={typedKey}
                onClick={() => handleToolChange(typedKey)}
                className={`px-1 py-1 rounded border transition-colors relative ${
                  tool === typedKey
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-200"
                }`}
                title={typedKey.charAt(0).toUpperCase() + typedKey.slice(1)}
              >
                {toolIcons[typedKey]}

                {/* Active Indicator dot for tools with options */}
                {hasOptions && tool === typedKey && showToolOptions && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Toolbar;
