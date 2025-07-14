import { scaleLinear } from "@visx/scale";
import { ChartDimensions } from "./use-chart-dimensions";

// Generic data accessor function type
export type DataAccessor<T> = (d: T) => number;

// Interface for scale configuration
export interface ScaleConfig<T> {
	xAccessor: DataAccessor<T>;
	yAccessor: DataAccessor<T>;
	xLabel?: string;
	yLabel?: string;
}

/**
 * Custom hook for creating chart scales
 * 
 * This hook creates shared scales for consistent data mapping across chart components.
 * It's generic and can work with any dataset that has numeric x and y values.
 * 
 * @param data - The dataset to create scales for
 * @param chartDimensions - The calculated chart dimensions
 * @param config - Configuration for x and y axis accessors and labels
 */
export const useChartScales = <T>(
	data: T[],
	chartDimensions: ChartDimensions,
	config: ScaleConfig<T>
) => {
	const { chartWidth, chartHeight } = chartDimensions;
	const { xAccessor, yAccessor } = config;

	// Create x-scale (horizontal)
	const xScale = scaleLinear<number>({
		domain: data.length > 0 
			? [Math.min(...data.map(xAccessor)), Math.max(...data.map(xAccessor))] 
			: [0, 1],
		range: [0, Math.max(1, chartWidth)],
		nice: true,
	});

	// Create y-scale (vertical, inverted for SVG coordinate system)
	const yScale = scaleLinear<number>({
		domain: data.length > 0 
			? [Math.min(...data.map(yAccessor)), Math.max(...data.map(yAccessor))] 
			: [0, 1],
		range: [Math.max(1, chartHeight), 0],
		nice: true,
	});

	return {
		xScale,
		yScale,
		// Helper to check if scales are valid
		isValid: data.length > 0 && chartWidth > 0 && chartHeight > 0
	};
}; 