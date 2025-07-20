// [IMPORT] React and core libraries //
import { useState, useCallback } from "react";

// [IMPORT] Utilities/helpers //
import { clampAndSlide } from "@/lib/utils/clamp-and-slide";

// [IMPORT] Types/interfaces //
import type { ChartViewport } from "@/types/zoom";

/**
 * useChartViewport
 *
 * React hook for managing the visible data range (viewport) of a chart, with optional enforcement of axis limits.
 *
 * @param {ChartViewport} initialViewport
 *   The initial viewport, specifying the [min, max] for both x and y axes.
 * 
 * @param {{ x: [number|null, number|null], y: [number|null, number|null] }} [chartViewportLimits]
 *   Optional axis limits. Each axis is a tuple [min, max], where a value can be a number (to enforce a bound) or null (no bound).
 *   Example: { x: [0, 100], y: [null, 50] } restricts x between 0 and 100, and y to a maximum of 50.
 *
 * @returns {[ChartViewport, (newViewport: ChartViewport, limits?: { x: [number|null, number|null]; y: [number|null, number|null] }) => void]}
 *   Returns the current viewport and a setter function that enforces the specified limits.
 */
export const useChartViewport = (
	initialViewport: ChartViewport,
	chartViewportLimits?: {
		x: [number | null, number | null];
		y: [number | null, number | null];
	}
) => {
	const [chartViewport, setChartViewport] = useState<ChartViewport>(initialViewport);

	/**
	 * Sets chart viewport with automatic viewport limit enforcement
	 * 
	 * @param newViewport - The desired chart viewport
	 * @param limits - Optional override limits (uses hook limits if not provided)
	 */
	const setChartViewportWithLimits = useCallback((
		newViewport: ChartViewport,
		limits = chartViewportLimits
	) => {
		// If no limits are provided, set viewport directly
		if (!limits) {
			setChartViewport(newViewport);
			return;
		}

		// Clamp and slide logic for both axes
		const limitedX = clampAndSlide(newViewport.x, limits.x ?? [null, null]);
		const limitedY = clampAndSlide(newViewport.y, limits.y ?? [null, null]);

		setChartViewport({
			x: limitedX,
			y: limitedY
		});
	}, [chartViewportLimits]);

	/**
	 * Resets chart viewport to the provided bounds
	 * 
	 * @param bounds - The bounds to reset to (uses initial viewport if not provided)
	 */
	const resetChartViewport = useCallback((bounds?: ChartViewport) => {
		const targetViewport = bounds || initialViewport;
		setChartViewportWithLimits(targetViewport);
	}, [initialViewport, setChartViewportWithLimits]);

	/**
	 * Moves the chart viewport by the specified offset
	 * 
	 * @param xOffset - Horizontal offset to move by
	 * @param yOffset - Vertical offset to move by (defaults to 0)
	 */
	const moveChartViewport = useCallback((xOffset: number, yOffset: number = 0) => {
		setChartViewportWithLimits({
			x: [chartViewport.x[0] + xOffset, chartViewport.x[1] + xOffset],
			y: [chartViewport.y[0] + yOffset, chartViewport.y[1] + yOffset]
		});
	}, [chartViewport, setChartViewportWithLimits]);

	/**
	 * Zooms the viewport by the specified amount
	 * 
	 * @param xZoom - Horizontal zoom amount (positive = zoom in, negative = zoom out)
	 * @param yZoom - Vertical zoom amount (positive = zoom in, negative = zoom out)
	 */
	const zoomChartViewport = useCallback((xZoom: number, yZoom: number = 0) => {
		setChartViewportWithLimits({
			x: [chartViewport.x[0] + xZoom, chartViewport.x[1] - xZoom],
			y: [chartViewport.y[0] + yZoom, chartViewport.y[1] - yZoom]
		});
	}, [chartViewport, setChartViewportWithLimits]);

	return {
		chartViewport,
		setChartViewportWithLimits,
		resetChartViewport,
		moveChartViewport,
		zoomChartViewport
	};
}; 