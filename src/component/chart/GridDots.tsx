// [IMPORT] React //
import React, { useMemo } from "react";

// [IMPORT] Internal components //
import { MarkerDiamond } from "../shape/MarkerDiamond";

/**
 * GridDots Component
 * 
 * Renders dots at the intersection points of grid lines.
 * Calculates intersection points from X and Y scales and renders
 * them as small circles for visual reference.
 * 
 * @param xScale - X-axis scale function for mapping data to pixels
 * @param yScale - Y-axis scale function for mapping data to pixels
 * @param width - Chart width in pixels
 * @param height - Chart height in pixels
 * @param numTicks - Number of grid lines per axis (default: 10)
 * @param radius - Radius of intersection dots in pixels (default: 2)
 * @param className - Optional CSS class name
 */
interface GridDotsProps {
	xScale: any;
	yScale: any;
	width: number;
	height: number;
	numTicks?: number;
	radius?: number;
	className?: string;
}

export function GridDots({
	xScale,
	yScale,
	width,
	height,
	numTicks = 10,
	radius = 2,
	className
}: GridDotsProps) {
	
	// Calculate intersection points of grid lines
	const intersectionPoints = useMemo(() => {
		// Get tick values using D3 scale's ticks method (same as visx does)
		const getTicks = (scale: any, numTicks: number) => {
			if ('ticks' in scale) {
				return scale.ticks(numTicks);
			}
			// Fallback for scales without ticks method
			const domain = scale.domain();
			return domain.filter((_: any, index: number, arr: any[]) => {
				return numTicks == null || arr.length <= numTicks || index % Math.round((arr.length - 1) / numTicks) === 0;
			});
		};
		
		const xTicks = getTicks(xScale, numTicks);
		const yTicks = getTicks(yScale, numTicks);
		
		// Create intersection points
		const intersections: Array<{ x: number; y: number }> = [];
		for (const xTick of xTicks) {
			for (const yTick of yTicks) {
				const x = xScale(xTick);
				const y = yScale(yTick);
				
				// Only add points within the chart bounds and ensure they're numbers
				if (typeof x === 'number' && typeof y === 'number' && 
					x >= 0 && x <= width && y >= 0 && y <= height) {
					intersections.push({ x, y });
				}
			}
		}
		
		return intersections;
	}, [xScale, yScale, width, height, numTicks]);

	return (
		<g className={className}>
			{intersectionPoints.map((point, index) => (
				<MarkerDiamond
					key={`grid-dot-${index}`}
					cx={point.x}
					cy={point.y}
					size={radius}
					className={className}
				/>
			))}
		</g>
	);
} 