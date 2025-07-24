import { PlacementBand } from "./chart-bands";
import { BandOccupancy, consolidateOverlappingRanges, Range, invertOccupiedRangesToAvailable } from './band-occupancy';
import { detectClustersWithFlatbush } from './detect-clusters-with-flatbush';
import { solve, Model, Constraint } from 'yalps';

// --- Type for unplaced objects (enforced throughout placement flow) ---
/**
 * Represents an object to be placed by the algorithm.
 * This type is used for all placement object arrays and function parameters.
 */
type PlacementObject = {
	id: string;
	anchor: { x: number; y: number };
	position: { x?: number; y?: number };
	dimensions: { width: number; height: number };
};

/**
 * Represents an object that could not be placed by the algorithm.
 * This type is used for all unplaced/failure arrays and return values.
 */
type UnplacedPlacementObject = {
	id: string;
	anchor: { x: number; y: number };
	dimensions: { width: number; height: number };
};

/**
 * @type {Object} PlacementStrategy
 * Describes the placement strategy for the band placement algorithm, split by phase.
 *
 * @property {Object} firstPass - The initial simple placement strategy.
 *   @property {Array<string>} modes
 *     Ordered list of placement modes to attempt for each object, in priority order.
 *     - `'left'`: Place object to the immediate left of its anchor within the home band.
 *     - `'right'`: Place object to the immediate right of its anchor within the home band.
 *     - `'top'`: Place object in the band above, centre-aligned to the anchor.
 *     - `'bottom'`: Place object in the band below, centre-aligned to the anchor.
 *     - `'top-left'`: Place object in the band above, left-aligned to the anchor.
 *     - `'top-right'`: Place object in the band above, right-aligned to the anchor.
 *     - `'bottom-left'`: Place object in the band below, left-aligned to the anchor.
 *     - `'bottom-right'`: Place object in the band below, right-aligned to the anchor.
 *     The algorithm tries each mode in order and uses the first valid placement found.
 *   @property {Object} [maxDistance] - Maximum allowed distance from the anchor for first pass placement.
 *     @property {number} [x] - Maximum horizontal distance (default: 50).
 *     @property {number} [y] - Maximum vertical distance (default: 50).
 *   @property {Object} [offset] - Optional offset to apply to the anchor before placement.
 *     @property {number} [x] - Horizontal offset.
 *     @property {number} [y] - Vertical offset.
 * @property {Object} sweep - The sweep search fallback strategy, used if firstPass fails.
 *   @property {'sweep-to-left'|'sweep-to-right'} horizontal - Direction to sweep horizontally from the anchor.
 *   @property {number[]} verticalSearch - Array of index modifiers for vertical band search order. Examples:
 *     - [0] = home band only
 *     - [-1,0,1] = above, home, below
 *     - [0,1,-1,2,-2] = ping-pong above/below
 *     - [0,1,-1,2,-2,3,-3] = ping-pong above/below, then above/below again
 *   @property {Object} [maxDistance] - Maximum allowed distance from the anchor for sweep placement.
 *     @property {number} [x] - Maximum horizontal distance (default: 50).
 *     @property {number} [y] - Maximum vertical distance (default: 50).
 *   @property {number} stepFactor - Step size for sweep search (default: 1 = one object width, 0.5 = half width).
 *   @property {number} [maxIterations] - Optional maximum number of sweep steps; if omitted, sweeps until out of bounds.
 *   @property {Object} [offset] - Optional offset to apply to the anchor during sweep.
 *   @property {Object} [xAlign] - The x alignment to use for when placing objects during the sweep.
 *     - `'centre'`: Centre the object on the anchor. If the object's extents are outside the band, clamp.
 *     - `'left-anchor'`: Align the object's left edge with the anchor.
 *     - `'right-anchor'`: Align the object's right edge with the anchor.
 *     Default is 'centre'.
 */
export type PlacementStrategy = {
	firstPass: {
		modes: Array<'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>;
		maxDistance?: { x?: number; y?: number };
		offset?: { x?: number; y?: number };
	};
	sweep: {
		horizontal: 'sweep-to-left' | 'sweep-to-right' ;
		verticalSearch: number[];
		maxDistance?: { x?: number; y?: number };
		stepFactor: number | 1;
		maxIterations?: number;
		offset?: { x?: number; y?: number };
		xAlign: 'centre' | 'left-to-anchor' | 'right-to-anchor';
	};
};

/**
 * @type {Object} BandPlacedObject
 * Represents an object that has been placed in a band.
 *
 * @property {string} id - Unique identifier for the placed object.
 * @property {number} x - The x position of the object.
 * @property {number} y - The y position of the object.
 * @property {Object} anchor - The anchor position of the object.
 *   @property {number} x - The anchor x coordinate.
 *   @property {number} y - The anchor y coordinate.
 * @property {number} bandIndex - The band index where the object was placed.
 */
export type BandPlacedObject = {
	id: string;
	x: number;
	y: number;
	anchor: { x: number; y: number };
	bandIndex: number;
}

/**
 * @type {Object} BandPlacementConfig
 * Configuration object for band-based placement.
 *
 * @property {Object} dimensions - The chart dimensions.
 *   @property {number} width - Chart width.
 *   @property {number} height - Chart height.
 * @property {PlacementBand[]} bands - Array of bands (vertical slices).
 * @property {BandOccupancy[]} occupancy - Array of band occupancy objects.
 * @property {Object[]} objects - Array of objects to place.
 *   @property {string} id - Unique identifier for the object.
 *   @property {Object} anchor - Anchor position for the object.
 *     @property {number} x - Anchor x coordinate.
 *     @property {number} y - Anchor y coordinate.
 *   @property {Object} position - (Optional) Predefined position for the object.
 *   @property {Object} dimensions - Object dimensions (width, height).
 * @property {Object} [clusterDetection] - Cluster detection settings.
 *   @property {number|Object} distance - Distance for cluster detection (number or {x, y}).
 * @property {PlacementStrategy} strategy - Placement strategy to use.
 */
