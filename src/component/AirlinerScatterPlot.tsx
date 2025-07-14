"use client";

// Import visx components for data visualization
import { Group } from "@visx/group";
import { Circle } from "@visx/shape";
import { Text } from "@visx/text";
import { Grid } from "@visx/grid";

// Import our types and utilities
import { AirlinerData } from "../types/airliner";

// Props interface for the scatter plot component
interface AirlinerScatterPlotProps {
	data: AirlinerData[];
	xScale: any; // visx has broken types, any is the only way to get it to work
	yScale: any; // it's dumb and I wonder why software engineers are paid more
	width: number;
	height: number;
	className?: string;
}

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
export default function AirlinerScatterPlot({ data, xScale, yScale, width, height, className }: AirlinerScatterPlotProps) {
	// If the chart dimensions are 0, or no data, show loading/empty state
	if (width === 0 || height === 0 || data.length === 0) {
		return (
			<div className={className}>
				<p>Loading chart...</p>
			</div>
		);
	}

	return (
		<div className={className} style={{ width: width, height: height }}>
			<svg width={width} height={height}>
				<Group>
					{/* Gridlines for visual reference */}
					<Grid
						xScale={xScale}
						yScale={yScale}
						width={width}
						height={height}
						stroke="#fff"
						strokeWidth={1}
						strokeOpacity={0.1}
					/>
					
					{/* Data points with labels */}
					{data.map((d: AirlinerData, i: number) => {
						const x = xScale(d.rangeKM);
						const y = yScale(d.paxCapacityMean);
						// Each point is a circle with a text label above/right
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