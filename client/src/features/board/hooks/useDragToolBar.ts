import { useEffect, useRef, useState } from "react";
import type { DockPosition } from "../types/types";

export function useDragToolBar() {
  // Draggable toolbar state
  const [dockPosition, setDockPosition] = useState<DockPosition>("right");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
    setCurrentPos({ x: clientX, y: clientY });
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setCurrentPos({ x: clientX, y: clientY });
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const { x, y } = currentPos;

    // Determine which edge is closest
    const distances = {
      top: y,
      bottom: windowHeight - y,
      left: x,
      right: windowWidth - x,
    };

    const closest = Object.entries(distances).reduce(
      (min, [pos, dist]) =>
        dist < min.dist ? { pos: pos as DockPosition, dist } : min,
      { pos: "right" as DockPosition, dist: Infinity }
    );

    setDockPosition(closest.pos);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove);
      window.addEventListener("touchend", handleDragEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging, currentPos]);

  const getToolbarStyle = (): React.CSSProperties => {
    if (isDragging) {
      return {
        position: "fixed",
        left: `${currentPos.x}px`,
        top: `${currentPos.y}px`,
        transform: "translate(-50%, -50%)",
        cursor: "grabbing",
      };
    }

    const baseStyle: React.CSSProperties = {
      position: "fixed",
      transition: "all 0.3s ease",
    };

    switch (dockPosition) {
      case "top":
        return {
          ...baseStyle,
          top: "16px",
          left: "50%",
          transform: "translateX(-50%)",
        };
      case "bottom":
        return {
          ...baseStyle,
          bottom: "16px",
          left: "50%",
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          ...baseStyle,
          left: "16px",
          top: "50%",
          transform: "translateY(-50%)",
        };
      case "right":
        return {
          ...baseStyle,
          right: "16px",
          top: "50%",
          transform: "translateY(-50%)",
        };
    }
  };

  const isVertical = dockPosition === "left" || dockPosition === "right";

  return {
    toolbarRef,
    getToolbarStyle,
    isDragging,
    isVertical,
    handleDragStart,
  };
}