export interface BandPlacementConfig {
	dimensions: { width: number; height: number };
	bands: PlacementBand[];
	occupancy: BandOccupancy[];
	objects: PlacementObject[];
	clusterDetection?: { distance: number | { x: number; y: number } };
	strategy: PlacementStrategy;
}

/**
 * @type {Function} selectRangeInBand
 * Selects an available range using a custom selector function.
 *
 * Filters all available ranges in the occupancy for those wide enough for the object,
 * then passes the filtered list to the selector function, which picks the "best" one.
 * 
 * For simple cases, use `selectRangeAtX` instead.
 *
 * @param occupancy - BandOccupancy for the band
 * @param anchor - The anchor position
 * @param dimensions - The object's dimensions
 * @param selector - Function that receives all valid ranges and returns the chosen one. Selector functions are passed the list of available ranges and the anchor position. Use similarly to the selector functions for `Array.reduce` or `Array.find` etc. See below for examples.
 * @returns The selected Range for placement, or null if none found
 *
 * @example
 * // Furthest right range
 * const range = selectRangeInBand(occupancy, anchor, dimensions, (ranges) =>
 *   ranges.length ? ranges.reduce((a, b) => a.start > b.start ? a : b) : null
 * );
 *
 * // Closest to anchor
 * const range = selectRangeInBand(occupancy, anchor, dimensions, (ranges, ctx) =>
 *   ranges.length ? ranges.reduce((a, b) => Math.abs(a.start - ctx.anchor.x) < Math.abs(b.start - ctx.anchor.x) ? a : b) : null
 * );
 */
function selectRangeInBand(
	occupancy: BandOccupancy,
	anchor: { x: number; y: number },
	dimensions: { width: number; height: number },
	selector: (ranges: Range[], context: { anchor: { x: number; y: number }, dimensions: { width: number; height: number } }) => Range | null
): Range | null {
	const availableRanges = occupancy.availableRanges || [];
	if (availableRanges.length === 0) return null;
	return selector(availableRanges, { anchor, dimensions });
}

/**
 * @type {Function} selectRangeAtX
 * Returns the first range that contains the given x position.
 * 
 * For more sophisticated range selection, use `selectRangeInBand` instead.
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
 * Returns the left and right extents of an object given its centre x and width.
 * @param x - Centre x position
 * @param width - Object width
 * @returns { left: number, right: number }
 */
