"use client";

import { useResponsiveSize } from "../lib/use-responsive-size";

// Third-party libraries
import { AxisLeft } from "@visx/axis";

// CSS
import graphStyles from "./ChartAxes.module.css";

// Context providers/hooks
import { useChartScalesContext } from "../context/ChartScalesContext";
import { useChartLayout } from "../context/ChartLayoutContext";

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
	const { yScaleView } = useChartScalesContext();
	const { yTickCount } = useChartLayout();
	const ref = useResponsiveSize(onDimensionsChange);

	// If not ready, render an empty div (prevents layout shift)
	if (width === 0 || height === 0) {
		return <div className={graphStyles.yAxis} ref={ref} />;
	}

	return (
		<div className={graphStyles.yAxis} ref={ref}>
			<svg style={{ width: "100%", height: "100%", overflow: "visible", transform: `translateX(${width}px)` }}>
				<AxisLeft
					scale={yScaleView}
					numTicks={yTickCount}
					tickFormat={d => String(Number(d).toFixed(0))} /* Whole numbers with no comma separator */
					
					axisClassName={graphStyles.axis}
					axisLineClassName={graphStyles.axisLine}
					tickClassName={graphStyles.tick}
				/>
			</svg>
		</div>
	);
} 