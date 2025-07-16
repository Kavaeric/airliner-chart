"use client";

// [IMPORT] Third-party libraries //
import { GridRows } from "@visx/grid";
import { GridColumns } from "@visx/grid";

// [IMPORT] Internal components //
import AirlinerScatterPoint from "./AirlinerScatterPoint";

// [IMPORT] Context providers/hooks //
import { useChartScalesContext } from "../context/ChartScalesContext";
import { useChartData } from "./AirlinerChart";
import { useChartLayout } from "../context/ChartLayoutContext";

// [IMPORT] CSS styling //
import plotStyles from "./AirlinerScatterPlot.module.css";
import responsiveStyles from "./ResponsiveSVG.module.css";

/**
 * AirlinerScatterPlot Component
 *
 * Renders the main chart area:
 * - Draws gridlines for reference
 * - Plots each airliner as a circle at (x, y) using the provided scales
 *
 * Receives all layout and scale info from parent.
 */
export default function AirlinerScatterPlot({ width, height }: { width: number; height: number }) {
	const { xScaleView, yScaleView } = useChartScalesContext();
	const data = useChartData();
	const { xTickGridCount, yTickGridCount } = useChartLayout();

	// If the chart dimensions are 0, or no data, show loading/empty state
	if (width === 0 || height === 0 || data.length === 0) {
		return (
			<div className={plotStyles.chartArea}>
				<p>Loading chart...</p>
			</div>
		);
	}

	return (
		<div className={`${plotStyles.chartArea} ${responsiveStyles.responsiveContainer}`}>
			<svg className={responsiveStyles.responsiveSVG}>
				{/* Gridlines for visual reference */}
				<GridRows
					scale={yScaleView}
					width={width}
					numTicks={yTickGridCount}
					className={plotStyles.gridLine}
				/>
				<GridColumns
					scale={xScaleView}
					height={height}
					numTicks={xTickGridCount}
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