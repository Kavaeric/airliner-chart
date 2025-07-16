import { useContainerSize } from "./use-container-size";
import { calculateBoxModel } from "./calculate-box-model";

// Interface for chart dimensions (pure DOM layout)
export interface ChartDimensions {
	chartWidth: number;
	chartHeight: number;
	padding: number;
}

// Interface for the complete chart layout (pure DOM layout)
export interface ChartLayout {
	chartDimensions: ChartDimensions;
	isChartLoaded: boolean;
}

/**
 * useChartDimensions
 *
 * Custom hook for measuring the chart container's pixel size and padding.
 * - Returns the container's width, height, and horizontal padding (from CSS)
 * - Returns a ref to attach to the container element
 * - Returns isChartLoaded flag for when measurement is available
 *
 * This hook is intentionally focussed: it does NOT measure axes or chart area.
 * Axis measurement is handled by child components, reported up to the parent.
 *
 * This separation ensures robust, race-condition-free layout logic.
 */
export const useChartDimensions = (): [ChartLayout, React.RefObject<HTMLDivElement | null>] => {
	// Measure the main chart container's width/height responsively
	const [chartDimensions, chartContainerRef] = useContainerSize();

	// Calculate box model (padding, border, margin) from computed CSS
	const boxModel = calculateBoxModel(chartContainerRef.current);

	const layout: ChartLayout = {
		chartDimensions: {
			chartWidth: chartDimensions.width,
			chartHeight: chartDimensions.height,
			padding: boxModel.padding.total.horizontal
		},
		isChartLoaded: chartDimensions.width > 0 && chartDimensions.height > 0
	};

	return [layout, chartContainerRef];
}; 