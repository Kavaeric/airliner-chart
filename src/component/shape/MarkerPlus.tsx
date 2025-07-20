// [IMPORT] React and core libraries //
import React from "react";

/**
 * Props for the MarkerPlus component.
 */
export interface MarkerPlusProps extends React.SVGProps<SVGPolygonElement> {
	cx: number;
	cy: number;
	weight?: number;
	r?: number;
}

/**
 * Renders a plus-shaped SVG polygon at (x, y) with the given radius.
 * Forwards all other SVG polygon props for maximum versatility.
 *
 * @param cx - The x coordinate of the plus centre
 * @param cy - The y coordinate of the plus centre
 * @param weight - The thickness of the plus (default: 1)
 * @param r - The distance from centre to each point (default: 8)
 * @param ...rest - Any other SVG polygon props (e.g., fill, stroke, event handlers)
 */
export function MarkerPlus({ cx, cy, weight = 1, r = 8, ...rest }: MarkerPlusProps) {
	
	// Calculate the half-width for the plus arms
	const halfWeight = weight / 2;
	
	// Define the points for a plus shape polygon
	// The plus has 12 points total: 4 outer corners and 8 inner corners
	// Points are ordered clockwise around the polygon perimeter
	const points = [
		// Start at top-left outer corner, then clockwise around the perimeter
		`${cx - halfWeight},${cy - r}`,           // Top-left outer
		`${cx + halfWeight},${cy - r}`,           // Top-right outer
		`${cx + halfWeight},${cy - halfWeight}`,  // Top-right inner
		`${cx + r},${cy - halfWeight}`,           // Right-top outer
		`${cx + r},${cy + halfWeight}`,           // Right-bottom outer
		`${cx + halfWeight},${cy + halfWeight}`,  // Bottom-right inner
		`${cx + halfWeight},${cy + r}`,           // Bottom-right outer
		`${cx - halfWeight},${cy + r}`,           // Bottom-left outer
		`${cx - halfWeight},${cy + halfWeight}`,  // Bottom-left inner
		`${cx - r},${cy + halfWeight}`,           // Left-bottom outer
		`${cx - r},${cy - halfWeight}`,           // Left-top outer
		`${cx - halfWeight},${cy - halfWeight}`,  // Top-left inner
	].join(" ");

	return <polygon points={points} {...rest} />;
} 