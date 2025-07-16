// [IMPORT] React and core libraries //
import { createContext, useContext } from "react";

// Interface for static chart config
export interface ChartFormat {
	xLabel: string; // X axis label
	yLabel: string; // Y axis label
	xPadding: number; // X axis domain margin
	yPadding: number; // Y axis domain margin
}

// React context for chart config
export const ChartFormatContext = createContext<ChartFormat | undefined>(undefined);

// Hook to access format context
export function useChartFormat() {
	const ctx = useContext(ChartFormatContext);
	if (!ctx) throw new Error("useChartFormat must be used within a ChartFormatContext.Provider");
	return ctx;
} 