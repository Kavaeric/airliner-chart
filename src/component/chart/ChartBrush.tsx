// [IMPORT] React and core libraries //
import React, { useCallback } from "react";
import { RectClipPath } from "@visx/clip-path";

// [IMPORT] Context providers/hooks //
import { useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";
import { useResponsiveSVG } from "@/context/ResponsiveSVG";
import { useAnimatedChartViewport } from "@/context/AnimatedChartViewport";

/**
 * ChartBrush Component
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
interface ChartBrushProps {
	axisMode: "x" | "y" | "both";
	children: React.ReactNode;
	className?: string;
}

export default function ChartBrush({ 
	axisMode, 
	children, 
	className 
}: ChartBrushProps) {
	// Get dimensions from ResponsiveSVG
	const { width, height } = useResponsiveSVG();
	
	// Get the drag handler from ResponsiveChartViewport
	const { dataScale, viewportScale, drag, view } = useResponsiveChartViewport();
	const { animatedScale, setAnimationDuration } = useAnimatedChartViewport();

	/**
	 * handleWheel
	 * 
	 * Custom wheel handler that sets animation duration for wheel interactions.
	 * Sets 100ms animation duration for smooth wheel zoom transitions.
	 */
	const handleWheel = useCallback((event: React.WheelEvent) => {
		// Set animation duration for wheel interactions
		setAnimationDuration(100);
		
		// Handle wheel event for zooming
		const delta = event.deltaY;
		const baseZoomFactor = delta < 0 ? 1.1 : 0.9; // Zoom in by 10% or zoom out by 10%
		const zoomFactor = baseZoomFactor;
		
		// Calculate zoom center from event position
		if (event && event.currentTarget) {
			const rect = (event.currentTarget as Element).getBoundingClientRect();
			const mouseX = event.clientX - rect.left;
			const mouseY = event.clientY - rect.top;
			
			const zoomCenterX = (viewportScale.x as any).invert(mouseX);
			const zoomCenterY = (viewportScale.y as any).invert(mouseY);
			
			// Apply zoom with constraints, respecting the axis mode
			view.zoom(zoomFactor, { x: zoomCenterX, y: zoomCenterY }, axisMode);
		}
		
		// Prevent default browser scrolling
		event.preventDefault();
	}, [setAnimationDuration, viewportScale.x, viewportScale.y, view, axisMode]);

	/**
	 * handleDragStart
	 * 
	 * Custom drag start handler that sets animation duration to 0 for immediate response.
	 */
	const handleDragStart = useCallback(() => {
		setAnimationDuration(0);
	}, [setAnimationDuration]);

	// Use drag-only binding instead of bindGestures to separate wheel and drag handling
	const brushDragBind = drag.bindDrag({ 
		axis: axisMode, 
		invert: true, // ChartBrush uses inverted drag direction
		useFullDataScale: true // Use full data range for consistent brush speed regardless of zoom level
	});

	// Determine the size and position of the brush control rectangle based on the current viewportScale relative to dataScale
	const brushRect = (() => {
		if (axisMode === "x") {
			// X-axis brush: calculate width based on viewport scale, full height
			const viewportXMin = animatedScale.x.domain()[0];
			const viewportXMax = animatedScale.x.domain()[1];
			
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
			const viewportYMin = animatedScale.y.domain()[0];
			const viewportYMax = animatedScale.y.domain()[1];
			
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
			const viewportXMin = animatedScale.x.domain()[0];
			const viewportXMax = animatedScale.x.domain()[1];
			const viewportYMin = animatedScale.y.domain()[0];
			const viewportYMax = animatedScale.y.domain()[1];
			
			const brushXMin = (dataScale.x as any)(viewportXMin) ?? 0;
			const brushXMax = (dataScale.x as any)(viewportXMax) ?? width;
			const brushYMin = (dataScale.y as any)(viewportYMax) ?? 0; // Note: Y scale is inverted
			const brushYMax = (dataScale.y as any)(viewportYMin) ?? height;
			
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
				id={`brush-clip-${axisMode}`}
				x={brushRect.x}
				y={brushRect.y}
				width={brushRect.width}
				height={brushRect.height}
			/>
			
			{/* Clipped content area */}
			<g clipPath={`url(#brush-clip-${axisMode})`}>
				{children}
			</g>

			{/* Brush control rectangle (visible handle for dragging) */}
			<rect
				x={0}
				y={0}
				width={width}
				height={height}
				{...brushDragBind}
				onWheel={handleWheel}
				onMouseDown={handleDragStart}
				fill="transparent"
				style={{ 
					touchAction: "none",
				}}
				data-chart-viewport="true"
			/>
		</g>
	);
} 