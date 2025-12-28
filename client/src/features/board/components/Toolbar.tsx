import type { JSX } from "react";
import {
  FaRegCircle,
  FaMinus,
  FaMousePointer,
  FaPaintBrush,
  FaRegSquare,
  FaEraser,
  FaHandPaper,
} from "react-icons/fa";
import type { Tool, ToolbarProps } from "../types/types";

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
  return (
    <>
      {/* Drawing Tools */}
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40 flex flex-col space-y-4 bg-white border-2 border-gray-300 rounded-xl shadow-lg p-1">
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
    </>
  );
};

export default Toolbar;
