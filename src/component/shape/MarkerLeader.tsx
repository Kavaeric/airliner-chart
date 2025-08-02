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
 * Returns the Manhattan distance between two points.
 * 
 * @param {number} x1 - X coordinate of the first point
 * @param {number} y1 - Y coordinate of the first point
 * @param {number} x2 - X coordinate of the second point
 * @param {number} y2 - Y coordinate of the second point
 * @returns {number} - The Manhattan distance between the two points
 */
function getManhattanDistance(x1: number, y1: number, x2: number, y2: number) {
	return Math.abs(x2 - x1) + Math.abs(y2 - y1);
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
	startOffset?: number;
	endOffset?: number;
	angleStep?: number;
	minLength?: number;
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
 * Calculates the midpoint for leader line based on outward direction.
 * Creates orthogonal segments (horizontal or vertical) based on the target edge.
 * 
 * @param anchorPoint - The starting point of the line
 * @param targetPoint - The target point (closest point on bounding box)
 * @param outwardDirection - The direction from target ('left', 'right', 'top', 'bottom', or null)
 * @returns The calculated midpoint for the leader line
 */
function calculateMidPoint(
	anchorPoint: { x: number; y: number },
	targetPoint: { x: number; y: number },
	outwardDirection: string | null
): { x: number; y: number } {
	if (!outwardDirection) {
		return getMidPoint(anchorPoint.x, anchorPoint.y, targetPoint.x, targetPoint.y);
	}
	
	const isHorizontal = outwardDirection === 'left' || outwardDirection === 'right';
	
	return isHorizontal
		? { x: targetPoint.x, y: anchorPoint.y }  // Horizontal line
		: { x: anchorPoint.x, y: targetPoint.y }; // Vertical line
}

/**
 * Calculates an offset point by moving along or away from a line direction.
 * 
 * @param basePoint - The point to offset from
 * @param directionPoint - The point that defines the direction vector
 * @param offset - The amount to offset (positive extends, negative shortens)
 * @param isStartOffset - Whether this is a start offset (moves away from line) or end offset (moves along line)
 * @returns The offset point
 */
function calculateOffsetPoint(
	basePoint: { x: number; y: number },
	directionPoint: { x: number; y: number },
	offset: number,
	isStartOffset: boolean
): { x: number; y: number } {
	if (offset === 0) return { ...basePoint };
	
	const direction = {
		x: directionPoint.x - basePoint.x,
		y: directionPoint.y - basePoint.y
	};
	const distance = Math.sqrt(direction.x ** 2 + direction.y ** 2);
	
	if (distance === 0) return { ...basePoint };
	
	const unitVector = {
		x: direction.x / distance,
		y: direction.y / distance
	};
	
	// Start offset moves away from line, end offset moves along line
	const multiplier = isStartOffset ? -1 : 1;
	
	return {
		x: basePoint.x + unitVector.x * offset * multiplier,
		y: basePoint.y + unitVector.y * offset * multiplier
	};
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
 * @param {number} props.startOffset - Amount to offset the start of the line
 * @param {number} props.endOffset - Amount to offset the end of the line
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
	startOffset = 0,
	endOffset = 0,
	minLength = 12,
	className,
	debug = false,
	...rest
}, ref) => {

	const anchorPoint: { x: number; y: number } = { x: x1, y: y1 };
	const initialTargetPoint: { x: number; y: number } = { x: x2, y: y2 };

	// Early return: Check if line is too short for clipping box
	if (clippingBBox) {
		const closestPointOnClippingBox = getClosestPointOnRect(x1, y1, x2, y2, clippingBBox.width, clippingBBox.height);
		const distanceToClippingBox = getManhattanDistance(x1, y1, closestPointOnClippingBox.point.x, closestPointOnClippingBox.point.y);
		
		if (distanceToClippingBox < minLength) {
			return null;
		}
	}
	
	// Calculate target point and outward direction
	let outwardDirection: string | null = null;
	let targetPoint = { ...initialTargetPoint };
	
	if (targetBBox) {
		const { point, edge } = getClosestPointOnRect(x1, y1, x2, y2, targetBBox.width, targetBBox.height);
		targetPoint = point;
		outwardDirection = edge;
	}

	// Calculate midpoint using helper function
	const midPoint = calculateMidPoint(anchorPoint, targetPoint, outwardDirection);

	// Apply offsets using helper function
	const adjustedAnchorPoint = calculateOffsetPoint(anchorPoint, midPoint, startOffset, true);
	const adjustedTargetPoint = calculateOffsetPoint(targetPoint, midPoint, endOffset, false);

	// Draw the line using the adjusted points
	const path = `M ${adjustedAnchorPoint.x} ${adjustedAnchorPoint.y} L ${midPoint.x} ${midPoint.y} L ${adjustedTargetPoint.x} ${adjustedTargetPoint.y}`;
	

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
				fill="none"
				className={className}
				ref={ref}
				{...rest}
			/>
		</g>
	);
});
