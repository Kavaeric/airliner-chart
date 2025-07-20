// [IMPORT] React and core libraries //
import { useResponsiveSize } from "@/lib/hooks/use-responsive-size";

// [IMPORT] Third-party libraries //
import { AxisLeft } from "@visx/axis";

// [IMPORT] Context providers/hooks //
import { useChartScales } from "@/context/ChartScalesContext";
import { useChartLayout } from "@/context/ChartLayoutContext";
import { useChartFormat } from "@/context/ChartFormatContext";

// [IMPORT] CSS styling //
import graphStyles from "@/component/chart/ChartAxes.module.css";
import responsiveStyles from "@/component/ResponsiveSVG.module.css";

interface YAxisProps {
	width: number;
	height: number;
	onDimensionsChange?: (dims: { width: number; height: number }) => void;
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
export default function YAxis({ width, height, onDimensionsChange }: YAxisProps) {
	const { yScaleView } = useChartScales();
	const { yTickCount } = useChartLayout();
	const { yLabel } = useChartFormat();
	const ref = useResponsiveSize(onDimensionsChange);

	// If not ready, render an empty div (prevents layout shift)
	if (width === 0 || height === 0) {
		return <div className={graphStyles.yAxis} ref={ref} />;
	}

	return (
		<div className={`${graphStyles.yAxis} ${responsiveStyles.responsiveContainer}`} ref={ref}>
			<svg className={responsiveStyles.responsiveSVG} style={{transform: `translateX(${width}px)`}}>
				<AxisLeft
					scale={yScaleView}
					numTicks={yTickCount}
					tickLength={4}
					tickFormat={d => {
						const n = Number(d);
						if (isNaN(n)) return "";
						if (Math.abs(n) >= 1000) {
							return (n / 1000).toFixed(0);
						}
						return n.toString();
					}} /* Format numbers in thousands, e.g. 2000 -> 2k */
					
					axisClassName={graphStyles.axis}
					axisLineClassName={graphStyles.axisLine}
					tickClassName={graphStyles.tick}
				/>

				{/* Render the axis label */}
				<text
					x={-width}
					y={height / 2}
					className={graphStyles.axisLabelY}
					textAnchor="middle"
				>
					{yLabel}
				</text>
			</svg>
		</div>
	);
} 