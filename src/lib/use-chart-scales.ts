import { scaleLinear } from "@visx/scale";

// Generic data accessor function type
export type DataAccessor<T> = (d: T) => number;

// Interface for scale configuration
export interface ScaleConfig<T> {
	xAccessor: DataAccessor<T>;
	yAccessor: DataAccessor<T>;
	xLabel?: string;
	yLabel?: string;
	/**
	 * Optional margin to add/subtract from the x domain (in data units).
	 * If provided, the x-axis will start at (min - xMargin) and end at (max + xMargin).
	 */
	xMargin?: number;
	/**
	 * Optional margin to add/subtract from the y domain (in data units).
	 * If provided, the y-axis will start at (min - yMargin) and end at (max + yMargin).
	 */
	yMargin?: number;
}

/**
 * useChartScales
 *
 * Custom hook for creating x and y scales for a chart area.
 * - Receives chart area dimensions (width, height) and data accessors
 * - Returns visx scale objects for x and y axes
 *
 * This hook is generic and can be used for any scatter/line chart with numeric axes.
 * It is stateless and pure: all logic is based on the provided data and dimensions.
 *
 * @param data - The dataset to create scales for
 * @param chartDimensions - The chart area dimensions (width, height)
 * @param config - Configuration for x and y axis accessors and labels
 */
export const useChartScales = <T>(
	data: T[],
	chartDimensions: { width: number; height: number },
	config: ScaleConfig<T>
) => {
	const { width: chartWidth, height: chartHeight } = chartDimensions;
	const { xAccessor, yAccessor, xMargin = 0, yMargin = 0 } = config;

	// Compute x domain with optional margin
	const xVals = data.map(xAccessor);
	const xMin = xVals.length > 0 ? Math.min(...xVals) : 0;
	const xMax = xVals.length > 0 ? Math.max(...xVals) : 1;
	const xDomain = [xMin - xMargin, xMax + xMargin];

	// Compute y domain with optional margin
	const yVals = data.map(yAccessor);
	const yMin = yVals.length > 0 ? Math.min(...yVals) : 0;
	const yMax = yVals.length > 0 ? Math.max(...yVals) : 1;
	const yDomain = [yMin - yMargin, yMax + yMargin];

	// Create x-scale (horizontal, left-to-right)
	const xScale = scaleLinear<number>({
		domain: xDomain,
		range: [0, Math.max(1, chartWidth)],
		nice: true,
	});

	// Create y-scale (vertical, top-to-bottom in SVG coordinates)
	const yScale = scaleLinear<number>({
		domain: yDomain,
		range: [Math.max(1, chartHeight), 0],
		nice: true,
	});

	return {
		xScale,
		yScale,
	};
}; 