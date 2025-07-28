// [IMPORT] React and core libraries //
import React from "react";

/**
 * ChartBrushDragContext
 *
 * Context for sharing drag handlers between ChartBrush and its child components.
 * Allows ChartBrushControl to access the drag logic from ChartBrush.
 */
export const ChartBrushDragContext = React.createContext<{
	handlePointerDown: (e: React.PointerEvent) => void;
} | null>(null);

/**
 * Hook to access the brush drag context
 */
export const useBrushDragContext = () => {
	const context = React.useContext(ChartBrushDragContext);
	if (!context) {
		throw new Error("useBrushDragContext must be used within a ChartBrushDragContext.Provider");
	}
	return context;
}; 