import { PlacementBand } from "./chart-bands";
import { BandOccupancy, consolidateOverlappingRanges, Range, invertOccupiedRangesToAvailable } from './band-occupancy';
import { detectClustersWithFlatbush } from './detect-clusters-with-flatbush';

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
		xAlign: 'centre' | 'left-anchor' | 'right-anchor';
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
	objects: {
		id: string;
		anchor: { x: number; y: number };
		position: { x?: number; y?: number };
		dimensions: { width: number; height: number };
	}[];
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
 * @param ranges - BandOccupancy.availableRanges for the band.
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
 *   - `'left-anchor'`: Align the object's left edge with the anchor.
 *   - `'right-anchor'`: Align the object's right edge with the anchor.
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
 * @param ignoreBandExtents - Controls narrow range check at band edges: 'none', 'left', 'right', or 'both' (default 'both')
 * @returns BandPlacedObject if placement is successful, or null if not
 */
function trySinglePlacement(
	occupancy: BandOccupancy,
	band: PlacementBand,
	anchorWithOffset: { x: number; y: number },
	xAlign: 'centre' | 'left-anchor' | 'right-anchor',
	yAlign: 'none' | 'middle' | 'top' | 'bottom',
	strict: boolean = false,
	dimensions: { width: number; height: number },
	maxDistance: { x: number; y: number },
	id: string,
	ignoreBandExtents: 'none' | 'left' | 'right' | 'both' = 'both'
): BandPlacedObject | null {

	// --- Calculate anchor X based on alignment flag ---
	let anchorX = anchorWithOffset.x;
	if (xAlign === 'left-anchor') {
		anchorX = anchorWithOffset.x - dimensions.width / 2;
	} else if (xAlign === 'right-anchor') {
		anchorX = anchorWithOffset.x + dimensions.width / 2;
	}

	// --- Compute left and right extents of the object ---
	const extents = getObjectExtents(anchorX, dimensions.width);

	// --- Select the available range that contains the anchor X ---
	const range = selectRangeAtX(occupancy.availableRanges || [], anchorX);

	// --- If no valid range is found, abort placement ---
	if (!range) return null;

	// --- Handle edge cases for ranges narrower than the object ---
	if (range.width < dimensions.width) {
		const atBandStart = range.start === band.left;
		const atBandEnd = range.end === band.right;
		const allowLeft = ignoreBandExtents === 'left' || ignoreBandExtents === 'both';
		const allowRight = ignoreBandExtents === 'right' || ignoreBandExtents === 'both';
		if (atBandStart && allowLeft) {
			// Place anyway, align object's right side to the right side of the range
			const candidateX = range.end - dimensions.width / 2;
			// --- Calculate candidate Y position ---
			let candidateY;
			if (yAlign !== 'none') {
				candidateY = alignYPositionInBand(band, dimensions, yAlign);
			} else {
				candidateY = clampYPositionInBand(band, dimensions, anchorWithOffset.y);
			}
			// --- Check max distance constraints ---
			if (Math.abs(candidateX - anchorX) > maxDistance.x) return null;
			if (Math.abs(candidateY - anchorWithOffset.y) > maxDistance.y) return null;
			// --- Return placement object ---
			return {
				id,
				x: candidateX,
				y: candidateY,
				anchor: anchorWithOffset,
				bandIndex: band.index
			};
		} else if (atBandEnd && allowRight) {
			// Place anyway, align object's left side to the left side of the range
			const candidateX = range.start + dimensions.width / 2;
			// --- Calculate candidate Y position ---
			let candidateY;
			if (yAlign !== 'none') {
				candidateY = alignYPositionInBand(band, dimensions, yAlign);
			} else {
				candidateY = clampYPositionInBand(band, dimensions, anchorWithOffset.y);
			}
			// --- Check max distance constraints ---
			if (Math.abs(candidateX - anchorX) > maxDistance.x) return null;
			if (Math.abs(candidateY - anchorWithOffset.y) > maxDistance.y) return null;
			// --- Return placement object ---
			return {
				id,
				x: candidateX,
				y: candidateY,
				anchor: anchorWithOffset,
				bandIndex: band.index
			};
		} else {
			// --- Range is too narrow and not at band edge: abort placement ---
			//console.log(`trySinglePlacement: Range too narrow for ${id} at ${anchorWithOffset.x}, ${anchorWithOffset.y}.`);
			return null;
		}
	}

	// --- Check if the object can be centred in the range ---
	const canCentre = range.start <= extents.left && range.end >= extents.right;

	let candidateX;
	if (strict) {
		// --- Strict mode: only allow if object can be centred ---
		if (!canCentre) return null;
		candidateX = anchorX;
	} else {
		// --- Flexible mode: clamp to range if needed ---
		if (range.start > extents.left) {
			candidateX = range.start + dimensions.width / 2;
		} else if (range.end < extents.right) {
			candidateX = range.end - dimensions.width / 2;
		} else {
			candidateX = anchorX;
		}
	}

	// --- Calculate candidate Y position ---
	let candidateY;
	if (yAlign !== 'none') {
		candidateY = alignYPositionInBand(band, dimensions, yAlign);
	} else {
		candidateY = clampYPositionInBand(band, dimensions, anchorWithOffset.y);
	}

	// --- Check max distance constraints ---
	if (Math.abs(candidateX - anchorX) > maxDistance.x) return null;
	if (Math.abs(candidateY - anchorWithOffset.y) > maxDistance.y) return null;

	// --- Return placement object if all checks pass ---
	return {
		id,
		x: candidateX,
		y: candidateY,
		anchor: anchorWithOffset,
		bandIndex: band.index
	};
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
	placementObject: {
		id: string;
		anchor: { x: number; y: number };
		dimensions: { width: number; height: number };
	},
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
				if (band && occupancy) {
					const placement = trySinglePlacement(occupancy, band, anchorWithOffset, 'left-anchor', 'none', false, dimensions, maxDistance, placementObject.id);
					if (placement) return placement;
				}
				break;
			}
			case 'right': {
				if (band && occupancy) {
					const placement = trySinglePlacement(occupancy, band, anchorWithOffset, 'right-anchor', 'none', false, dimensions, maxDistance, placementObject.id);
					if (placement) return placement;
				}
				break;
			}
			case 'top': {
				const bandAbove = bandArr[homeBandIndex - 1];
				const occupancyAbove = occupancyArr[homeBandIndex - 1];
				if (bandAbove && occupancyAbove) {
					const placement = trySinglePlacement(occupancyAbove, bandAbove, anchorWithOffset, 'centre', 'bottom', false, dimensions, maxDistance, placementObject.id);
					if (placement) return placement;
				}
				break;
			}
			case 'bottom': {
				const bandBelow = bandArr[homeBandIndex + 1];
				const occupancyBelow = occupancyArr[homeBandIndex + 1];
				if (bandBelow && occupancyBelow) {
					const placement = trySinglePlacement(occupancyBelow, bandBelow, anchorWithOffset, 'centre', 'top', false, dimensions, maxDistance, placementObject.id);
					if (placement) return placement;
				}
				break;
			}
			case 'top-left': {
				const bandAbove = bandArr[homeBandIndex - 1];
				const occupancyAbove = occupancyArr[homeBandIndex - 1];
				if (bandAbove && occupancyAbove) {
					const placement = trySinglePlacement(occupancyAbove, bandAbove, anchorWithOffset, 'left-anchor', 'bottom', false, dimensions, maxDistance, placementObject.id);
					if (placement) return placement;
				}
				break;
			}
			case 'top-right': {
				const bandAbove = bandArr[homeBandIndex - 1];
				const occupancyAbove = occupancyArr[homeBandIndex - 1];
				if (bandAbove && occupancyAbove) {
					const placement = trySinglePlacement(occupancyAbove, bandAbove, anchorWithOffset, 'right-anchor', 'bottom', false, dimensions, maxDistance, placementObject.id);
					if (placement) return placement;
				}
				break;
			}
			case 'bottom-left': {
				const bandBelow = bandArr[homeBandIndex + 1];
				const occupancyBelow = occupancyArr[homeBandIndex + 1];
				if (bandBelow && occupancyBelow) {
					const placement = trySinglePlacement(occupancyBelow, bandBelow, anchorWithOffset, 'left-anchor', 'top', false, dimensions, maxDistance, placementObject.id);
					if (placement) return placement;
				}
				break;
			}
			case 'bottom-right': {
				const bandBelow = bandArr[homeBandIndex + 1];
				const occupancyBelow = occupancyArr[homeBandIndex + 1];
				if (bandBelow && occupancyBelow) {
					const placement = trySinglePlacement(occupancyBelow, bandBelow, anchorWithOffset, 'right-anchor', 'top', false, dimensions, maxDistance, placementObject.id);
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
	placementObject: {
		id: string;
		anchor: { x: number; y: number };
		dimensions: { width: number; height: number };
	},
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

			// console.log(`resolvePlacementSweep: Checking ${placementObject.id} at ${x}, ${y}.`);

			// If the y position is beyond the maximum distance from the anchor, skip
			if (Math.abs(y - placementObject.anchor.y) > maxDistance.y) continue;

			const placed = trySinglePlacement(occupancy, band, candidate, xAlign, yAlign, false, dimensions, maxDistance, placementObject.id);
			if (placed) {
				// console.log(`resolvePlacementSweep: Placed ${placementObject.id} at ${x}, ${y}.`);
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
	failed: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number } }>;
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

	// --- 1. Cluster/complex placement (scaffolded) ---
	// Process clusters through complex placement algorithm (stub)
	const clusteredIndices: number[] = [];
	const complexUnplaced: number[] = [];
	for (const cluster of objectClusters) {
		if (cluster.length > 1) {
			const { placed, unplaced } = resolvePlacementComplex(cluster, placementObjects);
			// TODO: Add placed objects to placements (when implemented)
			complexUnplaced.push(...unplaced.map(obj => placementObjects.findIndex(o => o.id === obj.id)));
			clusteredIndices.push(...cluster);
		}
	}

	// --- 2. Simple placement pass ---
	const unplacedIndices: number[] = [];
	const failedToPlace: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number } }> = [];

	// If no modes are provided, skip simple placement and send all objects to sweep
	if (!Array.isArray(strategy.firstPass.modes) || strategy.firstPass.modes.length === 0) {
		// Add all non-clustered and complex-unplaced objects to unplacedIndices
		objectClusters.flatMap(c => c).forEach(idx => {
			if (!clusteredIndices.includes(idx) || complexUnplaced.includes(idx)) {
				unplacedIndices.push(idx);
			}
		});
	} else {
		// Sort by axis/direction needed for firstPass
		const firstMode = strategy.firstPass.modes[0];
		if (firstMode === 'left' || firstMode === 'right') {
			objectClusters.flatMap(c => c).sort((a, b) => placementObjects[a].anchor.x - placementObjects[b].anchor.x);
		} else if (firstMode === 'top' || firstMode === 'bottom') {
			objectClusters.flatMap(c => c).sort((a, b) => placementObjects[a].anchor.y - placementObjects[b].anchor.y);
		} else {
			objectClusters.flatMap(c => c).sort((a, b) => placementObjects[a].anchor.x - placementObjects[b].anchor.x);
		}

		// Attempt to place each object using the simple placement strategy
		for (const idx of objectClusters.flatMap(c => c)) {
			// Only process non-clustered or complex-unplaced objects
			if (clusteredIndices.includes(idx) && !complexUnplaced.includes(idx)) continue;
			const obj = placementObjects[idx];
			const homeBandIndex = findHomeBandIndex(bandArr, obj.anchor.y);
			const maxDistance = getMaxDistance(strategy.firstPass.maxDistance);
			const placed = resolvePlacementSimple(obj, strategy, bandArr, occupancyArr, homeBandIndex, maxDistance);

			if (placed) {
				placements.set(obj.id, placed);

				// Update occupancy for the band
				const occ = occupancyArr[placed.bandIndex];
				if (occ) {
					const extents = getObjectExtents(placed.x, obj.dimensions.width);
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
			} else {
				unplacedIndices.push(idx);
				failedToPlace.push({ id: obj.id, anchor: obj.anchor, dimensions: obj.dimensions });
			}
		}
	}

	// --- 3. Sweep placement pass for unplaced objects ---

	// Sort unplaced objects for sweep direction
	if (strategy.sweep.horizontal === 'sweep-to-left') {
		unplacedIndices.sort((a, b) => placementObjects[a].anchor.x - placementObjects[b].anchor.x);
	} else {
		unplacedIndices.sort((a, b) => placementObjects[b].anchor.x - placementObjects[a].anchor.x);
	}

	// Sort by y position too
	unplacedIndices.sort((a, b) => placementObjects[a].anchor.y - placementObjects[b].anchor.y);

	// Debug: Collect xSteps for each object swept
	const sweepDebug: { [id: string]: any } = {};

	// Attempt to place each unplaced object using the sweep strategy
	for (const idx of unplacedIndices) {

		const obj = placementObjects[idx];
		const homeBandIndex = findHomeBandIndex(bandArr, obj.anchor.y);
		const maxDistance = getMaxDistance(strategy.sweep.maxDistance);

		const placed = resolvePlacementSweep(obj, strategy, bandArr, occupancyArr, homeBandIndex, maxDistance, sweepDebug);

		if (placed) {
			placements.set(obj.id, placed);

			// Update occupancy for the band
			const occ = occupancyArr[placed.bandIndex];
			if (occ) {
				const extents = getObjectExtents(placed.x, obj.dimensions.width);
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
		} else {
			failedToPlace.push({ id: obj.id, anchor: obj.anchor, dimensions: obj.dimensions });
			// console.log(`resolvePlacementSweep: Failed to place ${obj.id} at ${obj.anchor.x}, ${obj.anchor.y}.`);
		}
	}

	// --- Return placements, debug info, final occupancy, and failed placements ---
	return {
		placements,
		failed: failedToPlace,
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
	placementObjects: {
		id: string;
		anchor: { x: number; y: number };
		position: { x?: number; y?: number }; // Don't use this
		dimensions: { width: number; height: number };
	}[],
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

// Placeholder for future complex placement logic (for clusters)
/**
 * Attempts to place clustered objects using a complex placement algorithm.
 * For now, returns all objects as unplaced.
 *
 * @param clusterIndices - Array of indices for clustered objects
 * @param placementObjects - Array of all placement objects
 * @returns { placed: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number } }>, unplaced: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number } }> }
 */
function resolvePlacementComplex(
	clusterIndices: number[],
	placementObjects: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number } }>
): {
	placed: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number } }>;
	unplaced: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number } }>;
} {
	// TODO: Implement complex placement algorithm for clusters
	// For now, return all as unplaced
	return {
		placed: [],
		unplaced: clusterIndices.map(idx => placementObjects[idx])
	};
}