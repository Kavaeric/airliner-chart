// [IMPORT] Third-party libraries //
import { scaleLinear } from "@visx/scale";
import { useMemo } from "react";

// [IMPORT] Types/interfaces //
import type { ChartViewport } from "@/types/zoom";

/**
 * useChartScales
 *
 * Custom hook for creating x and y scales for a chart area.
 * - Receives chart area dimensions (width, height) and explicit value arrays
 * - Automatically filters out undefined, null, and NaN values
 * - Calculates min/max domains from the filtered value arrays
 * - Returns both full dataset scales and chart viewport scales
 *
 * This hook is stateless and pure: all logic is based on the provided values and dimensions.
 * The hook automatically filters out invalid values, so callers can pass raw data arrays.
 *
 * @param chartDimensions - The chart area dimensions (width, height)
 * @param config - Configuration with explicit x and y value arrays, labels, and paddings
 * @param chartViewport - Chart viewport defining the current visible data range
 */
export const useChartScales = (
	chartDimensions: { width: number; height: number },
	config: {
		xValues: number[]; // Array of all x-axis values for domain calculation (used to determine min/max range)
		yValues: number[]; // Array of all y-axis values for domain calculation (used to determine min/max range)
		xLabel?: string; // Label displayed on the x-axis
		yLabel?: string; // Label displayed on the y-axis
		xPadding?: number; // Optional margin to add/subtract from the x domain (in data units)
		yPadding?: number; // Optional margin to add/subtract from the y domain (in data units)
		xNiceRounding?: number; // Optional rounding for the x-axis (nearest multiple)
		yNiceRounding?: number; // Optional rounding for the y-axis (nearest multiple)
		chartViewportLimits?: {
			x: [number | null, number | null]; // Optional limits for x axis [min, max]
			y: [number | null, number | null]; // Optional limits for y axis [min, max]
		};
	},
	chartViewport: ChartViewport
) => {
	const { width: chartWidth, height: chartHeight } = chartDimensions;
	const { xValues, yValues, xPadding = 0, yPadding = 0, xNiceRounding = 1, yNiceRounding = 1, chartViewportLimits } = config;

	// Filter out invalid values (undefined, null, NaN)
	const cleanXValues = xValues.filter((v): v is number => typeof v === 'number' && !isNaN(v));
	const cleanYValues = yValues.filter((v): v is number => typeof v === 'number' && !isNaN(v));

	// Find the minimum and maximum values in the cleaned up X values
	const xMin = cleanXValues.length > 0 ? Math.min(...cleanXValues) : 0;
	const xMax = cleanXValues.length > 0 ? Math.max(...cleanXValues) : 1;
	// Add the optional margin to the domain and niceify it
	const xDomain = [
		Math.floor((xMin - xPadding) / xNiceRounding) * xNiceRounding,
		Math.ceil((xMax + xPadding) / xNiceRounding) * xNiceRounding
	];

	// Ditto, for Y values
	const yMin = cleanYValues.length > 0 ? Math.min(...cleanYValues) : 0;
	const yMax = cleanYValues.length > 0 ? Math.max(...cleanYValues) : 1;
	const yDomain = [
		Math.floor((yMin - yPadding) / yNiceRounding) * yNiceRounding,
		Math.ceil((yMax + yPadding) / yNiceRounding) * yNiceRounding
	];

	// Create full dataset scales
	// Memoize the scales to prevent unnecessary re-renders
	const xScale = useMemo(
		() => scaleLinear<number>({
			domain: xDomain,
			range: [0, Math.max(1, chartWidth)],
		}),
		[xDomain[0], xDomain[1], chartWidth]
	);

	const yScale = useMemo(
		() => scaleLinear<number>({
			domain: yDomain,
			range: [Math.max(1, chartHeight), 0],
		}),
		[yDomain[0], yDomain[1], chartHeight]
	);

	// Create chart viewport scales
	const xScaleView = useMemo(
		() => scaleLinear<number>({
			domain: [chartViewport.x[0], chartViewport.x[1]],
			range: [0, Math.max(1, chartWidth)],
		}),
		[chartViewport.x[0], chartViewport.x[1], chartWidth]
	);

	const yScaleView = useMemo(
		() => scaleLinear<number>({
			domain: [chartViewport.y[0], chartViewport.y[1]],
			range: [Math.max(1, chartHeight), 0],
		}),
		[chartViewport.y[0], chartViewport.y[1], chartHeight]
	);

	return {
		xScale,      // Full dataset scale (for brushes)
		yScale,      // Full dataset scale (for brushes)
		xScaleView,  // Chart viewport scale (for axes and plot)
		yScaleView,  // Chart viewport scale (for axes and plot)
		chartViewportLimits: chartViewportLimits || {
			x: [null, null] as [number | null, number | null],
			y: [null, null] as [number | null, number | null],
		},
	};
}; 