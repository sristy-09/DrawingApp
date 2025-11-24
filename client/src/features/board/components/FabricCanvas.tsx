import React, { useImperativeHandle, type ForwardedRef } from "react";
import { useFabricCanvas } from "../hooks/useFabricCanvas";
import type { FabricCanvasProps, FabricCanvasRef } from "../types/types";

const FabricCanvas = React.forwardRef(
  (
    { color, brushWidth, tool }: FabricCanvasProps,
    ref: ForwardedRef<FabricCanvasRef>
  ) => {
    const {
      canvasRef,
      clear,
      getCanvas,
      applySettings,
      loadFromJson,
      saveToJson,
      zoomIn,
      zoomOut,
      resetZoom,
      getZoom,
    } = useFabricCanvas({
      color,
      brushWidth,
      tool,
    });

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      clear,
      getCanvas,
      applySettings,
      loadFromJson,
      saveToJson,
      zoomIn,
      zoomOut,
      resetZoom,
      getZoom,
    }));

    return <canvas ref={canvasRef} className="border w-screen h-screen" />;
  }
);

FabricCanvas.displayName = "FabricCanvas";

export default FabricCanvas;
