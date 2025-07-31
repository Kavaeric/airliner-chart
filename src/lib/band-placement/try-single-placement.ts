/**
 * Single object placement utilities for band-based placement algorithms.
 * 
 * This module contains the core logic for attempting to place a single object
 * within a chart band, including range selection, position calculation, and
 * boundary validation.
 */

import type { 
	PlacementObject, 
	PlacementBand, 
	BandOccupancy, 
	Range 
} from './band-placement-types';

/**
 * @type {Function} selectRangeAtX
 * Returns the first range that contains the given x position.
 * 
 * @param ranges - BandOccupancy.availableRanges for the Band
 * @param x - The x position to check
 * @returns The containing range, or null if none found
 * 
 * @example
 * // occupancy.availableRanges = [
 * //   { start: 0, end: 100 },
 * //   { start: 150, end: 200 },
 * //   { start: 200, end: 300 }
 * // ]
 * const range = selectRangeAtX(occupancy.availableRanges || [], 175);
 * // Returns { start: 150, end: 200 }
 */
function selectRangeAtX(ranges: Range[], x: number): Range | null {
	for (let i = 0; i < ranges.length; i++) {
		if (ranges[i].start <= x && ranges[i].end >= x) return ranges[i];
	}
	return null;
}

/**
 * Clamps a value between a minimum and maximum.
 * 
 * @param value - The value to clamp
 * @param min - The minimum value, or lower bound
 * @param max - The maximum value, or upper bound
 * @returns The clamped value
 */
function clampValue(value: number, min: number, max: number) {
	return Math.max(min, Math.min(value, max));
}

/**
 * @type {Function} clampYPositionInBand
 * Clamps an object's y position so that it remains within the vertical bounds of a band.
 *
 * Ensures the object's centre y coordinate does not cause it to extend above the band's top or below the band's bottom,
 * taking into account the object's height.
 *
 * @param {PlacementBand} band - The band within which to clamp the y position.
 * @param {{width: number, height: number}} dimensions - The dimensions of the object to be placed.
 * @param {number} y - The desired y coordinate for the object's centre.
 * @returns {number} The clamped y coordinate for the object's centre.
 */
function clampYPositionInBand(
	band: PlacementBand,
	dimensions: { width: number; height: number },
	y: number
) {
	return Math.max(
		band.top + dimensions.height / 2,
		Math.min(y, band.bottom - dimensions.height / 2)
	);
}

/**
 * Attempts to place an object in a band with flexible horizontal and vertical alignment.
 *
 * @param occupancy - BandOccupancy for the band
 * @param band - PlacementBand for the band
 * @param anchorWithOffset - Anchor position with offset applied
 * @param xAlign - Horizontal alignment mode:
 *   - `'centre'`: Centre the object on the anchor. If the object's extents are outside the band, clamp.
 *   - `'left-to-anchor'`: Align the object's left edge with the anchor.
 *   - `'right-to-anchor'`: Align the object's right edge with the anchor.
 * @param strict - Whether the object's extents must be within the band.
 *   - `false`: The object's extents may be outside the band, and will be clamped to the band. This is the default.
 *   - `true`: The object's extents must be within the band. If the object's extents are outside the band, return null.
 * @param dimensions - Object dimensions
 * @param maxDistance - Maximum allowed distance from anchor for placement
 * @param id - The id to assign to the placed object
 * @param ignoreBandExtents - If the object is at the left or right edge of the band, control if the object is allowed to be placed anyway.
 *   - `'none'`: The object's extents must be within the band. If the object's extents are outside the band, return null.
 *   - `'left'`: If the object's extents are outside the band, place the object anyway, but align the object's right side to the right side of the range.
 *   - `'right'`: If the object's extents are outside the band, place the object anyway, but align the object's left side to the left side of the range.
 *   - `'both'`: Both `left` and `right`.
 * @returns PlacementObject if placement is successful, or null if not
 */
