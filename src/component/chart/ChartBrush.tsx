// [IMPORT] React and core libraries //
import React from "react";

// [IMPORT] Context providers/hooks //
import { useResponsiveSVG } from "@/context/ResponsiveSVG";
import { useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";

// [IMPORT] CSS styling //
import brushStyles from "@/component/chart/ChartBrush.module.css";

// [IMPORT] Types/interfaces //
interface ChartBrushProps {
	axisMode?: "x" | "y" | "both";
	className?: string;
	children?: React.ReactNode;
}

/**
 * ChartBrush Component
 *
 * A generic, custom brush component for chart viewports.
 * Supports X, Y, or 2D (both) brushing.
 *
 * Handles mouse/touch/stylus dragging to move the brush region.
 * All drag state is managed with refs to avoid unnecessary re-renders.
 *
 * @param axisMode - 'x', 'y', or 'both' (default: 'x')
 * @param onDimensionsChange - Callback for when the brush container is resized
 * @param onBrushMove - Callback for when the brush is moved (reports new bounds as tuples)
 */
export default function ChartBrush({ axisMode = "x", className, children }: ChartBrushProps) {
	const { width, height } = useResponsiveSVG();
	
	return (
		<g>
			{/* Background rect */}
			<rect
				x={0}
				y={0}
				width={width}
				height={height}
				fill="black"
			/>
			{children}
		</g>
	);
} 