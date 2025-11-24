import type { JSX } from "react";
import {
  FaRegCircle,
  FaMinus,
  FaMousePointer,
  FaPaintBrush,
  FaRegSquare,
} from "react-icons/fa";
import type { Tool, ToolbarProps } from "../types/types";

const toolIcons: Record<Tool, JSX.Element> = {
  select: <FaMousePointer />,
  brush: <FaPaintBrush />,
  rect: <FaRegSquare />,
  circle: <FaRegCircle />,
  line: <FaMinus />,
};

const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  brushWidth,
  setBrushWidth,
  onClear,
  onSave,
}) => {
  return (
    <div className="flex space-x-2 items-center justify-center m-3">
      <div className="flex space-x-2 rounded">
        {Object.keys(toolIcons).map((key) => {
          const typedKey = key as Tool;
          return (
            <button
              key={typedKey}
              onClick={() => setTool(typedKey)}
              className={`px-4 py-2 rounded border ${
                tool === typedKey
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-200"
              }`}
            >
              {toolIcons[typedKey]}
            </button>
          );
        })}
      </div>

      <div className="flex items-center space-x-2">
        <label className="text-sm text-gray-600">Width:</label>
        <input
          type="range"
          min="1"
          max="20"
          value={brushWidth}
          onChange={(e) => setBrushWidth(Number(e.target.value))}
          className="w-32"
        />
        <span className="text-sm text-gray-600 w-8">{brushWidth}</span>
      </div>

      <button
        onClick={onClear}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Clear
      </button>

      {onSave && (
        <button
          onClick={onSave}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Save Now
        </button>
      )}
    </div>
  );
};

export default Toolbar;
