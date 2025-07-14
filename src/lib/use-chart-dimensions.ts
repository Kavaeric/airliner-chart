import { useState, useEffect, useRef } from "react";
import { useResponsiveSize } from "./use-responsive-size";

// Interface for chart dimensions
export interface ChartDimensions {
	chartWidth: number;
	chartHeight: number;
	padding: number;
	gap: number;
}

// Interface for axis dimensions
export interface AxisDimensions {
	width: number;
	height: number;
}

/**
 * Custom hook for managing chart dimensions and responsive sizing
 * 
 * This hook handles:
 * - Container dimension measurement
 * - CSS value reading (padding, gap)
 * - Axis dimension tracking
 * - Chart area calculations
 * 
 * Returns everything needed for responsive chart layout
 */
export const useChartDimensions = () => {
	// Measure the main chart container
	const [chartContainerDimensions, chartContainerRef] = useResponsiveSize();
	
	// Track axis dimensions via callbacks
	const [yAxisDimensions, setYAxisDimensions] = useState<AxisDimensions>({ width: 0, height: 0 });
	const [xAxisDimensions, setXAxisDimensions] = useState<AxisDimensions>({ width: 0, height: 0 });

	/**
	 * Dynamically read CSS values from the chart container
	 * Ensures JavaScript calculations match actual CSS layout
	 */
	const getCSSValues = () => {
		if (!chartContainerRef.current) return { padding: 64, gap: 24 };
		
		const computedStyle = getComputedStyle(chartContainerRef.current);
		const paddingLeft = parseFloat(computedStyle.paddingLeft) || 32;
		const paddingRight = parseFloat(computedStyle.paddingRight) || 32;
		const gapValue = parseFloat(computedStyle.columnGap) || 24;
		
		return {
			padding: paddingLeft + paddingRight,
			gap: gapValue
		};
	};

	// Calculate chart dimensions
	const { padding, gap } = getCSSValues();
	
	const chartWidth = chartContainerDimensions.width > 0 && yAxisDimensions.width > 0 
		? Math.max(0, chartContainerDimensions.width - yAxisDimensions.width - padding - gap)
		: 0;
	const chartHeight = chartContainerDimensions.height > 0 && xAxisDimensions.height > 0
		? Math.max(0, chartContainerDimensions.height - xAxisDimensions.height - padding - gap)
		: 0;

	return {
		// Container info
		chartContainerDimensions,
		chartContainerRef,
		
		// Axis dimensions and setters
		yAxisDimensions,
		setYAxisDimensions,
		xAxisDimensions,
		setXAxisDimensions,
		
		// Calculated chart area
		chartDimensions: {
			chartWidth,
			chartHeight,
			padding,
			gap
		},
		
		// Helper to check if dimensions are ready
		isReady: chartContainerDimensions.width > 0 && chartContainerDimensions.height > 0
	};
}; 