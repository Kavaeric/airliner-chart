// [IMPORT] React and core libraries //
import React from "react";

/**
 * Props for the DiamondPoint component.
 */
export interface MarkerDiamondProps extends React.SVGProps<SVGPolygonElement> {
	cx: number;
	cy: number;
	size?: number;
}

/**
 * Renders a diamond-shaped SVG polygon at (x, y) with the given radius.
 * Forwards all other SVG polygon props for maximum versatility.
 *
 * @param cx - The x coordinate of the diamond centre
 * @param cy - The y coordinate of the diamond centre
 * @param r - The distance from centre to each point (default: 8)
 * @param ...rest - Any other SVG polygon props (e.g., fill, stroke, event handlers)
 */
export function MarkerDiamond({ cx, cy, size = 8, ...rest }: MarkerDiamondProps) {
	const points = `
		${cx},${cy - size / 2}
		${cx + size / 2},${cy}
		${cx},${cy + size / 2}
		${cx - size / 2},${cy}
	`;
	return <polygon points={points} {...rest} />;
} 