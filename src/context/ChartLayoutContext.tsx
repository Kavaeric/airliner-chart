// [IMPORT] React and core libraries //
import { createContext, useContext } from "react";

// Interface for layout and tick info
export interface ChartLayout {
	chartWidth: number; // Total chart width (px)
	chartHeight: number; // Total chart height (px)
	paddingHorizontal: number; // Total horizontal padding (px)
	paddingVertical: number; // Total vertical padding (px)
	xAxisDims: { width: number; height: number }; // X axis dimensions (px)
	yAxisDims: { width: number; height: number }; // Y axis dimensions (px)
	xBrushDims: { width: number; height: number }; // X brush dimensions (px)
	yBrushDims: { width: number; height: number }; // Y brush dimensions (px)
	xTickCount: number; // Number of axes ticks for X axis
	yTickCount: number; // Number of axes ticks for Y axis
	yTickGridCount: number; // Number of grid ticks for Y axis
	xTickGridCount: number; // Number of grid ticks for X axis
	isChartLoaded: boolean; // True if layout is measured and ready
}

// React context for layout info
export const ChartLayoutContext = createContext<ChartLayout | undefined>(undefined);

// Hook to access layout context
export function useChartLayout() {
	const ctx = useContext(ChartLayoutContext);
	if (!ctx) throw new Error("useChartLayout must be used within a ChartLayoutContext.Provider");
	return ctx;
} 