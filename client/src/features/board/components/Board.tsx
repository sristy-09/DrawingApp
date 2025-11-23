import Toolbar from "./Toolbar";
import FabricCanvas from "./FabricCanvas";
import { useBoard } from "../hooks/useBoard";

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
  } = useBoard();
  console.log(canvasRef);
  console.log(canvasRef.current?.getCanvas()?.toJSON());
  const exportBoard = () => {
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;

    const json = canvas.toJSON();
    console.log("JSON Data:", json);
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <button onClick={exportBoard} className="p-2">
        Export JSON
      </button>
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
    </div>
  );
};

export default Board;
