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

const toolIcons: Record<Tool, JSX.Element> = {
  select: <FaMousePointer />,
  brush: <FaPaintBrush />,
  eraser: <FaEraser />,
  pan: <FaHandPaper />,
  rect: <FaRegSquare />,
  circle: <FaRegCircle />,
  line: <FaMinus />,
};

const Toolbar: React.FC<ToolbarProps> = ({ tool, setTool }) => {
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
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={getToolbarStyle()}
        className={`z-40 bg-white border-2 border-gray-300 rounded-xl shadow-lg p-3 ${
          isDragging ? "opacity-80 cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div
          className={`flex ${
            isVertical ? "flex-col" : "flex-row"
          } items-center gap-2`}
        >
          {/* Tool Buttons */}
          {Object.keys(toolIcons).map((key) => {
            const typedKey = key as Tool;
            return (
              <button
                key={typedKey}
                onClick={() => setTool(typedKey)}
                className={`px-1 py-1 rounded border transition-colors ${
                  tool === typedKey
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-200"
                }`}
                title={typedKey.charAt(0).toUpperCase() + typedKey.slice(1)}
              >
                {toolIcons[typedKey]}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default Toolbar;
