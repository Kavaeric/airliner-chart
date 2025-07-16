// React/core
import { createContext, useContext } from "react";

// Interface for chart scales
export interface ChartScales {
	xScale: any;      // Full dataset scale (for brushes)
	yScale: any;      // Full dataset scale (for brushes)
	xScaleView: any;  // Chart viewport scale (for axes and plot)
	yScaleView: any;  // Chart viewport scale (for axes and plot)

	// Computed brush bounds (in pixel coordinates)
	// Use for brush rectangle UI elements or minimap view boxes
	brushBounds: {
		x: [number, number];  // X-axis brush bounds (start, end)
		y: [number, number];  // Y-axis brush bounds (start, end)
	};
	
	// Utility function for getting brush bounds for custom dimensions
	// Use this to get brush dimensions
	getBrushBounds: (axis: 'x' | 'y', width: number, height: number) => {
		x: [number, number];
		y: [number, number];
	};
}

// React context for chart scales
export const ChartScalesContext = createContext<ChartScales | undefined>(undefined);

// Hook to access scales context
export function useChartScalesContext() {
	const ctx = useContext(ChartScalesContext);
	if (!ctx) throw new Error("useChartScalesContext must be used within a ChartScalesContext.Provider");
	return ctx;
} 