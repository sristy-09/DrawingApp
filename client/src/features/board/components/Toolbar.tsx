import type { JSX } from "react";
import {
  FaRegCircle,
  FaMinus,
  FaMousePointer,
  FaPaintBrush,
  FaRegSquare,
  FaEraser,
  FaHandPaper,
  FaBars,
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

const Toolbar: React.FC<ToolbarProps> = ({ tool, setTool, onMenuToggle }) => {
  return (
    <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-gray-100 border-b">
      {/* Hamburger Menu Button */}
      <button
        onClick={onMenuToggle}
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        title="Menu"
      >
        <FaBars className="text-gray-700 text-xl" />
      </button>

      {/* Drawing Tools */}
      <div className="flex space-x-2 rounded">
        {Object.keys(toolIcons).map((key) => {
          const typedKey = key as Tool;
          return (
            <button
              key={typedKey}
              onClick={() => setTool(typedKey)}
              className={`px-4 py-2 rounded border transition-colors ${
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
  );
};

export default Toolbar;
