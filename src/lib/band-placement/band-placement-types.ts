/**
 * Type definitions for band placement functionality.
 * 
 * This module contains all the type definitions used throughout the band placement system,
 * providing a centralised location for type management and ensuring consistency across
 * the placement algorithms.
 */



/**
 * A single horizontal band of space on a chart that can be used for element placement.
 * 
 * Bands represent available vertical space between obstacles where chart elements
 * (like labels) can be safely positioned without overlapping existing content.
 */
export interface PlacementBand {
	/** Index of the band */
	index: number;
	/** Y-coordinate of the top edge of the band */
	top: number;
	/** Y-coordinate of the bottom edge of the band */
	bottom: number;
	/** Height of the band (bottom - top) */
	height: number;
	/** Y-coordinate of the centre point of the band */
	centre: number;
	/** X-coordinate of the left edge of the band (horizontal extent) */
	left: number;
	/** X-coordinate of the right edge of the band (horizontal extent) */
	right: number;
}

/**
 * Represents a horizontal range with start, end, and width properties.
 * Used for tracking occupied and available space within bands.
 * Includes top and bottom boundaries for efficient vertical range checks.
 */
export interface Range {
	/** Start position of the range */
	start: number;
	/** End position of the range */
	end: number;
	/** Width of the range (end - start) */
	width: number;
	/** Top boundary of the range */
	top: number;
	/** Bottom boundary of the range */
	bottom: number;
}

/**
 * Represents the occupancy state of a single chart band.
 * Contains both occupied and available ranges within the band.
 */
export interface BandOccupancy {
	/** Index of the band */
	bandIndex: number;
	/** The placement band */
	band: PlacementBand;
	/** Ranges occupied by obstacles within this band */
	occupiedRanges: Range[];
	/** Ranges available for label placement within this band */
	availableRanges: Range[];
}

/**
 * An obstacle represents an object that occupies space on the chart.
 * 
 * Obstacles are used to determine where bands cannot be placed, ensuring
 * chart elements don't overlap with existing content like markers or labels.
 */
export interface Obstacle {
	/** Minimum X coordinate of the obstacle */
	minX: number;
	/** Maximum X coordinate of the obstacle */
	maxX: number;
	/** Minimum Y coordinate of the obstacle */
	minY: number;
	/** Maximum Y coordinate of the obstacle */
	maxY: number;
}

/**
 * @type {Object} DebugPlacementLogEntry
 * Represents a debug placement log entry.
 *
 * @property {string} id - The id of the object being placed.
 * @property {number} pass - Placement pass. e.g. right now, resolvePlacementSimple would be 0, resolvePlacementSweep would be 1.
 * @property {string} algorithm - The algorithm that was used to place the object. e.g. resolvePlacementSimple, resolvePlacementSweep.
 * @property {iteration} number - The algorithm's iteration (each algorithm starts at 0 internally).
 * @property {any} placement - Arbitrary data about placement strategy.
 * @property {boolean} placed - Whether the object was placed.
 */
export type DebugPlacementLogEntry = {
	id: string;
	pass: number;
	algorithm: string;
	iteration: number;
	placement: any;
	isPlaced: boolean;
}

// --- Type for placement objects (enforced throughout placement flow) ---
export type PlacementObject = {
	id: string;
	anchor: { x: number; y: number };
	dimensions: { width: number; height: number };
	placedPosition: { x: number; y: number } | null;
	bandIndex?: number;
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