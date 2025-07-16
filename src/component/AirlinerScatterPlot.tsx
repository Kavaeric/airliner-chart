"use client";

// Third-party libraries
import { GridRows } from "@visx/grid";
import { GridColumns } from "@visx/grid";

// CSS
import chartStyles from "./ChartContainer.module.css";
import plotStyles from "./AirlinerScatterPlot.module.css";

// Internal components
import AirlinerScatterPoint from "./AirlinerScatterPoint";

// Context providers/hooks
import { useChartScalesContext } from "../context/ChartScalesContext";
import { useChartData } from "./AirlinerChart";
import { useChartLayout } from "../context/ChartLayoutContext";

/**
 * AirlinerScatterPlot Component
 *
 * Renders the main chart area:
 * - Draws gridlines for reference
 * - Plots each airliner as a circle at (x, y) using the provided scales
 * - Renders a text label for each point (airliner name)
 *
 * Receives all layout and scale info from parent.
 */
export default function AirlinerScatterPlot({ width, height }: { width: number; height: number }) {
	const { xScaleView, yScaleView } = useChartScalesContext();
	const data = useChartData();
	const { xTickCount, yTickCount } = useChartLayout();

	// If the chart dimensions are 0, or no data, show loading/empty state
	if (width === 0 || height === 0 || data.length === 0) {
		return (
			<div className={chartStyles.chartArea}>
				<p>Loading chart...</p>
			</div>
		);
	}

	return (
		<div className={chartStyles.chartArea}>
			<svg style={{ overflow: "visible" }}>
				{/* Gridlines for visual reference */}
				<GridRows
					scale={yScaleView}
					width={width}
					numTicks={yTickCount}
					className={plotStyles.gridLine}
				/>
				<GridColumns
					scale={xScaleView}
					height={height}
					numTicks={xTickCount}
					className={plotStyles.gridLine}
				/>
				
				{/* Data points with labels */}
				{data
					.map((d, i: number) => (
						<AirlinerScatterPoint key={i} d={d} />
					))}
			</svg>
		</div>
	);
} 