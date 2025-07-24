import React from "react";

/**
 * Finds the closest point on the edge of a rectangle to a given point.
 * The rectangle is axis-aligned and centred at (endX, endY).
 * 
 * This is used to ensure that a leader line does not enter the label's bounding box,
 * by clamping the line's start point to the nearest edge of the rectangle.
 *
 * @param {number} startX - X coordinate of the point to clamp (typically the line's start)
 * @param {number} startY - Y coordinate of the point to clamp
 * @param {number} endX - X coordinate of the rectangle's centre
 * @param {number} endY - Y coordinate of the rectangle's centre
 * @param {number} rectWidth - Width of the rectangle
 * @param {number} rectHeight - Height of the rectangle
 * @returns {{x: number, y: number}} - The closest point on the rectangle's edge
 */
function getClosestPointOnRect(
	startX: number,
	startY: number,
	endX: number,
	endY: number,
	rectWidth: number,
	rectHeight: number
) {
	// Calculate rectangle bounds from its centre and dimensions
	const left   = endX - rectWidth / 2;   // Left edge X
	const right  = endX + rectWidth / 2;   // Right edge X
	const top    = endY - rectHeight / 2;  // Top edge Y
	const bottom = endY + rectHeight / 2;  // Bottom edge Y

	// Clamp the point to the rectangle's bounds:
	// - If the point is inside the rectangle, it will be unchanged.
	// - If the point is outside, it will be projected to the nearest edge.
	const closestX = Math.max(left, Math.min(startX, right));
	const closestY = Math.max(top, Math.min(startY, bottom));

	// Return the clamped coordinates, which are guaranteed to be on or inside the rectangle
	return { x: closestX, y: closestY };
}

/**
 * Clips a line segment to the bounds of a rectangle.
 * The rectangle is defined by its centre (rectX, rectY) and dimensions (rectWidth, rectHeight).
 * Returns the intersection point on the rectangle edge that is closest to the start of the line.
 *
 * @param {number} startX - X coordinate of the line's start point
 * @param {number} startY - Y coordinate of the line's start point
 * @param {number} endX - X coordinate of the line's end point
 * @param {number} endY - Y coordinate of the line's end point
 * @param {number} rectX - X coordinate of the rectangle's centre
 * @param {number} rectY - Y coordinate of the rectangle's centre
 * @param {number} rectWidth - Width of the rectangle
 * @param {number} rectHeight - Height of the rectangle
 * @returns {{x: number, y: number}} - The clipped end point, or the original end if no intersection
 */
function clipLineToRect(
	startX: number,
	startY: number,
	endX: number,
	endY: number,
	rectX: number,
	rectY: number,
	rectWidth: number,
	rectHeight: number
) {
	// Calculate rectangle bounds from centre and dimensions
	const left   = rectX - rectWidth / 2;
	const right  = rectX + rectWidth / 2;
	const top    = rectY - rectHeight / 2;
	const bottom = rectY + rectHeight / 2;

	// Calculate the direction vector of the line
	const dx = endX - startX;
	const dy = endY - startY;

	// Will collect all valid intersection points with rectangle edges
	const intersections = [];

	// --- Check intersection with left edge (x = left) ---
	// Only if the line is not vertical (dx !== 0)
	if (dx !== 0) {
		// Solve for t where line crosses x = left
		const t = (left - startX) / dx;
		// Find corresponding y at this t
		const y = startY + t * dy;
		// t in [0,1] means intersection is between start and end
		// y must be within vertical bounds of rectangle
		if (t >= 0 && t <= 1 && y >= top && y <= bottom) {
			intersections.push({ x: left, y, t });
		}
	}

	// --- Check intersection with right edge (x = right) ---
	if (dx !== 0) {
		const t = (right - startX) / dx;
		const y = startY + t * dy;
		if (t >= 0 && t <= 1 && y >= top && y <= bottom) {
			intersections.push({ x: right, y, t });
		}
	}

	// --- Check intersection with top edge (y = top) ---
	// Only if the line is not horizontal (dy !== 0)
	if (dy !== 0) {
		const t = (top - startY) / dy;
		const x = startX + t * dx;
		// x must be within horizontal bounds of rectangle
		if (t >= 0 && t <= 1 && x >= left && x <= right) {
			intersections.push({ x, y: top, t });
		}
	}

	// --- Check intersection with bottom edge (y = bottom) ---
	if (dy !== 0) {
		const t = (bottom - startY) / dy;
		const x = startX + t * dx;
		if (t >= 0 && t <= 1 && x >= left && x <= right) {
			intersections.push({ x, y: bottom, t });
		}
	}

	// If any intersections were found, pick the one closest to the start point (smallest t)
	if (intersections.length > 0) {
		const closest = intersections.reduce(
			(min, curr) => curr.t < min.t ? curr : min
		);
		return { x: closest.x, y: closest.y };
	}

	// If no intersection, return the original end point (line does not cross rectangle)
	return { x: endX, y: endY };
}

