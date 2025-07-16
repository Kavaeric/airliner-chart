// [IMPORT] React and core libraries //
import React from "react";

/**
 * Props for the DiamondPoint component.
 */
export interface DiamondProps extends React.SVGProps<SVGPolygonElement> {
	x: number;
	y: number;
	r?: number;
}

/**
 * Renders a diamond-shaped SVG polygon at (x, y) with the given radius.
 * Forwards all other SVG polygon props for maximum versatility.
 *
 * @param x - The x coordinate of the diamond centre
 * @param y - The y coordinate of the diamond centre
 * @param r - The distance from centre to each point (default: 8)
 * @param ...rest - Any other SVG polygon props (e.g., fill, stroke, event handlers)
 */
export function Diamond({ x, y, r = 8, ...rest }: DiamondProps) {
	const points = `
		${x},${y - r / 2}
		${x + r / 2},${y}
		${x},${y + r / 2}
		${x - r / 2},${y}
	`;
	return <polygon points={points} {...rest} />;
} 