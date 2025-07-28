// [IMPORT] React and core libraries //
import React from "react";
import { RectClipPath } from "@visx/clip-path";

// [IMPORT] Context providers/hooks //
import { useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";
import { useResponsiveSVG } from "@/context/ResponsiveSVG";

// [IMPORT] CSS styling //
import brushStyles from "@/component/chart/ChartBrush.module.css";

/**
 * ChartBrushControl Component
 *
 * Generic wrapper component that provides draggable brush control functionality.
 * Contains the brush control rectangle and clips child elements to the brush control area.
 * Uses @visx/RectClipPath for clipping functionality.
 *
 * @param axisMode - 'x', 'y', or 'both' axis mode
 * @param clampedBounds - The current brush bounds for clipping
 * @param children - Child elements to be clipped to the brush area
 * @param className - Optional CSS class for styling
 */
interface ChartBrushControlProps {
	axisMode: "x" | "y" | "both";
	children: React.ReactNode;
	className?: string;
}

export default function ChartBrushControl({ 
	axisMode, 
	children, 
	className 
}: ChartBrushControlProps) {
	// Get dimensions from ResponsiveSVG
	const { width, height } = useResponsiveSVG();
	
	// Get the drag handler from ResponsiveChartViewport
	const { dataScale, viewportScale, drag } = useResponsiveChartViewport();

	// Generate unique clip path ID based on axis mode
	const clipPathId = `brush-clip-${axisMode}`;

	// Determine the size and position of the brush control rectangle based on the current viewportScale relative to dataScale
	const brushRect = (() => {
		if (axisMode === "x") {
			// X-axis brush: calculate width based on viewport scale, full height
			const viewportXMin = viewportScale.x.domain()[0];
			const viewportXMax = viewportScale.x.domain()[1];
			
			// Calculate the brush rectangle as a proportion of the full data range
			const brushXMin = (dataScale.x as any)(viewportXMin) ?? 0;
			const brushXMax = (dataScale.x as any)(viewportXMax) ?? width;
			
			return {
				x: brushXMin,
				y: 0,
				width: brushXMax - brushXMin,
				height: height
			};
		} else if (axisMode === "y") {
			// Y-axis brush: calculate height based on viewport scale, full width
			const viewportYMin = viewportScale.y.domain()[0];
			const viewportYMax = viewportScale.y.domain()[1];
			
			// Calculate the brush rectangle as a proportion of the full data range
			const brushYMin = (dataScale.y as any)(viewportYMax) ?? 0; // Note: Y scale is inverted
			const brushYMax = (dataScale.y as any)(viewportYMin) ?? height;
			
			return {
				x: 0,
				y: brushYMin,
				width: width,
				height: brushYMax - brushYMin
			};
		} else {
			// Both axes: calculate both dimensions
			const viewportXMin = viewportScale.x.domain()[0];
			const viewportXMax = viewportScale.x.domain()[1];
			const viewportYMin = viewportScale.y.domain()[0];
			const viewportYMax = viewportScale.y.domain()[1];
			
			const brushXMin = (dataScale.x as any)(viewportXMin) ?? 0;
			const brushXMax = (dataScale.x as any)(viewportXMax) ?? width;
			const brushYMin = (dataScale.y as any)(viewportYMax) ?? 0; // Note: Y scale is inverted
			const brushYMax = (dataScale.y as any)(viewportYMin) ?? height;

			console.log("brushRect", brushXMin, brushXMax, brushYMin, brushYMax);
			
			return {
				x: brushXMin,
				y: brushYMin,
				width: brushXMax - brushXMin,
				height: brushYMax - brushYMin
			};
		}
	})();

	return (
		<g className={className}>
			{/* Define the clip path using @visx/RectClipPath */}
			<RectClipPath
				id={clipPathId}
				x={brushRect.x}
				y={brushRect.y}
				width={brushRect.width}
				height={brushRect.height}
			/>
			
			{/* Clipped content area */}
			<g clipPath={`url(#${clipPathId})`}>
				{children}
			</g>

			{/* Brush control rectangle (visible handle for dragging) */}
			<rect
				x={brushRect.x}
				y={brushRect.y}
				width={brushRect.width}
				height={brushRect.height}
				onMouseDown={(e) => drag.start(e, axisMode, true)}
				onMouseMove={(e) => drag.move(e, true)}
				onMouseUp={(e) => drag.end(e)}
				onTouchStart={(e) => drag.start(e, axisMode, true)}
				onTouchMove={(e) => drag.move(e, true)}
				onTouchEnd={(e) => drag.end(e)}
				onTouchCancel={(e) => drag.end(e)}
				fill="transparent"
				style={{ cursor: "move", touchAction: "none" }}
			/>
		</g>
	);
} 