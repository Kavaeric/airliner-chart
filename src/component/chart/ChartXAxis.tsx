"use client";

// [IMPORT] React and core libraries //
import { useResponsiveSize } from "@/lib/hooks/use-responsive-size";

// [IMPORT] Third-party libraries //
import { AxisBottom } from "@visx/axis";

// [IMPORT] Context providers/hooks //
import { useChartScales } from "@/context/ChartScalesContext";
import { useChartLayout } from "@/context/ChartLayoutContext";
import { useChartFormat } from "@/context/ChartFormatContext";

// [IMPORT] CSS styling //
import graphStyles from "@/component/chart/ChartAxes.module.css";
import responsiveStyles from "@/component/ResponsiveSVG.module.css";

interface XAxisProps {
	width: number;
	height: number;
	onDimensionsChange?: (dims: { width: number; height: number }) => void;
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
export default function XAxis({ width, height, onDimensionsChange }: XAxisProps) {
	const { xScaleView } = useChartScales();
	const { xTickCount } = useChartLayout();
	const { xLabel } = useChartFormat();
	const ref = useResponsiveSize(onDimensionsChange);

	// If not ready, render an empty div (prevents layout shift)
	if (width === 0 || height === 0) {
		return <div className={graphStyles.xAxis} ref={ref} />;
	}
	
	return (
		<div className={`${graphStyles.xAxis} ${responsiveStyles.responsiveContainer}`} ref={ref}>
			<svg className={responsiveStyles.responsiveSVG}>
				{/* Render the axis */}
				<AxisBottom
					scale={xScaleView}
					numTicks={xTickCount}
					tickLength={4}
					
					axisClassName={graphStyles.axis}
					axisLineClassName={graphStyles.axisLine}
					tickClassName={graphStyles.tick}
				/>

				{/* Render the axis label */}
				<text
					x={width / 2}
					y={height}
					className={graphStyles.axisLabelX}
					textAnchor="middle"
				>
					{xLabel}
				</text>
			</svg>
		</div>
	);
} 