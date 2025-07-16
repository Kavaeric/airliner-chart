// [IMPORT] React and core libraries //
import React from "react";

// [IMPORT] Internal components //
import ChartBrushScatter from "./ChartBrushScatter";

// [IMPORT] Context providers/hooks //
import { useChartScalesContext } from "../context/ChartScalesContext";
import { useChartData } from "./AirlinerChart";

// [IMPORT] Utilities/helpers //
import { useResponsiveSize } from "../lib/use-responsive-size";

// [IMPORT] Types/interfaces //
interface ChartBrushProps {
	width: number;
	height: number;
	axisMode?: "x" | "y" | "both";
	onDimensionsChange?: (dims: { width: number; height: number }) => void;
	// Callback for moving the brush
	onBrushMove?: (bounds: { x?: [number, number]; y?: [number, number] }) => void;
	// Future: onBrushStart, onBrushEnd, etc.
}

// [IMPORT] CSS styling //
import brushStyles from "./ChartBrush.module.css";
import responsiveStyles from "./ResponsiveSVG.module.css";

/**
 * ChartBrush Component
 *
 * A generic, custom brush component for chart viewports.
 * Supports X, Y, or 2D (both) brushing.
 *
 * Handles mouse/touch/stylus dragging to move the brush region.
 * All drag state is managed with refs to avoid unnecessary re-renders.
 *
 * @param width - The width of the brush SVG area (in pixels)
 * @param height - The height of the brush SVG area (in pixels)
 * @param axisMode - 'x', 'y', or 'both' (default: 'x')
 * @param onDimensionsChange - Callback for when the brush container is resized
 * @param onBrushMove - Callback for when the brush is moved (reports new bounds as tuples)
 */
