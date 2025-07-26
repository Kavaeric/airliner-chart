// [IMPORT] React and core libraries //
import React from "react";

/**
 * Props for the RectCross component.
 * Extends SVG rect props, but adds cross-specific stroke and colour.
 */
export interface RectCrossProps extends React.SVGProps<SVGRectElement> {
	x: number;
	y: number;
	width: number;
	height: number;
	crossStroke?: string;
	crossStrokeWidth?: number;
	/**
	 * Which cross lines to draw:
	 *   'both' (default): both diagonals
	 *   'main-diagonal': top-left to bottom-right
	 *   'anti-diagonal': bottom-left to top-right
	 */
	crossLines?: 'both' | 'main-diagonal' | 'anti-diagonal';
}

/**
 * Renders a rectangle with an X (cross) inside.
 * Rectangle border and cross can have separate stroke and width.
 * Forwards all other SVG rect props for maximum versatility.
 *
 * @param x - The x coordinate of the rectangle's top-left
 * @param y - The y coordinate of the rectangle's top-left
 * @param width - The width of the rectangle
 * @param height - The height of the rectangle
 * @param crossStroke - Stroke colour for the cross (default: 'currentColor')
 * @param crossStrokeWidth - Stroke width for the cross (default: 2)
 * @param ...rest - Any other SVG rect props (e.g., fill, stroke, event handlers)
 */
export function RectCross({
	x,
	y,
	width,
	height,
	crossStroke = "currentColor",
	crossStrokeWidth = 2,
	crossLines = 'both',
	...rest
}: RectCrossProps) {
	return (
		<g>
			{/* Rectangle border */}
			<rect
				x={x}
				y={y}
				width={width}
				height={height}
				{...rest}
			/>
			{/* Cross: two diagonal lines, configurable */}
			{(crossLines === 'both' || crossLines === 'main-diagonal') && (
				<line
					x1={x}
					y1={y}
					x2={x + width}
					y2={y + height}
					stroke={crossStroke}
					strokeWidth={crossStrokeWidth}
					pointerEvents="none"
				/>
			)}
			{(crossLines === 'both' || crossLines === 'anti-diagonal') && (
				<line
					x1={x}
					y1={y + height}
					x2={x + width}
					y2={y}
					stroke={crossStroke}
					strokeWidth={crossStrokeWidth}
					pointerEvents="none"
				/>
			)}
		</g>
	);
}
