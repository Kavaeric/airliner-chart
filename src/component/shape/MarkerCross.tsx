// [IMPORT] React and core libraries //
import React from "react";

/**
 * Props for the MarkerCross component.
 */
export interface MarkerCrossProps extends React.SVGProps<SVGPolygonElement> {
	cx: number;
	cy: number;
	weight?: number;
	r?: number;
}

/**
 * Renders an X-shaped SVG polygon at (x, y) with the given radius.
 * Forwards all other SVG polygon props for maximum versatility.
 *
 * @param cx - The x coordinate of the cross centre
 * @param cy - The y coordinate of the cross centre
 * @param weight - The thickness of the cross (default: 1)
 * @param r - The distance from centre to each point (default: 8)
 * @param ...rest - Any other SVG polygon props (e.g., fill, stroke, event handlers)
 */
export function MarkerCross({ cx, cy, weight = 1, r = 8, ...rest }: MarkerCrossProps) {
	// Calculate the half-width for the cross arms
	const halfWeight = weight / 2;

	// Define the points for an X shape polygon
	// The X has 12 points, ordered clockwise
	const points = [
		// Top-left arm
		`${cx - r},${cy - r + halfWeight}`,
		`${cx - r + halfWeight},${cy - r}`,
		`${cx},${cy - halfWeight}`,
		// Top-right arm
		`${cx + r - halfWeight},${cy - r}`,
		`${cx + r},${cy - r + halfWeight}`,
		`${cx + halfWeight},${cy}`,
		// Bottom-right arm
		`${cx + r},${cy + r - halfWeight}`,
		`${cx + r - halfWeight},${cy + r}`,
		`${cx},${cy + halfWeight}`,
		// Bottom-left arm
		`${cx - r + halfWeight},${cy + r}`,
		`${cx - r},${cy + r - halfWeight}`,
		`${cx - halfWeight},${cy}`,
	].join(" ");

	return <polygon points={points} {...rest} />;
} 