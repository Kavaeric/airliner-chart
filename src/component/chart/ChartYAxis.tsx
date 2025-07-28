"use client";

// [IMPORT] Third-party libraries //
import { AxisLeft } from "@visx/axis";

// [IMPORT] Context providers/hooks //
import { useResponsiveSVG } from "@/context/ResponsiveSVG";
import { useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";

interface YAxisProps {
	label?: string;
}

/**
 * YAxis Component
 *
 * Renders the left axis for the chart using visx.
 * - Measures its own rendered size using a ref and ResizeObserver
 * - Reports its dimensions up to the parent via onDimensionsChange
 * - Receives all layout and scale info as props
 * - Renders ticks and gridlines
 *
 * This enables robust, race-condition-free axis measurement and layout.
 */
export default function YAxis({ label }: YAxisProps) {
	const { viewportScale } = useResponsiveChartViewport();
	const { width, height } = useResponsiveSVG();

	return (
		<g style={{transform: `translateX(${width}px)`}}>
			<AxisLeft
				scale={viewportScale.y}
				numTicks={10}
				tickLength={4}
				tickFormat={d => {
					const n = Number(d);
					if (isNaN(n)) return "";
					if (Math.abs(n) >= 1000) {
						return (n / 1000).toFixed(1);
					}
					return n.toString();
				}} /* Format numbers in thousands, e.g. 2000 -> 2k */
				
				axisClassName="axis"
				axisLineClassName="axisLine"
				tickClassName="tick"
			/>

			{/* Render the axis label */}
			<text
				x={-width}
				y={height / 2}
				className="axisLabelY"
				textAnchor="middle"
			>
				{label}
			</text>
		</g>
	);
} 