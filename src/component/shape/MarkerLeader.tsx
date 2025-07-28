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
 * @returns {{x: number, y: number, edge: string, outwardDirection: string}} - The closest point on the rectangle's edge with edge and direction info
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

	// Determine which edge the point is on and the outward direction
	let edge = null;

	if (closestX === left) {
		edge = 'left';
	} else if (closestX === right) {
		edge = 'right';
	} else if (closestY === top) {
		edge = 'top';
	} else if (closestY === bottom) {
		edge = 'bottom';
	}

	// Return the clamped coordinates with edge and direction information
	return { 
		point: {
			x: closestX, 
			y: closestY, 
		},
		edge
	};
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
/**
 * Given a start and end point, returns a new end point such that the line from start to end
 * is "snapped" to the nearest multiple of `angleStep` degrees, but does NOT preserve the original distance.
 * The new end point will be at the same distance as the original, but projected along the snapped angle.
 *
 * @param {number} startX - X coordinate of the start point
 * @param {number} startY - Y coordinate of the start point
 * @param {number} endX - X coordinate of the original end point
 * @param {number} endY - Y coordinate of the original end point
 * @param {number} [angleStep=45] - Angle increment in degrees to snap to (default: 45)
 * @returns {{x: number, y: number}} - The new end point, snapped to the nearest angle, but not preserving distance
 */
function clampToAngle(
	startX: number,
	startY: number,
	endX: number,
	endY: number,
	angleStep: number = 45
) {
	// --- Calculate the vector from start to end ---
	const deltaX = endX - startX;
	const deltaY = endY - startY;

	// --- Find the angle of this vector in degrees ---
	const currentAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

	// --- Snap the angle to the nearest allowed increment ---
	const snappedAngle = Math.round(currentAngle / angleStep) * angleStep;

	// --- Convert the snapped angle back to radians for trig functions ---
	const snappedRadians = snappedAngle * (Math.PI / 180);

	// --- Instead of preserving the original distance, use the original end point's offset projected onto the snapped angle ---
	// Project the original vector's length onto the snapped angle's direction, but use only the direction, not the length
	// We'll set the new end point to be the same offset as the original, but along the snapped angle
	const absDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
	const newEndX = startX + Math.cos(snappedRadians) * absDelta;
	const newEndY = startY + Math.sin(snappedRadians) * absDelta;

	return { x: newEndX, y: newEndY };
}

/**
 * Returns the Euclidean distance between two points.
 *
 * @param {number} x1 - X coordinate of the first point
 * @param {number} y1 - Y coordinate of the first point
 * @param {number} x2 - X coordinate of the second point
 * @param {number} y2 - Y coordinate of the second point
 * @returns {number} - The Euclidean distance between the two points
 */
function getEuclideanDistance(x1: number, y1: number, x2: number, y2: number) {
	return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
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
 * @param {boolean} [props.debug=false] - Optional debug flag
 * @returns {React.ReactElement}
 */
export interface MarkerLeaderProps {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	clippingBBox?: { width: number; height: number };
	targetBBox?: { width: number; height: number };
	angleStep?: number;
	minLength?: number;
	stroke?: string;
	strokeWidth?: number;
	className?: string;
	debug?: boolean;
}

/**
 * Helper function. Takes two points and returns the midpoint between them.
 * 
 * @param x1 
 * @param y1 
 * @param x2 
 * @param y2 
 */
function getMidPoint(x1: number, y1: number, x2: number, y2: number) {
	return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

/**
 * MarkerLeader Component
 * 
 * Renders a leader line that always starts at a 45° angle (up-left, up-right, bottom-right, bottom-left)
 * from the start point, then connects to the end point.
 * 
 * The second segment is always orthogonal (horizontal or vertical) to the label, using a dynamic elbow.
 * 
 * @param {Object} props
 * @param {number} props.x1 - Start x coordinate
 * @param {number} props.y1 - Start y coordinate
 * @param {number} props.x2 - End x coordinate
 * @param {number} props.y2 - End y coordinate
 * @param {Object} [props.clippingBBox] - Bounding box of the clipping area, such as the label's bounding box.
 * @param {Object} [props.targetBBox] - Bounding box of the target. Can be smaller than the clipping box.
 * @param {number} [props.angleStep=45] - Angle increment in degrees to snap to (default: 45)
 * @param {number} [props.minLength=12] - Minimum length of the line
 * @param {string} [props.stroke="#222"] - Stroke colour
 * @param {number} [props.strokeWidth=2] - Stroke width
 * @param {string} [props.className] - Optional className for styling
 */
export const MarkerLeader = React.forwardRef<SVGPathElement, MarkerLeaderProps & React.SVGProps<SVGPathElement>>(({
	x1,
	y1,
	x2,
	y2,
	clippingBBox,
	targetBBox,
	angleStep = 45,
	minLength = 12,
	stroke = "#222",
	strokeWidth = 2,
	className,
	debug = false,
	...rest
}, ref) => {

	let anchorPoint: { x: number; y: number } = { x: x1, y: y1 };
	let midPoint: { x: number; y: number } = getMidPoint(x1, y1, x2, y2);
	let targetPoint: { x: number; y: number } = { x: x2, y: y2 };

	// If either the distance to any point along the edges of the clipping box is less than the min length, return
	if (clippingBBox) {
		const closestPointOnClippingBox = getClosestPointOnRect(x1, y1, x2, y2, clippingBBox.width, clippingBBox.height);
		if (getEuclideanDistance(x1, y1, closestPointOnClippingBox.point.x, closestPointOnClippingBox.point.y) < minLength) {
			return null;
		}
	}
	
	let outwardDirection = null;

	// If the target bounding box is provided, use the closest point as the end target
	if (targetBBox) {
		const { point, edge } = getClosestPointOnRect(x1, y1, x2, y2, targetBBox.width, targetBBox.height);
		targetPoint = point;
		outwardDirection = edge;
	}

	// Draw a line perpendicular to the edge of the clipping box until it meets either the X or Y of the anchor point (x1, y1)
	if (outwardDirection) {
		if (outwardDirection === 'left' || outwardDirection === 'right') {
			midPoint = { x: targetPoint.x, y: anchorPoint.y };
		} else if (outwardDirection === 'top' || outwardDirection === 'bottom') {
			midPoint = { x: anchorPoint.x, y: targetPoint.y };
		}
	}

	// Draw the line
	const path = `M ${anchorPoint.x} ${anchorPoint.y} L ${midPoint.x} ${midPoint.y} L ${targetPoint.x} ${targetPoint.y}`;
	

	return (
		<g>
			{/* Debug: Target bounding box */}
			{debug && (
				<rect
					x={x2 - (targetBBox?.width || 0) / 2}
					y={y2 - (targetBBox?.height || 0) / 2}
					width={targetBBox?.width || 0}
					height={targetBBox?.height || 0}
					fill="none"
					stroke="rgba(0, 0, 255, 0.5)"
					strokeWidth={2}
				/>
			)}

			{/* Debug: Target point */}
			{debug && (
				<circle
					cx={targetPoint.x}
					cy={targetPoint.y}
					r={3}
					fill="rgba(0, 0, 255, 0.5)"
					strokeWidth={1}
				/>
			)}

			<path
				d={path}
				stroke={stroke}
				strokeWidth={strokeWidth}
				fill="none"
				className={className}
				ref={ref}
				{...rest}
			/>
		</g>
	);
});
