// [IMPORT] React and core libraries //
import { createContext, useContext } from "react";

// Factory function to create a typed chart data context and hook
export function createChartDataContext<T>() {
	const ChartDataContext = createContext<T[] | undefined>(undefined);

	function useChartData() {
		const ctx = useContext(ChartDataContext);
		if (!ctx) throw new Error("useChartData must be used within a ChartDataContext.Provider");
		return ctx;
	}

	return { ChartDataContext, useChartData };
} 