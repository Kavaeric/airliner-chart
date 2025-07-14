"use client";

// Import React hooks for responsive behavior
import { useState, useEffect, useRef } from "react";

// Import visx components for data visualization
import { Group } from "@visx/group";
import { Circle } from "@visx/shape";
import { Text } from "@visx/text";
import { Grid } from "@visx/grid";
import { scaleLinear } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";
import type { ScaleLinear } from "d3-scale";

// Import our types and utilities
import { AirlinerData } from "../types/airliner";
import { extent } from "../lib/airline-data-parser";
import { useResponsiveSize } from "../lib/use-responsive-size";

// Props interface for the scatter plot component
interface AirlinerScatterPlotProps {
	data: AirlinerData[];
	xScale: ScaleLinear<number, number>;
	yScale: ScaleLinear<number, number>;
	className?: string;
}

/**
 * AirlinerScatterPlot Component
 * 
 * Renders a responsive scatter plot of airliner data using visx.
 * Receives precomputed x and y scales and plots each airliner as a circle
 * with a text label showing the airliner name.
 * Includes gridlines for easier value reading.
 * The chart automatically resizes to its container using a custom hook.
 * 
 * Props:
 * - data: Array of AirlinerData objects to plot
 * - xScale: D3/visx scale function for the x-axis (range in km)
 * - yScale: D3/visx scale function for the y-axis (mean passenger capacity)
 * - className: Optional CSS class for styling
 */
export default function AirlinerScatterPlot({ data, xScale, yScale, className }: AirlinerScatterPlotProps) {
	// Use our reusable responsive sizing hook
	const [chartDimensions, chartContainerRef] = useResponsiveSize();

	// If the chart dimensions are 0, return an empty div
	if (chartDimensions.width === 0 || chartDimensions.height === 0 || data.length === 0) {
		return (
			<div ref={chartContainerRef} className={className}>
				<p>Loading chart...</p>
			</div>
		);
	}

	return (
		<div ref={chartContainerRef} className={className}>
			<svg width={chartDimensions.width} height={chartDimensions.height}>
				<Group>
					{/* Gridlines */}
					<Grid
						xScale={xScale}
						yScale={yScale}
						width={chartDimensions.width}
						height={chartDimensions.height}
						stroke="#fff"
						strokeWidth={1}
						strokeOpacity={0.1}
					/>
					
					{/* Data points with labels */}
					{data.map((d: AirlinerData, i: number) => {
						const x = xScale(d.rangeKm);
						const y = yScale(d.paxCapacityMean);
						
						return (
							<Group key={i}>
								{/* Circle representing the data point */}
								<Circle
									cx={x as number}
									cy={y as number}
									r={4}
									fill="#3182ce"
									opacity={0.8}
								/>
								
								{/* Text label showing airliner name */}
								<Text
									x={x as number + 8}
									y={y as number - 8}
									textAnchor="start"
									fontSize={18}
									fill="#999"
								>
									{d.airliner}
								</Text>
							</Group>
						);
					})}
				</Group>
			</svg>
		</div>
	);
} 