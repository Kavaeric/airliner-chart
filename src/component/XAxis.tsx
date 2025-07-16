"use client";

import { useResponsiveSize } from "../lib/use-responsive-size";

// Third-party libraries
import { AxisBottom } from "@visx/axis";

// CSS
import graphStyles from "./ChartAxes.module.css";

// Context providers/hooks
import { useChartScalesContext } from "../context/ChartScalesContext";
import { useChartLayout } from "../context/ChartLayoutContext";

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
	const { xScaleView } = useChartScalesContext();
	const { xTickCount } = useChartLayout();
	const ref = useResponsiveSize(onDimensionsChange);

	// If not ready, render an empty div (prevents layout shift)
	if (width === 0 || height === 0) {
		return <div className={graphStyles.xAxis} ref={ref} />;
	}
	
	return (
		<div className={graphStyles.xAxis} ref={ref}>
			<svg style={{ width: "100%", height: "100%", overflow: "visible" }}>
				<AxisBottom
					scale={xScaleView}
					numTicks={xTickCount}
					tickFormat={d => String(Number(d).toFixed(0))} /* Whole numbers with no comma separator */
					
					axisClassName={graphStyles.axis}
					axisLineClassName={graphStyles.axisLine}
					tickClassName={graphStyles.tick}
				/>
			</svg>
		</div>
	);
} 