export function trySinglePlacement(
	id: string,
	occupancy: BandOccupancy,
	band: PlacementBand,
	anchorWithOffset: { x: number; y: number },
	xAlign: 'centre' | 'left-to-anchor' | 'right-to-anchor',
	strict: boolean = false,
	dimensions: { width: number; height: number },
	maxDistance: { x: number; y: number },
	ignoreBandExtents: 'none' | 'left' | 'right' | 'both' = 'both'
): PlacementObject | null {

	// 1. Treat anchor as immutable reference point
	const anchor = { ...anchorWithOffset };

	// 2. Compute candidateX based on alignment mode (never mutate anchor)
	let candidateX: number;
	if (xAlign === 'left-to-anchor') {
		candidateX = anchor.x - dimensions.width / 2;
	} else if (xAlign === 'right-to-anchor') {
		candidateX = anchor.x + dimensions.width / 2;
	} else {
		candidateX = anchor.x;
	}

	let selectedRange: Range | null = null;

	// If we're not being strict, we can clamp the candidateX to the band's extents
	if (!strict) {
		selectedRange = selectRangeAtX(occupancy.availableRanges || [], clampValue(candidateX, band.left, band.right));
	} else {
		selectedRange = selectRangeAtX(occupancy.availableRanges || [], candidateX);
	}

	// If no range is found, return null
	if (!selectedRange) return null;

	// 4. Calculate if the object is at the start or end of the band
	const atBandStart = selectedRange ? selectedRange.start === band.left : false;

	// 5. Calculate if the object is at the start or end of the band
	const atBandEnd = selectedRange ? selectedRange.end === band.right : false;

	// 6. Check if the object is allowed to be placed at the start or end of the band
	const allowLeftOverflow = ignoreBandExtents === 'left' || ignoreBandExtents === 'both';
	const allowRightOverflow = ignoreBandExtents === 'right' || ignoreBandExtents === 'both';

	// 7. Early returns for invalid or impossible placements
	if (selectedRange.width < dimensions.width && !(atBandStart && allowLeftOverflow) && !(atBandEnd && allowRightOverflow)) return null;

	// If we are being strict about placement
	if (strict) {
		// Check if the left extent of the object is outside the range
		if (selectedRange.start > candidateX - dimensions.width / 2) {
			return null;
		}
	
		// Check if the right extent of the object is outside the range
		if (selectedRange.end < candidateX + dimensions.width / 2) {
			return null;
		}
	}

	// 8. Calculate the final x position
	let finalX: number;
	finalX = candidateX;

	// 9. Handle edge cases for narrow ranges
	if (atBandStart && allowLeftOverflow && selectedRange.width < dimensions.width) {
		// If the object is at the start of the band, and allowed to overflow left, place the object at the right edge of the range
		finalX = selectedRange.end - dimensions.width / 2;

	} else if (atBandEnd && allowRightOverflow && selectedRange.width < dimensions.width) {
		// If the object is at the end of the band, and allowed to overflow right, place the object at the left edge of the range
		finalX = selectedRange.start + dimensions.width / 2;

	} else if (selectedRange.width >= dimensions.width) {
		// Otherwise, the object is wide enough to be placed in the range
		finalX = clampValue(candidateX, selectedRange.start + dimensions.width / 2, selectedRange.end - dimensions.width / 2);

	}
	
	// 10. Calculate the final y position
	let finalY = clampYPositionInBand(band, dimensions, anchor.y);

	// 11. Clamp ranges
	// Ensure the placement stays within the permitted range from the anchor
	// Account for object dimensions: clamp so object edges stay within maxDistance bounds
	finalX = clampValue(finalX, anchor.x - maxDistance.x - dimensions.width / 2, anchor.x + maxDistance.x + dimensions.width / 2);

	// 12. Return placement object
	return {
		id,
		anchor,
		dimensions,
		placedPosition: { x: finalX, y: finalY },
		bandIndex: band.index
	};
} 