/**
 * Given a start and end point, returns a new end point such that the line from start to end
 * is "snapped" to the nearest multiple of `angleStep` degrees, preserving the original distance.
 *
 * This is used to constrain leader lines to fixed angles (e.g., 45° increments).
 *
 * @param {number} startX - X coordinate of the start point
 * @param {number} startY - Y coordinate of the start point
 * @param {number} endX - X coordinate of the original end point
 * @param {number} endY - Y coordinate of the original end point
 * @param {number} [angleStep=45] - Angle increment in degrees to snap to (default: 45)
 * @returns {{x: number, y: number}} - The new end point, snapped to the nearest angle
 */
function snapToAngle(
	startX: number,
	startY: number,
	endX: number,
	endY: number,
	angleStep: number = 45
) {
	// --- Calculate the vector from start to end ---
	const deltaX = endX - startX; // Horizontal distance from start to end
	const deltaY = endY - startY; // Vertical distance from start to end

	// --- Find the angle of this vector in degrees ---
	// Math.atan2 returns the angle in radians between the positive X axis and the point (deltaX, deltaY)
	// Multiply by (180 / Math.PI) to convert radians to degrees
	const currentAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

	// --- Snap the angle to the nearest allowed increment ---
	// Divide by angleStep, round to nearest integer, then multiply back to get the snapped angle
	const snappedAngle = Math.round(currentAngle / angleStep) * angleStep;

	// --- Convert the snapped angle back to radians for trig functions ---
	const snappedRadians = snappedAngle * (Math.PI / 180);

	// --- Preserve the original distance between start and end ---
	const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

	// --- Calculate the new end point using the snapped angle and original distance ---
	// Use cosine and sine to get the new X and Y offsets from the start point
	const newEndX = startX + Math.cos(snappedRadians) * distance;
	const newEndY = startY + Math.sin(snappedRadians) * distance;

	// --- Return the snapped end point ---
	return { x: newEndX, y: newEndY };
}

/**
 * MarkerLeader
 *
 * Renders a leader line that always starts at a 45° angle (up-left, up-right, bottom-right, bottom-left)
 * from the start point, then connects to the end point.
 *
 * If the `direction` prop is not provided, the component will automatically choose the best 45° direction
 * based on the relative position of the end point to the start point.
 *
 * The second segment is always orthogonal (horizontal or vertical) to the label, using a dynamic elbow.
 *
 * @param {Object} props
 * @param {number} props.x1 - Start x coordinate
 * @param {number} props.y1 - Start y coordinate
 * @param {number} props.x2 - End x coordinate
 * @param {number} props.y2 - End y coordinate
 * @param {Object} [props.endBBox] - End bounding box, used to clip the line to the bounding box
 * @param {Object} [props.targetBBox] - Target bounding box, used to snap the line to the target
 * @param {string} [props.stroke="#222"] - Stroke colour
 * @param {number} [props.strokeWidth=2] - Stroke width
 * @param {string} [props.className] - Optional className for styling
 * @returns {React.ReactElement}
 */
export interface MarkerLeaderProps {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	endBBox?: { width: number; height: number };
	targetBBox?: { width: number; height: number };
	angleStep?: number;
	stroke?: string;
	strokeWidth?: number;
	className?: string;
}

export const MarkerLeader = React.forwardRef<SVGPathElement, MarkerLeaderProps & React.SVGProps<SVGPathElement>>(({
	x1,
	y1,
	x2,
	y2,
	endBBox,
	targetBBox,
	angleStep = 45,
	stroke = "#222",
	strokeWidth = 2,
	className,
	...rest
}, ref) => {

	let targetPoint: { x: number; y: number } = { x: x2, y: y2 };

	// If the target bounding box is provided, use the closest point as the end target
	if (targetBBox) {
		targetPoint = getClosestPointOnRect(x1, y1, x2, y2, targetBBox.width, targetBBox.height);
	}

	// First snap to angle
	const snappedEnd = snapToAngle(x1, y1, targetPoint.x, targetPoint.y, angleStep);
	// Then clip to rectangle
	const endPoint = clipLineToRect(x1, y1, snappedEnd.x, snappedEnd.y, x2, y2, endBBox?.width || 0, endBBox?.height || 0);

	// Draw the line
	const path = `M ${x1} ${y1} L ${endPoint.x} ${endPoint.y}`;

	return (
		<path
			d={path}
			stroke={stroke}
			strokeWidth={strokeWidth}
			fill="none"
			className={className}
			ref={ref}
			{...rest}
		/>
	);
});
