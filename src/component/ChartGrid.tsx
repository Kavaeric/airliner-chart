"use client";

import { ReactNode, forwardRef } from "react";
import styles from "../app/page.module.css";

// Props for the chart grid component
interface ChartGridProps {
	children: ReactNode;
	className?: string;
}

/**
 * ChartGrid Component
 * 
 * A reusable 2x2 grid layout for chart components:
 * - Top-left: Y-axis
 * - Top-right: Main chart area
 * - Bottom-right: X-axis
 * - Bottom-left: Reserved for legend/controls
 * 
 * This component handles the CSS Grid layout and provides
 * consistent structure for any chart type.
 */
const ChartGrid = forwardRef<HTMLDivElement, ChartGridProps>(
	({ children, className }, ref) => {
		return (
			<div ref={ref} className={`${styles.chartContainer} ${className || ''}`}>
				{children}
			</div>
		);
	}
);

ChartGrid.displayName = "ChartGrid";

export default ChartGrid;

// Export the grid area classes for use in child components
export const gridAreas = {
	yAxis: styles.yAxis,
	chartArea: styles.chartArea,
	xAxis: styles.xAxis,
	bottomLeft: styles.bottomLeft
}; 