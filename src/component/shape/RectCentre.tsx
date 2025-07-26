// [IMPORT] React and core libraries //
import React from "react";

/**
 * Props for the RectCentre component.
 * Extends SVG rect props, but uses centre-based positioning (cx, cy).
 */
export interface RectCentreProps extends React.SVGProps<SVGRectElement> {
	/** X coordinate of the rectangle's centre */
	cx: number;
	/** Y coordinate of the rectangle's centre */
	cy: number;
	/** Width of the rectangle */
	width: number;
	/** Height of the rectangle */
	height: number;
}

/**
 * Renders a rectangle centred at (cx, cy).
 * Forwards all other SVG rect props for maximum versatility.
 *
 * @param cx - The x coordinate of the rectangle's centre
 * @param cy - The y coordinate of the rectangle's centre
 * @param width - The width of the rectangle
 * @param height - The height of the rectangle
 * @param ...rest - Any other SVG rect props (e.g., fill, stroke, event handlers)
 */
export function RectCentre({ cx, cy, width, height, ...rest }: RectCentreProps) {
	
	// Convert centre (cx, cy) to top-left (x, y) for SVG <rect>
	const x = cx - width / 2;
	const y = cy - height / 2;

	return (
		<rect
			x={x}
			y={y}
			width={width}
			height={height}
			{...rest}
		/>
	);
}