export default function ChartBrush({ width, height, axisMode = "x", onDimensionsChange, onBrushMove }: ChartBrushProps) {
	const { xScale, yScale, getBrushBounds } = useChartScalesContext();
	const ref = useResponsiveSize(onDimensionsChange);
	const data = useChartData();

	// Drag to move logic
	// These refs track the drag state across pointer events
	const isDragging = React.useRef(false); // True if a drag is in progress
	const dragStart = React.useRef<{ x: number; y: number } | null>(null); // Initial pointer position
	const lastPos = React.useRef<{ x: number; y: number } | null>(null);   // Last pointer position (for delta calculation)
	// Store the brush bounds at the start of the drag
	const dragStartBrushBounds = React.useRef<{ x: [number, number]; y: [number, number] } | null>(null);

	// --- Drag event handlers ---

	/**
	 * handlePointerDown: Called when the user presses down on the brush rect (mouse, touch, or stylus).
	 * Sets up drag state and attaches global listeners for pointermove/pointerup so dragging continues even if the pointer leaves the SVG.
	 */
	function handlePointerDown(e: React.PointerEvent) {
		isDragging.current = true;
		dragStart.current = { x: e.clientX, y: e.clientY };
		lastPos.current = { x: e.clientX, y: e.clientY };
		dragStartBrushBounds.current = {
			x: [clampedBounds.x[0], clampedBounds.x[1]],
			y: [clampedBounds.y[0], clampedBounds.y[1]],
		};
		
		// Attach global listeners so drag continues even if pointer leaves the SVG
		document.addEventListener("pointermove", handlePointerMove);
		document.addEventListener("pointerup", handlePointerUp);
	}

	/**
	 * handlePointerMove: Called whenever the pointer moves while dragging.
	 * Calculates the total delta from drag start, applies it to the original brush bounds,
	 * and reports the new bounds to the parent via onBrushMove.
	 *
	 * @param event - PointerEvent from the browser
	 */
	function handlePointerMove(event: PointerEvent) {
		// If a drag is not in progress, or if any of the required refs are missing, do nothing
		// This prevents errors if the pointer event fires unexpectedly or before a drag has started
		if (!isDragging.current || !dragStart.current || !lastPos.current || !dragStartBrushBounds.current) return;

		// Get the current pointer position from the browser event
		const current = { x: event.clientX, y: event.clientY };

		// Calculate how far the pointer has moved since the drag started
		// deltaX and deltaY represent the total movement in pixels along each axis
		const deltaX = current.x - dragStart.current.x;
		const deltaY = current.y - dragStart.current.y;

		// Update the last known pointer position
		// This is used to track the drag as the pointer moves
		lastPos.current = current;
		
		// Ignore tiny movements (noise)
		if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

		// Calculate new brush bounds based on drag start
		// The callback will report only the set of coordinates relevant to the axis mode
		if (axisMode === "both") {
			const x: [number, number] = [dragStartBrushBounds.current.x[0] + deltaX, dragStartBrushBounds.current.x[1] + deltaX];
			const y: [number, number] = [dragStartBrushBounds.current.y[0] + deltaY, dragStartBrushBounds.current.y[1] + deltaY];
			if (onBrushMove) onBrushMove({ x, y });
		} else if (axisMode === "y") {
			const y: [number, number] = [dragStartBrushBounds.current.y[0] + deltaY, dragStartBrushBounds.current.y[1] + deltaY];
			if (onBrushMove) onBrushMove({ y });
		} else {
			const x: [number, number] = [dragStartBrushBounds.current.x[0] + deltaX, dragStartBrushBounds.current.x[1] + deltaX];
			if (onBrushMove) onBrushMove({ x });
		}
	}

	/**
	 * handlePointerUp: Called when the user releases the pointer (mouse up, touch end, etc.).
	 * Cleans up drag state and removes global listeners to avoid memory leaks.
	 */
	function handlePointerUp() {
		isDragging.current = false;
		dragStart.current = null;
		lastPos.current = null;
		dragStartBrushBounds.current = null;
		// Remove global listeners to avoid memory leaks
		document.removeEventListener("pointermove", handlePointerMove);
		document.removeEventListener("pointerup", handlePointerUp);
	}

	// Get brush bounds for the selected axis
	const bounds = getBrushBounds();

	// Clamp brush bounds to prevent overflow outside the brushing area
	const clampedBounds = {
		x: [
			Math.max(0, Math.min(width, bounds.x[0])),
			Math.max(0, Math.min(width, bounds.x[1]))
		] as [number, number],
		y: [
			Math.max(0, Math.min(height, bounds.y[0])),
			Math.max(0, Math.min(height, bounds.y[1]))
		] as [number, number],
	};

	// If not ready, render an empty div (prevents layout shift)
	if (width === 0 || height === 0) {
		return <div className={brushStyles.chartBrush} ref={ref} />;
	}

	// Calculate the rectangle position and size based on the axis mode
	let chartBrushControlProps;
	if (axisMode === "y") {
		// Y axis brush: dynamic bounds for height, static width
		chartBrushControlProps = {
			x: 0,
			width: width,
			y: clampedBounds.y[0],
			height: clampedBounds.y[1] - clampedBounds.y[0],
		};
	} else {
		// X axis brush: dynamic bounds for width, static height
		chartBrushControlProps = {
			x: clampedBounds.x[0],
			width: clampedBounds.x[1] - clampedBounds.x[0],
			y: 0,
			height: height,
		};
	}

	// Applies the correct class names to the parent div based on the axis mode
	const parentDivClassNames = {
		y: `${brushStyles.chartBrush} ${brushStyles.yBrush}`,
		x: `${brushStyles.chartBrush} ${brushStyles.xBrush}`,
		both: brushStyles.chartBrush,
	}
	
	return (
		<div className={`${parentDivClassNames[axisMode]} ${responsiveStyles.responsiveContainer}`} ref={ref}>
			<svg className={responsiveStyles.responsiveSVG}>

				{/* Brush control rectangle */}
				<rect
					className={`${brushStyles.chartBrushControl} ${brushStyles.chartBrushControl}`}
					{...chartBrushControlProps}
					onPointerDown={handlePointerDown} // Start drag on pointer down
					style={{ cursor: "move" }} // Show move cursor for clarity
				/>

				{/* Brush scatter plot: render major/minor markers for each available pax measurement */}
				<ChartBrushScatter
					width={width}
					height={height}
					axisMode={axisMode}
					xScale={xScale}
					yScale={yScale}
					data={data}
				/>
			</svg>
		</div>
	);
} 