function getObjectExtents(x: number, width: number): { left: number; right: number } {
	return {
		left: x - width / 2,
		right: x + width / 2
	};
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
 * @param yAlign - Vertical alignment mode:
 *   - `'none'`: Clamp to the band
 *   - `'top'`: Align to the top of the band
 *   - `'bottom'`: Align to the bottom of the band
 *   - `'middle'`: Align to the middle of the band
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
 * @returns BandPlacedObject if placement is successful, or null if not
 */
function trySinglePlacement(
	id: string,
	occupancy: BandOccupancy,
	band: PlacementBand,
	anchorWithOffset: { x: number; y: number },
	xAlign: 'centre' | 'left-to-anchor' | 'right-to-anchor',
	yAlign: 'none' | 'middle' | 'top' | 'bottom',
	strict: boolean = false,
	dimensions: { width: number; height: number },
	maxDistance: { x: number; y: number },
	ignoreBandExtents: 'none' | 'left' | 'right' | 'both' = 'both'
): BandPlacedObject | null {
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

	if (!selectedRange) {
		return null;
	}
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

	let finalX: number;
	finalX = candidateX;

	// 8. Handle edge cases for narrow ranges
	if (atBandStart && allowLeftOverflow && selectedRange.width < dimensions.width) {
		// If the object is at the start of the band, and allowed to overflow left, place the object at the right edge of the range
		finalX = selectedRange.end - dimensions.width / 2;

	} else if (atBandEnd && allowRightOverflow && selectedRange.width < dimensions.width) {
		// If the object is at the end of the band, and allowed to overflow right, place the object at the left edge of the range
		finalX = selectedRange.start + dimensions.width / 2;

	} else if (selectedRange.width >= dimensions.width) {
		// Otherwise, the object is wide enough to be placed in the range
		finalX = clampValue(candidateX, selectedRange.start + dimensions.width / 2, selectedRange.end - dimensions.width / 2);

	} else {
		return null;
	}
	
	// 9. Calculate the final y position
	let finalY = clampYPositionInBand(band, dimensions, anchor.y);

	// 10. Clamp ranges
	// Ensure the placement stays within the permitted range from the anchor
	finalX = clampValue(finalX, anchor.x - maxDistance.x, anchor.x + maxDistance.x);

	// If the left or right extents of the object are off the band, return null
	if (finalX + dimensions.width / 2 < band.left) {return null;}
	if (finalX - dimensions.width / 2 > band.right) {return null;}

	// Clamp the finalY to the maximum allowed distance from the anchor
	// finalY = clampValue(finalY, anchor.y - maxDistance.y, anchor.y + maxDistance.y);

	// 11. Return placement object
	return {
		id,
		x: finalX,
		y: finalY,
		anchor,
		bandIndex: band.index
	};
}

/**
 * Clamps a value between a minimum and maximum
 * @param value - The value to clamp
 * @param min - The minimum value, or lower bound
 * @param max - The maximum value, or upper bound
 * @returns The clamped value
 */
function clampValue(value: number, min: number, max: number) {
	return Math.max(min, Math.min(value, max));
}

// Returns the y position of an object in a band, aligned to the top, bottom, or middle
function alignYPositionInBand(band: PlacementBand, dimensions: {width: number, height: number}, align: 'top' | 'bottom' | 'middle' = 'top') {
	if (align === 'top') {
		return band.top + dimensions.height / 2;
	} else if (align === 'bottom') {
		return band.bottom - dimensions.height / 2;
	} else {
		return (band.top + band.bottom) / 2;
	}
}

// Clamps an object's y position to the top or bottom of a band
function clampYPositionInBand(band: PlacementBand, dimensions: {width: number, height: number}, y: number) {
	return Math.max(band.top + dimensions.height / 2, Math.min(y, band.bottom - dimensions.height / 2));
}

/**
 * Builds a Map for O(1) lookup of PlacementBand by band index.
 *
 * @param bands - Array of PlacementBand objects
 * @returns Map from band index to PlacementBand
 */
function buildBandMap(bands: PlacementBand[]) {
	return new Map(bands.map(b => [b.index, b]));
}

/**
 * Builds a Map for O(1) lookup of BandOccupancy by band index.
 *
 * @param occupancy - Array of BandOccupancy objects
 * @returns Map from band index to BandOccupancy
 */
function buildOccupancyMap(occupancy: BandOccupancy[]) {
	return new Map(occupancy.map(o => [o.bandIndex, o]));
}

/**
 * Finds the index of the band whose vertical span contains the given anchor Y coordinate.
 *
 * @param bands - Array of PlacementBand objects
 * @param anchorY - The Y coordinate of the anchor
 * @returns The index of the band containing anchorY, or -1 if not found
 */
function findHomeBandIndex(bands: PlacementBand[], anchorY: number): number {
	for (let i = 0; i < bands.length; i++) {
		const band = bands[i];
		// Check if the band's top is above the anchor's Y coordinate and its bottom is below the anchor's Y coordinate.
		if (band.top <= anchorY && band.bottom >= anchorY) {
			return i;
		}
	}
	return -1;
}

/**
 * Determines the maximum allowed distance from the anchor for placement, based on the strategy phase.
 *
 * @param maxDistance - The maxDistance object from the strategy phase
 * @returns Object with x and y properties for max allowed distance
 */
function getMaxDistance(maxDistance?: { x?: number; y?: number }): { x: number; y: number } {
	return {
		y: maxDistance?.y ?? 50,
		x: maxDistance?.x ?? 50
	};
}

/**
 * @type {Function} resolveSimplePlacement
 * Attempts to place a single object by iterating through pre-defined placement modes.
 * Uses the placement modes as the order in which to try to place the object.
 *
 * Methodology:
 * - Computes the anchor position, applying any offset from strategy.firstPass.offset.
 * - Iterates through each placement mode in strategy.firstPass.modes (e.g., 'left', 'right', 'top-left', etc.), in order.
 * - For each mode, attempts to place the object at the corresponding position/alignment (e.g., left/right in the home band, or above for top modes) by calling tryPlacement.
 * - Returns the first valid placement found.
 * - If no valid placement is found after all modes, returns null.
 *
 * @param placementObject - The object to place (id, anchor, dimensions)
 * @param strategy - The placement strategy to use (see PlacementStrategy.firstPass)
 * @param bandArr - Array of PlacementBand objects
 * @param occupancyArr - Array of BandOccupancy objects
 * @param homeBandIndex - The index of the object's home band
 * @param maxDistance - Maximum allowed distance from anchor for placement
 * @returns BandPlacedObject if placement is successful, or null if no valid position is found
 */
function resolvePlacementSimple(
	placementObject: PlacementObject,
	strategy: PlacementStrategy,
	bandArr: PlacementBand[],
	occupancyArr: BandOccupancy[],
	homeBandIndex: number,
	maxDistance: { x: number; y: number }
): BandPlacedObject | null {
	const anchor = placementObject.anchor;
	const dimensions = placementObject.dimensions;
	const offset = strategy.firstPass.offset;
	const anchorWithOffset = {
		x: anchor.x + (offset?.x ?? 0),
		y: anchor.y + (offset?.y ?? 0)
	};
	const band = bandArr[homeBandIndex];
	const occupancy = occupancyArr[homeBandIndex];

	// Try each strategy in order based on the given list of modes, return the first successful placement
	for (const mode of strategy.firstPass.modes) {
		switch (mode) {
			case 'left': {
				if (band && occupancy && anchorWithOffset.x) {
					const placement = trySinglePlacement(placementObject.id, occupancy, band, anchorWithOffset, 'left-to-anchor', 'none', false, dimensions, maxDistance);
					if (placement) return placement;
				}
				break;
			}
			case 'right': {
				if (band && occupancy && anchorWithOffset.x) {
					const placement = trySinglePlacement(placementObject.id, occupancy, band, anchorWithOffset, 'right-to-anchor', 'none', false, dimensions, maxDistance);
					if (placement) return placement;
				}
				break;
			}
			case 'top': {
				const bandAbove = bandArr[homeBandIndex - 1];
				const occupancyAbove = occupancyArr[homeBandIndex - 1];
				if (bandAbove && occupancyAbove) {
					const placement = trySinglePlacement(placementObject.id, occupancyAbove, bandAbove, anchorWithOffset, 'centre', 'bottom', false, dimensions, maxDistance);
					if (placement) return placement;
				}
				break;
			}
			case 'bottom': {
				const bandBelow = bandArr[homeBandIndex + 1];
				const occupancyBelow = occupancyArr[homeBandIndex + 1];
				if (bandBelow && occupancyBelow) {
					const placement = trySinglePlacement(placementObject.id, occupancyBelow, bandBelow, anchorWithOffset, 'centre', 'top', false, dimensions, maxDistance);
					if (placement) return placement;
				}
				break;
			}
			case 'top-left': {
				const bandAbove = bandArr[homeBandIndex - 1];
				const occupancyAbove = occupancyArr[homeBandIndex - 1];
				if (bandAbove && occupancyAbove) {
					const placement = trySinglePlacement(placementObject.id, occupancyAbove, bandAbove, anchorWithOffset, 'left-to-anchor', 'bottom', false, dimensions, maxDistance);
					if (placement) return placement;
				}
				break;
			}
			case 'top-right': {
				const bandAbove = bandArr[homeBandIndex - 1];
				const occupancyAbove = occupancyArr[homeBandIndex - 1];
				if (bandAbove && occupancyAbove) {
					const placement = trySinglePlacement(placementObject.id, occupancyAbove, bandAbove, anchorWithOffset, 'right-to-anchor', 'bottom', false, dimensions, maxDistance);
					if (placement) return placement;
				}
				break;
			}
			case 'bottom-left': {
				const bandBelow = bandArr[homeBandIndex + 1];
				const occupancyBelow = occupancyArr[homeBandIndex + 1];
				if (bandBelow && occupancyBelow) {
					const placement = trySinglePlacement(placementObject.id, occupancyBelow, bandBelow, anchorWithOffset, 'left-to-anchor', 'top', false, dimensions, maxDistance);
					if (placement) return placement;
				}
				break;
			}
			case 'bottom-right': {
				const bandBelow = bandArr[homeBandIndex + 1];
				const occupancyBelow = occupancyArr[homeBandIndex + 1];
				if (bandBelow && occupancyBelow) {
					const placement = trySinglePlacement(placementObject.id, occupancyBelow, bandBelow, anchorWithOffset, 'right-to-anchor', 'top', false, dimensions, maxDistance);
					if (placement) return placement;
				}
				break;
			}
			default:
				break;
		}
	}
	// Explicitly return null if no placement was found in any case
	return null;
}

/**
 * Internal helper to precompute band/occupancy/y/yAlign for all bands to check
 *
 * This is a performance optimisation to avoid recalculating these values for each object.
 *
 * @param bandIndicesToCheck - Array of band indices to check
 * @param bandArr - Array of PlacementBand objects
 * @param occupancyArr - Array of BandOccupancy objects
 * @param homeBandIndex - The index of the object's home band
 * @param dimensions - The object's dimensions
 * @returns Array of candidate objects with bandIndex, band, occupancy, y, and yAlign
 */
function precomputeBandCandidates(
	bandIndicesToCheck: number[],
	bandArr: PlacementBand[],
	occupancyArr: BandOccupancy[],
	homeBandIndex: number,
	dimensions: { width: number; height: number }
): Array<{ bandIndex: number; band: PlacementBand; occupancy: BandOccupancy; y: number; yAlign: 'middle' | 'top' | 'bottom' }> {
	return bandIndicesToCheck
		.map(bandIndex => {
			const band = bandArr[bandIndex];
			const occupancy = occupancyArr[bandIndex];
			if (!band || !occupancy) return undefined;
			let yAlign: 'middle' | 'top' | 'bottom' = 'middle';
			if (bandIndex < homeBandIndex) yAlign = 'bottom';
			else if (bandIndex > homeBandIndex) yAlign = 'top';
			const y = alignYPositionInBand(band, dimensions, yAlign);
			return { bandIndex, band, occupancy, y, yAlign };
		})
		.filter((c): c is { bandIndex: number; band: PlacementBand; occupancy: BandOccupancy; y: number; yAlign: 'middle' | 'top' | 'bottom' } => !!c);
}

/**
 * Attempts to place a single object using a sweep search strategy.
 * Sweeps horizontally from the anchor position, checking for available space in the band order defined by the vertical fallback strategy.
 *
 * @param placementObject - The object to place (id, anchor, dimensions)
 * @param strategy - The placement strategy to use
 * @param bands - Array of PlacementBand objects to sweep through
 * @param occupancyArr - Array of BandOccupancy objects
 * @param homeBandIndex - The index of the object's home band
 * @param maxDistance - Maximum allowed distance from anchor for placement
 * @param debugCollector - Optional debug collector to store xSteps for this object
 * @returns BandPlacedObject if placement is successful, or null if no valid position is found
 */
function resolvePlacementSweep(
	placementObject: PlacementObject,
	strategy: PlacementStrategy,
	bands: PlacementBand[],
	occupancyArr: BandOccupancy[],
	homeBandIndex: number,
	maxDistance: { x: number; y: number },
	debugCollector?: { [id: string]: any }
): BandPlacedObject | null {
	// Sweeps left to right to try to place an object based on the vertical search strategy

	const verticalSearch = strategy.sweep.verticalSearch;
	const bandIndicesToCheck = getBandSearchOrder(homeBandIndex, bands, verticalSearch);

	const anchorX = placementObject.anchor.x + (strategy.sweep.offset?.x ?? 0);
	const dimensions = placementObject.dimensions;

	// If the x anchor is less than 0 (past left edge of the chart), skip
	if (anchorX < 0 - dimensions.width) {
		// console.log(`resolvePlacementSweep: Skipping ${placementObject.id} at ${placementObject.anchor.x}, ${placementObject.anchor.y} because it's past the left edge of the chart.`);
		return null;
	}

	const stepSize = strategy.sweep.stepFactor * dimensions.width;
	const maxIterations = strategy.sweep.maxIterations;
	
	// Determine the number of steps for the sweep
	const maxSteps = maxIterations !== undefined ? maxIterations : 20;

	// Determine sweep direction: 'sweep-to-right' means positive X, 'sweep-to-left' means negative X
	const direction = strategy.sweep.horizontal === 'sweep-to-right' ? 1 : -1;
	const xAlign = strategy.sweep.xAlign;

	// Precompute candidate band/occupancy/y/yAlign for all bands to check
	const bandCandidates = precomputeBandCandidates(bandIndicesToCheck, bands, occupancyArr, homeBandIndex, dimensions);

	// Precompute all x-coordinates to be checked during the sweep
	const xSteps: number[] = [];
	for (let step = 0; step < maxSteps; step++) {
		const x = anchorX + step * stepSize * direction;
		xSteps.push(x);
	}

	// Debug: Collect xSteps for this object if a collector is provided
	if (debugCollector) {
		debugCollector[placementObject.id] = { xSteps };
	}

	// console.log(`resolvePlacementSweep: Precomputed steps ${xSteps.join(', ')} for ${placementObject.id}.`);

	// Sweep loop: iterate over precomputed x-coordinates
	for (const x of xSteps) {
		for (const { band, occupancy, y, yAlign } of bandCandidates) {
			const candidate = { x, y };

			// If the y position is beyond the maximum distance from the anchor, skip
			if (Math.abs(y - placementObject.anchor.y) > maxDistance.y) continue;

			const placed = trySinglePlacement(placementObject.id, occupancy, band, candidate, xAlign, yAlign, false, dimensions, maxDistance);
			if (placed) {
				return placed;
			}
		}
	}

	// console.log(`resolvePlacementSweep: Failed to place ${placementObject.id} at ${placementObject.anchor.x}, ${placementObject.anchor.y}.`);

	return null;
}

/**
 * Utility to generate band indices from verticalSearch pattern
 * @param homeBandIndex - The index of the object's home band
 * @param bands - Array of PlacementBand objects
 * @param verticalSearch - Array of index modifiers for vertical band search order
 * @returns Array of band indices in the order to check for placement at each x step
 */
function getBandSearchOrder(homeBandIndex: number, bands: PlacementBand[], verticalSearch: number[]): number[] {
	return verticalSearch
		.map(mod => homeBandIndex + mod)
		.filter(idx => idx >= 0 && idx < bands.length)
		.map(idx => bands[idx].index);
}

/**
 * Main entry point for band-based placement.
 *
 * This function orchestrates the placement of objects into bands using a multi-phase approach:
 *   1. Cluster/complex placement (stubbed for future implementation)
 *   2. Simple placement pass (using resolvePlacementSimple)
 *   3. Sweep placement pass for any unplaced objects (using resolvePlacementSweep)
 *
 * The function is optimised for large datasets, using fast array access and sorting only unplaced objects between passes.
 *
 * @param config - BandPlacementConfig object containing all placement parameters
 * @returns {
 *   `placements`: Map<string, BandPlacedObject> - Map of object IDs to their placed positions
 *   `debug`: any - Debug information (e.g., clusters, sweep xSteps)
 *   `occupancy`: BandOccupancy[] - Final occupancy state for all bands
 *   `failed`: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number } }> - List of objects that failed to place
 * }
 */
export function calculateBandPlacement(config: BandPlacementConfig): {
	placements: Map<string, BandPlacedObject>;
	failed: UnplacedPlacementObject[];
	debug: any;
	occupancy: BandOccupancy[];
} {
	// --- Extract config and prepare working variables ---
	const { dimensions, bands, occupancy, objects, clusterDetection, strategy } = config;
	const width = dimensions.width;
	const chartPlacementBands = bands;
	const chartPlacementBandsOccupancy = occupancy;
	const placementObjects = objects;
	const clusterDetectionDistance = clusterDetection?.distance ?? 20;

	// --- Detect clusters (for future complex placement) ---
	const objectClusters = detectPlacementClustersWithFlatbush(placementObjects, clusterDetectionDistance);
	const placements = new Map<string, BandPlacedObject>();

	// --- Prepare occupancy and band arrays for fast indexed access ---
	let currentOccupancy = chartPlacementBandsOccupancy.map(occ => ({
		bandIndex: occ.bandIndex,
		band: occ.band,
		occupiedRanges: occ.occupiedRanges.map(r => ({ ...r })),
		availableRanges: occ.availableRanges.map(r => ({ ...r })),
	}));

	// Use arrays for fast indexed access (preparing for batch/parallel processing)
	const bandArr = chartPlacementBands;
	let occupancyArr = currentOccupancy;

	// --- 1. Cluster detection (for future complex placement) ---
	const clusteredIndices: number[] = [];
	let debug: any = {};
	const complexPlacedIds = new Set<string>();
	for (const cluster of objectClusters) {
		// All clusters (regardless of size) are processed in simple/sweep passes
		clusteredIndices.push(...cluster);
	}

	// --- Unplaced and placed maps ---
	const unplacedCandidates = new Map<string, PlacementObject>();
	for (const idx of objectClusters.flatMap(c => c)) {
		const obj = placementObjects[idx];
		unplacedCandidates.set(obj.id, obj);
	}

	// --- 2. Simple placement pass ---
	const indicesToTry = objectClusters.flatMap(c => c);
	const firstMode = strategy.firstPass.modes?.[0];
	if (firstMode) {
		if (firstMode === 'left' || firstMode === 'right' || firstMode === 'top-left' || firstMode === 'bottom-left') {
			indicesToTry.sort((a, b) => placementObjects[a].anchor.x - placementObjects[b].anchor.x);
		} else if (firstMode === 'top' || firstMode === 'bottom' || firstMode === 'top-right' || firstMode === 'bottom-right') {
			indicesToTry.sort((a, b) => placementObjects[a].anchor.y - placementObjects[b].anchor.y);
		} else {
			indicesToTry.sort((a, b) => placementObjects[a].anchor.x - placementObjects[b].anchor.x);
		}
	}

	// Prepare to collect indices of objects that will need a sweep placement pass
	const sweepIndices: number[] = [];

	// Iterate through all candidate indices for simple placement
	for (const idx of indicesToTry) {
		// Skip objects already placed by a complex placement strategy
		if (complexPlacedIds.has(placementObjects[idx].id)) continue;

		// Get the placement object for this index
		const obj = placementObjects[idx];

		// Find the most appropriate band for the object's anchor y-position
		const homeBandIndex = findHomeBandIndex(bandArr, obj.anchor.y);

		// Determine the maximum allowed distance for this placement attempt
		const maxDistance = getMaxDistance(strategy.firstPass.maxDistance);

		// Attempt to place the object using the simple placement strategy
		const placed = resolvePlacementSimple(obj, strategy, bandArr, occupancyArr, homeBandIndex, maxDistance);

		if (placed) {
			// If successfully placed, record the placement
			placements.set(obj.id, placed);

			// Remove from unplaced candidates
			unplacedCandidates.delete(obj.id);

			// Update occupancy for the band where the object was placed
			const occ = occupancyArr[placed.bandIndex];
			if (occ) {
				// Calculate the object's horizontal extents
				const extents = getObjectExtents(placed.x, obj.dimensions.width);

				// Mark this range as occupied in the band
				occ.occupiedRanges.push({
					start: extents.left,
					end: extents.right,
					width: extents.right - extents.left,
					top: occ.band.top,
					bottom: occ.band.bottom
				} as Range);

				// Recalculate available ranges in the band after this placement
				occ.availableRanges = invertOccupiedRangesToAvailable(
					consolidateOverlappingRanges(occ.occupiedRanges),
					occ.band
				);
			}
		} else {
			// If not placed, add to sweepIndices for the next placement pass
			sweepIndices.push(idx);
		}
	}

	// --- 3. Sweep placement pass for unplaced objects ---
	// Sort sweepIndices by horizontal direction (left or right) as specified in strategy
	if (strategy.sweep.horizontal === 'sweep-to-left') {
		sweepIndices.sort((a, b) => placementObjects[a].anchor.x - placementObjects[b].anchor.x);
	} else {
		sweepIndices.sort((a, b) => placementObjects[b].anchor.x - placementObjects[a].anchor.x);
	}

	// Then sort by vertical position (top to bottom)
	sweepIndices.sort((a, b) => placementObjects[a].anchor.y - placementObjects[b].anchor.y);

	// Prepare debug object for sweep placements
	const sweepDebug: { [id: string]: any } = {};

	// Attempt to place each remaining unplaced object using the sweep strategy
	for (const idx of sweepIndices) {
		const obj = placementObjects[idx];

		// Find the object's home band index based on its anchor y-position
		const homeBandIndex = findHomeBandIndex(bandArr, obj.anchor.y);

		// Determine the maximum allowed distance for this sweep placement
		const maxDistance = getMaxDistance(strategy.sweep.maxDistance);

		// Attempt to place the object using the sweep placement strategy
		const placed = resolvePlacementSweep(obj, strategy, bandArr, occupancyArr, homeBandIndex, maxDistance, sweepDebug);

		if (placed) {
			// Record the successful placement
			placements.set(obj.id, placed);

			// Remove from unplaced candidates
			unplacedCandidates.delete(obj.id);

			// Update occupancy for the band where the object was placed
			const occ = occupancyArr[placed.bandIndex];
			if (occ) {
				// Calculate the object's horizontal extents
				const extents = getObjectExtents(placed.x, obj.dimensions.width);

				// Mark this range as occupied in the band
				occ.occupiedRanges.push({
					start: extents.left,
					end: extents.right,
					width: extents.right - extents.left,
					top: occ.band.top,
					bottom: occ.band.bottom
				} as Range);

				// Recalculate available ranges in the band after this placement
				occ.availableRanges = invertOccupiedRangesToAvailable(
					consolidateOverlappingRanges(occ.occupiedRanges),
					occ.band
				);
			}
		}
	}

	// --- Compile failed objects from remaining unplaced candidates ---
	const failed: UnplacedPlacementObject[] = Array.from(unplacedCandidates.values()).map(obj => ({
		id: obj.id,
		anchor: obj.anchor,
		dimensions: obj.dimensions
	}));

	return {
		placements,
		failed,
		debug: {
			clusters: objectClusters,
			sweep: sweepDebug
		},
		occupancy: currentOccupancy,
	};
}

/**
 * Detects clusters of placement objects based on spatial proximity using Flatbush.
 *
 * This function is a thin wrapper around the generic detectClustersWithFlatbush utility, specialised for objects
 * with anchor coordinates and dimensions (i.e., placement objects). It computes each object's bounding box
 * from its anchor and dimensions, and clusters objects whose bounding boxes are within a given distance.
 *
 * @param placementObjects Array of objects to be placed, each with anchor coordinates and dimensions.
 *   - id: string (unique identifier)
 *   - anchor: { x: number, y: number } (centre point)
 *   - position: { x?: number, y?: number } (ignored)
 *   - dimensions: { width: number, height: number }
 * @param clusterDetectionDistance The distance (number or {x, y}) within which objects are considered part of the same cluster.
 *   - If a number, applies to both axes; if an object, allows separate x/y distances.
 * @returns Array of clusters, each cluster is an array of indices from placementObjects.
 *
 * @example
 * // Cluster two overlapping placement objects and one far away
 * const objs = [
 *   { id: 'a', anchor: {x: 0, y: 0}, position: {}, dimensions: {width: 10, height: 10} },
 *   { id: 'b', anchor: {x: 5, y: 5}, position: {}, dimensions: {width: 10, height: 10} },
 *   { id: 'c', anchor: {x: 100, y: 100}, position: {}, dimensions: {width: 10, height: 10} }
 * ];
 * const clusters = detectPlacementClustersWithFlatbush(objs, 10);
 * // clusters: [[0,1],[2]]
 */
function detectPlacementClustersWithFlatbush(
	placementObjects: PlacementObject[],
	clusterDetectionDistance: number | { x: number; y: number } = 20,
) {
	// For each placement object, compute its bounding box from anchor and dimensions
	// and delegate to the generic Flatbush clustering utility.
	return detectClustersWithFlatbush(
		placementObjects,
		obj => [
			obj.anchor.x - obj.dimensions.width / 2,
			obj.anchor.y - obj.dimensions.height / 2,
			obj.anchor.x + obj.dimensions.width / 2,
			obj.anchor.y + obj.dimensions.height / 2
		],
		clusterDetectionDistance
	);
}

/**
 * Attempts to place clustered objects using a complex placement algorithm.
 * For now, returns all objects as unplaced.
 *
 * @param clusterIndices - Array of indices for clustered objects
 * @param placementObjects - Array of all placement objects
 * @param bands - Array of PlacementBand objects
 * @param occupancy - Array of BandOccupancy objects
 * @param strategy - The placement strategy to use
 * @param alreadyPlaced - Array of BandPlacedObject objects that have already been placed
 * @param chartDimensions - The dimensions of the chart
 * @returns { placed: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number } }>, unplaced: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number } }>, debug: any }
 */
function resolvePlacementComplex(
	clusterIndices: number[],
	placementObjects: PlacementObject[],
	bands: PlacementBand[],
	occupancy: BandOccupancy[],
	strategy: PlacementStrategy,
	alreadyPlaced: Array<{ id: string, x: number, y: number, dimensions: { width: number, height: number } }>,
	chartDimensions: { width: number; height: number }
): {
	placed: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number }, x: number, y: number, bandIndex: number }>;
	unplaced: UnplacedPlacementObject[];
	debug: any;
} {
	/**
	 * Complex Placement Algorithm Outline (Flatbush + YALPS)
	 *
	 * 1. Partitioning (if needed):
	 *    - If the cluster is large, partition by band or spatially (using flatbush) into sub-clusters.
	 *
	 * 2. For each partition (cluster or sub-cluster):
	 *    a. Feasible Placement Generation:
	 *       - For each object:
	 *         1. Generate candidate placements within a local area around the anchor (e.g., within a radius or a few bands).
	 *         2. Only consider placements within allowed bands.
	 *         3. Use flatbush to check for overlaps with obstacles and already-placed objects. Discard infeasible placements.
	 *    b. ILP Problem Construction (using YALPS):
	 *       - For all objects in the partition:
	 *         1. For each object and each feasible placement, create a binary variable (placed or not).
	 *         2. Constraints:
	 *            - Each object must be placed exactly once.
	 *            - No two objects may be placed in overlapping positions.
	 *            - (Optional) Max distance from anchor.
	 *         3. Objective: Minimise total displacement from anchors (or other quality metric).
	 *    c. ILP Solving:
	 *       - Use YALPS to solve the ILP for the partition (with a timeout).
	 *       - If solved: record placements.
	 *       - If unsolved (timeout or infeasible):
	 *         - Optionally, expand search area and retry.
	 *         - If still unsolved, fall back to greedy/sweep for remaining objects.
	 *
	 * 3. Merge Results:
	 *    - Combine placements from all partitions.
	 *    - If any objects remain unplaced, place them using a fallback (greedy, sweep, or push-pull).
	 *
	 * 4. Finalisation:
	 *    - Update the global occupancy map with all placed objects.
	 *    - Return placements, failed objects, and any debug information.
	 */

	// --- Precompute maps for fast lookup ---
	const bandMap = new Map<number, PlacementBand>();
	for (const band of bands) bandMap.set(band.index, band);
	const occupancyMap = new Map<number, BandOccupancy>();
	for (const occ of occupancy) occupancyMap.set(occ.bandIndex, occ);

	// --- Prepare for Flatbush index of already placed objects (future use) ---
	const flatbushIndex: any = null;

	const allowedBandWindow = 2; // Allow home band ±2 for candidate search
	const xStep = 25; // Step size in pixels for candidate x positions

	const clusterObjects = clusterIndices.map(idx => placementObjects[idx]);

	// console.log(`feasiblePlacement: Starting, got ${clusterObjects.length} objects`);

	// --- Feasible Placement Generation ---
	// Generate feasible placements for each object in the cluster
	const DEBUG_OBJECT_ID = '36-B77W'; // Hardcoded debug id
	let debugFeasiblePlacements: Array<{ x: number; y: number; bandIdx: number }> = [];

	for (const obj of clusterObjects) {
		const feasiblePlacements: Array<{ x: number; y: number; bandIdx: number }> = [];
		const anchor = obj.anchor;
		const dims = obj.dimensions;

		// Find the object's home band index based on its anchor y position
		const homeBandIdx = findHomeBandIndex(bands, anchor.y);
		// Build a list of allowed band indices (home band ± allowedBandWindow)
		const allowedBandIndices = [];
		for (let offset = -allowedBandWindow; offset <= allowedBandWindow; offset++) {
			const idx = homeBandIdx + offset;
			if (idx >= 0 && idx < bands.length) allowedBandIndices.push(idx);
		}

		// Use precomputeBandCandidates to get band/y/occupancy for all allowed bands
		const bandCandidates = precomputeBandCandidates(allowedBandIndices, bands, occupancy, homeBandIdx, dims);

		// Set a maximum allowed vertical distance from the anchor (e.g., 2 * object height)
		const maxAllowedYDist = 1.5 * dims.width;
		// Set a maximum allowed horizontal distance from the anchor (e.g., 2 * object width)
		const maxAllowedXDist = 1.5 * dims.width;

		// For each candidate band, generate placements by sampling x and checking if x is in an available range
		for (const { bandIndex, band, occupancy, y, yAlign } of bandCandidates) {
			// Prune bands that are too far vertically from the anchor
			if (Math.abs(y - anchor.y) > maxAllowedYDist) continue;

			// Prefilter ranges that are too narrow for the object
			const allRanges = occupancy.availableRanges.filter(range => range.end - range.start >= dims.width) || [];

			// If there are no available ranges, skip this band
			if (allRanges.length === 0) continue;

			// For each available range, generate placements by sampling x and checking if x is in the range
			for (const range of allRanges) {

				// Determine the min and max x for this range, ensuring the object is fully within the range
				const minX = range.start;
				const maxX = range.end;
				
				// Generate candidate x positions radiating outward from the anchor
				const anchorX = anchor.x;
				const leftLimit = Math.ceil(range.start + dims.width / 2);
				const rightLimit = Math.floor(range.end - dims.width / 2);
				const candidateXs: number[] = [];
				if (anchorX >= leftLimit && anchorX <= rightLimit) candidateXs.push(anchorX);
				for (let offset = xStep; (anchorX - offset) >= leftLimit || (anchorX + offset) <= rightLimit; offset += xStep) {
					if ((anchorX - offset) >= leftLimit) candidateXs.push(anchorX - offset);
					if ((anchorX + offset) <= rightLimit) candidateXs.push(anchorX + offset);
				}
				for (const x of candidateXs) {
					// Ensure the object fits fully within the range
					const leftEdge = x - dims.width / 2;
					const rightEdge = x + dims.width / 2;
					if (leftEdge < range.start || rightEdge > range.end) continue;

					// Prune x positions that are too far from the anchor
					if (Math.abs(x - anchor.x) > maxAllowedXDist) continue;
					const bbox = [
						x - dims.width / 2,
						y - dims.height / 2,
						x + dims.width / 2,
						y + dims.height / 2
					];
					// Use Flatbush to check for overlaps with obstacles/placed objects (future extension)
					const overlaps = flatbushIndex ? flatbushIndex.search(...bbox) : [];
					if (!overlaps || overlaps.length === 0) {
						feasiblePlacements.push({ x, y, bandIdx: bandIndex });
					}
				}
			}
		}
		// console.log(`feasiblePlacement: Got ${feasiblePlacements.length} feasible placements for ${obj.id}`);
		if (obj.id === DEBUG_OBJECT_ID) {
			debugFeasiblePlacements = feasiblePlacements.slice();
		}
		(obj as any).feasiblePlacements = feasiblePlacements;
		if (feasiblePlacements.length === 0) {
			console.warn(`[ComplexPlacement] Object ${obj.id} has 0 feasible placements.`);
		}
	}

	// --- ILP Model Construction (YALPS) ---
	// The objective function is set to minimise the sum of distances from anchor to placement for all objects.
	// This ensures that, among all feasible solutions, the solver will prefer those where all objects are as close as possible to their anchors.
	const objectiveKey = 'displacement';

	// Build variables and constraints in YALPS-compatible format
	const variables: Record<string, { displacement: number; [constraintKey: string]: number }> = {};
	const constraints: Record<string, Constraint> = {};
	const binaries: string[] = [];
	const varKeyToPlacement: Record<string, { objectIdx: number; placementIdx: number }> = {};

	for (let objIdx = 0; objIdx < clusterObjects.length; objIdx++) {
		const obj = clusterObjects[objIdx];
		const placements = (obj as any).feasiblePlacements as Array<{ x: number; y: number; bandIdx: number }>;
		if (!placements || placements.length === 0) continue;
		for (let pIdx = 0; pIdx < placements.length; pIdx++) {
			const varKey = `${obj.id}@${pIdx}`;
			const dx = placements[pIdx].x - obj.anchor.x;
			const dy = placements[pIdx].y - obj.anchor.y;
			const dist = Math.sqrt(dx*dx + dy*dy);
			variables[varKey] = {
				displacement: -dist,
				[`assign_${obj.id}`]: 1
			};
			binaries.push(varKey);
			varKeyToPlacement[varKey] = { objectIdx: objIdx, placementIdx: pIdx };
		}
		constraints[`assign_${obj.id}`] = { equal: 1 };
	}

	// --- Overlap constraints (YALPS format) ---
	// Build a list of all placements with their bounding boxes for overlap checking
	const allPlacements: Array<{ varKey: string; objectIdx: number; placementIdx: number; bbox: [number, number, number, number] }> = [];
	for (const varKey in varKeyToPlacement) {
		const { objectIdx, placementIdx } = varKeyToPlacement[varKey];
		const obj = clusterObjects[objectIdx];
		const placement = (obj as any).feasiblePlacements[placementIdx];
		const dims = obj.dimensions;
		const bbox: [number, number, number, number] = [
			placement.x - dims.width / 2,
			placement.y - dims.height / 2,
			placement.x + dims.width / 2,
			placement.y + dims.height / 2
		];
		allPlacements.push({ varKey, objectIdx, placementIdx, bbox });
	}
	for (let i = 0; i < allPlacements.length; i++) {
		const a = allPlacements[i];
		for (let j = i + 1; j < allPlacements.length; j++) {
			const b = allPlacements[j];
			if (a.objectIdx === b.objectIdx) continue; // Only between different objects
			// Check for bounding box overlap (AABB intersection)
			if (
				a.bbox[0] < b.bbox[2] && a.bbox[2] > b.bbox[0] &&
				a.bbox[1] < b.bbox[3] && a.bbox[3] > b.bbox[1]
			) {
				const overlapKey = `no_overlap_${a.varKey}_${b.varKey}`;
				variables[a.varKey][overlapKey] = 1;
				variables[b.varKey][overlapKey] = 1;
				constraints[overlapKey] = { max: 1 };
			}
		}
	}

	const model: Model = {
		direction: 'maximize',
		objective: 'displacement',
		variables,
		constraints,
		binaries
	};

	// --- ILP Solving ---
	// Solve the model using YALPS with a timeout (e.g., 200ms)
	const solution = solve(model, { timeout: 200 });

	let placed: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number }, x: number, y: number, bandIndex: number }> = [];
	let unplaced: UnplacedPlacementObject[] = [];

	if (solution.status === 'optimal') {
		// Map selected variables back to placements
		const selectedVarKeys = new Set<string>(solution.variables.map(([varKey, value]) => varKey));
		for (const varKey of selectedVarKeys) {
			const mapping = varKeyToPlacement[varKey];
			if (!mapping) continue;
			const obj = clusterObjects[mapping.objectIdx];
			const placement = (obj as any).feasiblePlacements[mapping.placementIdx];
			// Update occupancy for the band
			const occ = occupancyMap.get(placement.bandIdx);
			if (occ) {
				const extents = {
					left: placement.x - obj.dimensions.width / 2,
					right: placement.x + obj.dimensions.width / 2
				};
				occ.occupiedRanges.push({
					start: extents.left,
					end: extents.right,
					width: extents.right - extents.left,
					top: occ.band.top,
					bottom: occ.band.bottom
				} as Range);
				occ.availableRanges = invertOccupiedRangesToAvailable(
					consolidateOverlappingRanges(occ.occupiedRanges),
					occ.band
				);
			}
			placed.push({
				id: obj.id,
				x: placement.x,
				y: placement.y,
				anchor: obj.anchor,
				bandIndex: placement.bandIdx,
				dimensions: obj.dimensions
			});
		}
		// Any objects not in placed are unplaced (ensure type UnplacedPlacementObject)
		const placedIds = new Set(placed.map(p => p.id));
		for (const obj of clusterObjects) {
			if (!placedIds.has(obj.id)) {
				unplaced.push({
					id: obj.id,
					anchor: obj.anchor,
					dimensions: obj.dimensions
				});
			}
		}
	} else {
		console.log(`[ComplexPlacement] Failed to solve ILP for ${clusterObjects.length} objects. Status: ${solution.status}`);
		// If not optimal, fall back to all unplaced (ensure type UnplacedPlacementObject)
		unplaced = clusterObjects.map(obj => ({
			id: obj.id,
			anchor: obj.anchor,
			dimensions: obj.dimensions
		}));
	}

	// Return placed and unplaced objects, and debug info
	return {
		placed,
		unplaced,
		debug: {
			feasiblePlacementsForDebugId: debugFeasiblePlacements,
			solutionStatus: solution.status,
			selectedVarKeys: solution.variables ? solution.variables.map(([k]) => k) : [],
		}
	};
}