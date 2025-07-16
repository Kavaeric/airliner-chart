"use client";

import { ReactNode, forwardRef } from "react";

// CSS
import chartStyles from "./ChartContainer.module.css";

// Props for the chart container component
interface ChartContainerProps {
	children: React.ReactNode;
	className?: string;
}

/**
 * ChartContainer Component
 * 
 * A reusable 3x3 grid layout for chart components:
 * ┌─────────────┬─────────────┬─────────────┐
 * │ Y Brush     │ Y Axis      │ Chart Area  │
 * ├─────────────┼─────────────┼─────────────┤
 * │ empty       │ empty       │ X Axis      │
 * ├─────────────┼─────────────┼─────────────┤
 * │ empty       │ empty       │ X Brush     │
 * └─────────────┴─────────────┴─────────────┘
 * 
 * This component handles the CSS Grid layout and provides
 * consistent structure for any chart type with brush functionality.
 */
const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(
	({ children, className }, ref) => {
		return (
			<div ref={ref} className={`${chartStyles.chartContainer} ${className || ''}`}>
				{children}
				<div className={chartStyles.empty1}></div>
				<div className={chartStyles.empty2}></div>
				<div className={chartStyles.empty3}></div>
				<div className={chartStyles.empty4}></div>
			</div>
		);
	}
);

ChartContainer.displayName = "ChartContainer";

export default ChartContainer;
