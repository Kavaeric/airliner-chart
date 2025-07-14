"use client";

import { useState } from "react";
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
 * Top-level chart orchestrator. Handles:
 * - Container and padding measurement (via useChartDimensions)
 * - Axis measurement (child-to-parent via onDimensionsChange)
 * - Chart area calculation (subtracts axis sizes and padding)
 * - Scale creation (data-to-pixel mapping)
 * - Passing all layout and scale info to child components
 *
 * This architecture ensures robust, race-condition-free measurement and
 * clear separation of layout, measurement, and rendering concerns.
 */
export default function AirlinerChart({ data, className }: AirlinerChartProps) {
	// Measure container size and padding only (no axis logic here)
	const [layout, chartContainerRef] = useChartDimensions();

	// Axis dimensions are measured by the axis components and reported up
	const [yAxisDims, setYAxisDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
	const [xAxisDims, setXAxisDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

	// Calculate the available chart area (subtract axis sizes and padding)
	const chartWidth = layout.chartDimensions.chartWidth;
	const chartHeight = layout.chartDimensions.chartHeight;
	const padding = layout.chartDimensions.padding;
	const chartAreaWidth = Math.max(0, chartWidth - yAxisDims.width - padding);
	const chartAreaHeight = Math.max(0, chartHeight - xAxisDims.height - padding);

	// Create scales for mapping data to pixel space
	const scaleConfig = {
		xAccessor: (d: AirlinerData) => d.rangeKM,
		yAccessor: (d: AirlinerData) => d.paxCapacityMean,
		xLabel: "Range (km)",
		yLabel: "Passenger Capacity",
		// Custom margin for axes (domain will be padded by ± value)
		xMargin: 200,
		yMargin: 0
	};

	// Generate D3 scales that map data values to pixel coordinates
	// xScale: converts range values (km) to horizontal pixel positions
	// yScale: converts passenger capacity values to vertical pixel positions
	const { xScale, yScale } = useChartScales(data, { width: chartAreaWidth, height: chartAreaHeight }, scaleConfig);

	// Adapt tick count to chart size
	const xTickCount = Math.max(2, Math.floor(chartAreaWidth / 100));
	const yTickCount = Math.max(2, Math.floor(chartAreaHeight / 50));

	// Wait for container measurement before rendering chart
	if (!layout.isReady) {
		return (
			<ChartGrid className={className} ref={chartContainerRef}>
				<p>Loading chart...</p>
			</ChartGrid>
		);
	}

	return (
		<ChartGrid className={className} ref={chartContainerRef}>
			{/* Y Axis: measures its own size and reports up, receives scale and layout info */}
			<YAxis
				className={gridAreas.yAxis}
				yScale={yScale}
				width={yAxisDims.width}
				height={chartAreaHeight}
				label={scaleConfig.yLabel}
				tickCount={yTickCount}
				onDimensionsChange={setYAxisDims}
			/>

			{/* X Axis: measures its own size and reports up, receives scale and layout info */}
			<XAxis
				className={gridAreas.xAxis}
				xScale={xScale}
				width={chartAreaWidth}
				height={xAxisDims.height}
				label={scaleConfig.xLabel}
				tickCount={xTickCount}
				onDimensionsChange={setXAxisDims}
			/>
			
			{/* Main Scatter Plot: receives all layout and scale info */}
			<AirlinerScatterPlot
				className={gridAreas.chartArea}
				data={data}
				xScale={xScale}
				yScale={yScale}
				width={chartAreaWidth}
				height={chartAreaHeight}
			/>

			{/* Bottom-left cell (empty for now) */}
			<div className={gridAreas.bottomLeft}></div>
		</ChartGrid>
	);
} 