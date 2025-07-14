"use client";

import { AirlinerData } from "../types/airliner";
import { useChartDimensions } from "../lib/use-chart-dimensions";
import { useChartScales } from "../lib/use-chart-scales";
import AirlinerScatterPlot from "./AirlinerScatterPlot";
import YAxis from "./YAxis";
import XAxis from "./XAxis";
import ChartGrid, { gridAreas } from "./ChartGrid";

// Props for the airliner chart component
interface AirlinerChartProps {
	data: AirlinerData[];
	className?: string;
}

/**
 * AirlinerChart Component
 * 
 * A complete airliner data visualisation using a 2x2 grid layout.
 * This component handles the specific airliner data visualisation
 * while using reusable hooks and components for the layout.
 */
export default function AirlinerChart({ data, className }: AirlinerChartProps) {
	// Get chart dimensions and axis tracking
	const {
		chartContainerRef,
		setYAxisDimensions,
		setXAxisDimensions,
		chartDimensions,
		isReady
	} = useChartDimensions();

	// Create scales from airliner data
	const { xScale, yScale, isValid } = useChartScales(data, chartDimensions, {
		xAccessor: (d: AirlinerData) => d.rangeKm,
		yAccessor: (d: AirlinerData) => d.paxCapacityMean,
		xLabel: "Range (km)",
		yLabel: "Passenger Capacity (mean)"
	});

	// Don't render if dimensions aren't ready
	if (!isReady) {
		return (
			<ChartGrid className={className} ref={chartContainerRef}>
				<p>Loading chart...</p>
			</ChartGrid>
		);
	}

	return (
		<ChartGrid className={className} ref={chartContainerRef}>
			{/* Y Axis */}
			<YAxis
				className={gridAreas.yAxis}
				yScale={yScale}
				height={chartDimensions.chartHeight}
				label="Passenger Capacity (mean)"
				onDimensionsChange={setYAxisDimensions}
			/>

			{/* Main Scatter Plot */}
			<AirlinerScatterPlot
				className={gridAreas.chartArea}
				data={data}
				xScale={xScale}
				yScale={yScale}
			/>

			{/* X Axis */}
			<XAxis
				className={gridAreas.xAxis}
				xScale={xScale}
				width={chartDimensions.chartWidth}
				label="Range (km)"
				onDimensionsChange={setXAxisDimensions}
			/>

			{/* Bottom-left cell (empty for now) */}
			<div className={gridAreas.bottomLeft}></div>
		</ChartGrid>
	);
} 