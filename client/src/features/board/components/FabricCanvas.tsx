import React, { useEffect, useImperativeHandle, useState, type ForwardedRef } from "react";
import { useFabricCanvas } from "../hooks/useFabricCanvas";
import type { FabricCanvasProps, FabricCanvasRef, Tool } from "../types/types";

const FabricCanvas = React.forwardRef(
  (
    { color, brushWidth, tool: externalTool, onToolChange }: FabricCanvasProps,
    ref: ForwardedRef<FabricCanvasRef>
  ) => {
    // Local state for tool(can be auto-switched by the hook)
    const [internalTool, setInternalTool] = useState<Tool>(externalTool)

    // sync internal tool with external prop when it changes
    useEffect(()=>{
      setInternalTool(externalTool);
    },[externalTool])

    const handleToolChange = (newTool: Tool)=>{
      setInternalTool(newTool);
      // Notify parent component to update it's UI
      onToolChange?.(newTool)
    }

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
      getThumbnail,
      undo,
      redo
    } = useFabricCanvas({
      color,
      brushWidth,
      tool: internalTool, // Use internal tool
      onToolChange: handleToolChange, // Allow hook to update tool and notify parent
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
      getThumbnail,
      //optionally exposes the current tool
      getCurrentTool:()=> internalTool,
      undo,
      redo,
    }));

    return <canvas ref={canvasRef} className="border w-screen h-screen" />;
  }
);

FabricCanvas.displayName = "FabricCanvas";

export default FabricCanvas;
