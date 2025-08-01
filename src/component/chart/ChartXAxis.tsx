"use client";

// [IMPORT] Third-party libraries //
import { AxisBottom } from "@visx/axis";

// [IMPORT] Context providers/hooks //
import { useResponsiveSVG } from "@/context/ResponsiveSVG";
import { useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";

interface XAxisProps {
	label?: string;
}

/**
 * XAxis Component
 *
 * Renders the bottom axis for the chart using visx.
 * - Measures its own rendered size using a ref and ResizeObserver
 * - Reports its dimensions up to the parent via onDimensionsChange
 * - Receives all layout and scale info as props
 * - Renders ticks and gridlines
 *
 * This enables robust, race-condition-free axis measurement and layout.
 */
export default function XAxis({ label }: XAxisProps) {
	const { viewportScale, mouse } = useResponsiveChartViewport();
	const { width, height } = useResponsiveSVG();
	
	return (
		<g>

			{/* Range figure line - always renders, follows mouse */}
			<line
				x1={mouse.isOverChart && mouse.coordinates ? mouse.coordinates.screen.x : 0}
				y1={height}
				x2={mouse.isOverChart && mouse.coordinates ? mouse.coordinates.screen.x : 0}
				y2={0}
				className="xAxisReadoutLine"
			/>

			
			{/* Render the axis */}
			<AxisBottom
				scale={viewportScale.x}
				numTicks={10}
				tickLength={4}

				axisClassName="axis"
				axisLineClassName="axisLine"
				tickClassName="tick"
			/>

			{/* Render the axis label */}
			<text
				x={width / 2}
				y={height}
				className="axisLabelX"
				textAnchor="middle"
			>
				{label}
			</text>
		</g>
	);
} 