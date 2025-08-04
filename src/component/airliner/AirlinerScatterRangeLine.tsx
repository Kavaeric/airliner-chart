"use client";

// [IMPORT] React //
import React from "react";

// [IMPORT] Visx components //
import { Text } from "@visx/text";

/**
 * AirlinerScatterRangeLine
 * 
 * Renders a horizontal reference line with descriptive labels.
 * Used to highlight specific range values on the airliner chart.
 * 
 * @param rangeValue - The y-axis value to draw the reference line at
 * @param description - The description text to display above the line
 * @param yScale - The animated y-scale for positioning
 * @param width - The width of the chart area
 * @param className - Optional CSS class name for styling
 */
interface AirlinerScatterRangeLineProps {
	rangeValue: number;
	description: string;
	yScale: any;
	width: number;
	className?: string;
}

export default function AirlinerScatterRangeLine({
	rangeValue,
	description,
	yScale,
	width,
	className = "airlinerRangeReferenceLine"
}: AirlinerScatterRangeLineProps) {
	// Calculate the y position for the line
	const yPosition = yScale(rangeValue) as unknown as number;
	
	return (
		<g>
			{/* Horizontal reference line */}
			<line
				x1={0}
				x2={width}
				y1={yPosition}
				y2={yPosition}
				className={className}
			/>

			{/* Description label above the line */}
			<Text
				x={0}
				y={yPosition - 8}
				textAnchor="start"
				verticalAnchor="end"
				className="airlinerRangeReferenceLabel"
			>
				{description}
			</Text>

			{/* Range value label below the line */}
			<Text
				x={0}
				y={yPosition + 8}
				textAnchor="start"
				verticalAnchor="start"
				className="airlinerRangeReferenceLabel"
			>
				{`${rangeValue.toLocaleString()} km`}
			</Text>
		</g>
	);
} 