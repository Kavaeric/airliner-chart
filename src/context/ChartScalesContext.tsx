// [IMPORT] React and core libraries //
import { createContext, useContext } from "react";

// Interface for chart scales
export interface ChartScales {
	xScale: any;      // Full dataset scale (for brushes)
	yScale: any;      // Full dataset scale (for brushes)
	xScaleView: any;  // Chart viewport scale (for axes and plot)
	yScaleView: any;  // Chart viewport scale (for axes and plot)
	chartViewportLimits: {
		x: [number | null, number | null];
		y: [number | null, number | null];
	};
}

// React context for chart scales
export const ChartScalesContext = createContext<ChartScales | undefined>(undefined);

// Hook to access scales context
export function useChartScales() {
	const ctx = useContext(ChartScalesContext);
	if (!ctx) throw new Error("useChartScales must be used within a ChartScalesContext.Provider");
	return ctx;
} 