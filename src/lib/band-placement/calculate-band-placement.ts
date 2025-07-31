import { consolidateOverlappingRanges, invertOccupiedRangesToAvailable } from './band-occupancy';
import { detectClustersWithFlatbush } from '../utils/detect-clusters-with-flatbush';
import { trySinglePlacement } from './try-single-placement';
import { 
	DebugPlacementLogEntry, 
	PlacementObject, 
	PlacementStrategy, 
	BandPlacementConfig,
	PlacementBand,
	BandOccupancy,
	Range
} from './band-placement-types';

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
 * Calculates the y position for an object within a band, aligned to the top, bottom, or middle.
 *
 * @param {PlacementBand} band - The band in which to align the object.
 * @param {{width: number, height: number}} dimensions - The dimensions of the object to be placed.
 * @param {'top' | 'bottom' | 'middle'} [align='top'] - The vertical alignment within the band.
 *   - 'top': Aligns the object so its top edge is flush with the band's top edge.
 *   - 'bottom': Aligns the object so its bottom edge is flush with the band's bottom edge.
 *   - 'middle': Centres the object vertically within the band.
 * @returns {number} The y coordinate for the object's centre, aligned as specified.
 */
function alignYPositionInBand(
	band: PlacementBand,
	dimensions: { width: number; height: number },
	align: 'top' | 'bottom' | 'middle' = 'top'
) {
	if (align === 'top') {
		return band.top + dimensions.height / 2;
	} else if (align === 'bottom') {
		return band.bottom - dimensions.height / 2;
	} else {
		return (band.top + band.bottom) / 2;
	}
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
 * @returns PlacementObject if placement is successful, or null if no valid position is found
 */
function resolvePlacementSimple(
	placementObject: PlacementObject,
	strategy: PlacementStrategy['firstPass'],
	bandArr: PlacementBand[],
	occupancyArr: BandOccupancy[],
	homeBandIndex: number,
	maxDistance: { x: number; y: number },
): { foundPlacement: PlacementObject | null, debugLog: DebugPlacementLogEntry[] } {
	const anchor = placementObject.anchor;
	const dimensions = placementObject.dimensions;
	const offset = strategy.offset;
	const anchorWithOffset = {
		x: anchor.x + (offset?.x ?? 0),
		y: anchor.y + (offset?.y ?? 0)
	};
	const band = bandArr[homeBandIndex];
	const occupancy = occupancyArr[homeBandIndex];

	let foundPlacement: PlacementObject | null = null;
	let debugLog: DebugPlacementLogEntry[] = [];
	let iteration = 0;

	// Try each strategy in order based on the given list of modes, return the first successful placement
	for (const mode of strategy.modes) {

		// If a placement has been found, break out of the loop
		if (foundPlacement) break;

		switch (mode) {
			case 'left': {
				if (band && occupancy && anchorWithOffset.x) {
					const placementIteration = trySinglePlacement(placementObject.id, occupancy, band, anchorWithOffset, 'left-to-anchor', false, dimensions, maxDistance);
					debugLog.push({
						id: placementObject.id,
						pass: 0,
						algorithm: 'resolvePlacementSimple',
						iteration: iteration,
						placement: mode,
						isPlaced: placementIteration ? true : false
					});
					iteration++;
					foundPlacement = placementIteration;
				}
				break;
			}
			case 'right': {
				if (band && occupancy && anchorWithOffset.x) {
					const placementIteration = trySinglePlacement(placementObject.id, occupancy, band, anchorWithOffset, 'right-to-anchor', false, dimensions, maxDistance);
					debugLog.push({
						id: placementObject.id,
						pass: 0,
						algorithm: 'resolvePlacementSimple',
						iteration: iteration,
						placement: mode,
						isPlaced: placementIteration ? true : false
					});
					iteration++;
					foundPlacement = placementIteration;
				}
				break;
			}
			case 'top': {
				const bandAbove = bandArr[homeBandIndex - 1];
				const occupancyAbove = occupancyArr[homeBandIndex - 1];
				if (bandAbove && occupancyAbove) {
					const placementIteration = trySinglePlacement(placementObject.id, occupancyAbove, bandAbove, anchorWithOffset, 'centre', false, dimensions, maxDistance);
					debugLog.push({
						id: placementObject.id,
						pass: 0,
						algorithm: 'resolvePlacementSimple',
						iteration: iteration,
						placement: mode,
						isPlaced: placementIteration ? true : false
					});
					iteration++;
					foundPlacement = placementIteration;
				}
				break;
			}
			case 'bottom': {
				const bandBelow = bandArr[homeBandIndex + 1];
				const occupancyBelow = occupancyArr[homeBandIndex + 1];
				if (bandBelow && occupancyBelow) {
					const placementIteration = trySinglePlacement(placementObject.id, occupancyBelow, bandBelow, anchorWithOffset, 'centre', false, dimensions, maxDistance);
					debugLog.push({
						id: placementObject.id,
						pass: 0,
						algorithm: 'resolvePlacementSimple',
						iteration: iteration,
						placement: mode,
						isPlaced: placementIteration ? true : false
					});
					iteration++;
					foundPlacement = placementIteration;
				}
				break;
			}
			case 'top-left': {
				const bandAbove = bandArr[homeBandIndex - 1];
				const occupancyAbove = occupancyArr[homeBandIndex - 1];
				if (bandAbove && occupancyAbove) {
					const placementIteration = trySinglePlacement(placementObject.id, occupancyAbove, bandAbove, anchorWithOffset, 'left-to-anchor', false, dimensions, maxDistance);
					debugLog.push({
						id: placementObject.id,
						pass: 0,
						algorithm: 'resolvePlacementSimple',
						iteration: iteration,
						placement: mode,
						isPlaced: placementIteration ? true : false
					});
					iteration++;
					foundPlacement = placementIteration;
				}
				break;
			}
			case 'top-right': {
				const bandAbove = bandArr[homeBandIndex - 1];
				const occupancyAbove = occupancyArr[homeBandIndex - 1];
				if (bandAbove && occupancyAbove) {
					const placementIteration = trySinglePlacement(placementObject.id, occupancyAbove, bandAbove, anchorWithOffset, 'right-to-anchor', false, dimensions, maxDistance);
					debugLog.push({
						id: placementObject.id,
						pass: 0,
						algorithm: 'resolvePlacementSimple',
						iteration: iteration,
						placement: mode,
						isPlaced: placementIteration ? true : false
					});
					iteration++;
					foundPlacement = placementIteration;
				}
				break;
			}
			case 'bottom-left': {
				const bandBelow = bandArr[homeBandIndex + 1];
				const occupancyBelow = occupancyArr[homeBandIndex + 1];
				if (bandBelow && occupancyBelow) {
					const placementIteration = trySinglePlacement(placementObject.id, occupancyBelow, bandBelow, anchorWithOffset, 'left-to-anchor', false, dimensions, maxDistance);
					debugLog.push({
						id: placementObject.id,
						pass: 0,
						algorithm: 'resolvePlacementSimple',
						iteration: iteration,
						placement: mode,
						isPlaced: placementIteration ? true : false
					});
					iteration++;
					foundPlacement = placementIteration;
				}
				break;
			}
			case 'bottom-right': {
				const bandBelow = bandArr[homeBandIndex + 1];
				const occupancyBelow = occupancyArr[homeBandIndex + 1];
				if (bandBelow && occupancyBelow) {
					const placementIteration = trySinglePlacement(placementObject.id, occupancyBelow, bandBelow, anchorWithOffset, 'right-to-anchor', false, dimensions, maxDistance);
					debugLog.push({
						id: placementObject.id,
						pass: 0,
						algorithm: 'resolvePlacementSimple',
						iteration: iteration,
						placement: mode,
						isPlaced: placementIteration ? true : false
					});
					iteration++;
					foundPlacement = placementIteration;
				}
				break;
			}
			default:
				break;
		}
	}

	return { foundPlacement: foundPlacement, debugLog: debugLog };
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
 * @returns PlacementObject if placement is successful, or null if no valid position is found
 */
function resolvePlacementSweep(
	placementObject: PlacementObject,
	strategy: PlacementStrategy['sweep'],
	bands: PlacementBand[],
	occupancyArr: BandOccupancy[],
	homeBandIndex: number,
	maxDistance: { x: number; y: number }
): { foundPlacement: PlacementObject | null, debugLog: DebugPlacementLogEntry[] } {

	let iteration = 0;
	let foundPlacement: PlacementObject | null = null;
	let debugLog: DebugPlacementLogEntry[] = [];

	const verticalSearch = strategy.verticalSearch;
	const bandIndicesToCheck = getBandSearchOrder(homeBandIndex, bands, verticalSearch);

	const anchorX = placementObject.anchor.x + (strategy.offset?.x ?? 0);
	const dimensions = placementObject.dimensions;

	// If the x anchor is less than 0 (past left edge of the chart), skip
	if (anchorX < 0 - dimensions.width) {
		debugLog.push({
			id: placementObject.id,
			pass: 1,
			algorithm: 'resolvePlacementSweep',
			iteration: iteration,
			placement: 'past_left_edge',
			isPlaced: false
		});
		return { foundPlacement: null, debugLog };
	}

	const stepSize = strategy.stepFactor * dimensions.width;
	const maxIterations = strategy.maxIterations;
	
	// Determine the number of steps for the sweep
	const maxSteps = maxIterations !== undefined ? maxIterations : 20;

	// Determine sweep direction: 'sweep-to-right' means positive X, 'sweep-to-left' means negative X
	const direction = strategy.horizontal === 'sweep-to-right' ? 1 : -1;
	const xAlign = strategy.xAlign;

	// Precompute candidate band/occupancy/y/yAlign for all bands to check
	const bandCandidates = precomputeBandCandidates(bandIndicesToCheck, bands, occupancyArr, homeBandIndex, dimensions);

	// Precompute all x-coordinates to be checked during the sweep
	const xSteps: number[] = [];
	for (let step = 0; step < maxSteps; step++) {
		const x = anchorX + step * stepSize * direction;
		xSteps.push(x);
	}

	// Sweep loop: iterate over precomputed x-coordinates
	for (const x of xSteps) {
		for (const { band, occupancy, y } of bandCandidates) {
			// Create a candidate object with the x and y position
			const candidate = { x, y };

			// If the y position is too far from the anchor, skip
			if (Math.abs(y - placementObject.anchor.y) > maxDistance.y) continue;

			// Try to place the object in the band
			const placementIteration = trySinglePlacement(placementObject.id, occupancy, band, candidate, xAlign, false, dimensions, maxDistance);
			const success = !!placementIteration;

			// Add a debug log entry
			debugLog.push({
				id: placementObject.id,
				pass: 1,
				algorithm: 'resolvePlacementSweep',
				iteration: iteration,
				placement: candidate,
				isPlaced: success
			});

			// Increment the iteration count
			iteration++;

			// If the object was placed, break out of the loop
			if (success) {
				foundPlacement = placementIteration;
				break;
			}
		}
	}

	return { foundPlacement: foundPlacement, debugLog: debugLog };
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
 *   `placements`: Map<string, PlacementObject> - Map of object IDs to their placed positions
 *   `debug`: any - Debug information (e.g., clusters, sweep xSteps)
 *   `occupancy`: BandOccupancy[] - Final occupancy state for all bands
 *   `failed`: Array<{ id: string, anchor: { x: number, y: number }, dimensions: { width: number, height: number } }> - List of objects that failed to place
 * }
 */
export function calculateBandPlacement(config: BandPlacementConfig): {
	placements: Map<string, PlacementObject>;
	failed: Map<string, PlacementObject>;
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
	const placements = new Map<string, PlacementObject>();

	// --- Prepare occupancy and band arrays for fast indexed access ---
	let currentOccupancy = chartPlacementBandsOccupancy.map(occ => ({
		bandIndex: occ.bandIndex,
		band: occ.band,
		occupiedRanges: occ.occupiedRanges.map((r: Range) => ({ ...r })),
		availableRanges: occ.availableRanges.map((r: Range) => ({ ...r })),
	}));

	let debugPlacementLogs: { [id: string]: DebugPlacementLogEntry[] } = {};

	// Use arrays for fast indexed access (preparing for batch/parallel processing)
	const bandArr = chartPlacementBands;
	let occupancyArr = currentOccupancy;

	// Pass count and indices to try
	let pass = 0;
	let indicesToTry: number[][] = [[]];

	// Pre-initialise the indices to try for this and the next pass
	indicesToTry[pass] = [];
	indicesToTry[pass + 1] = [];

	// --- 1. Cluster detection (for future complex placement) ---
	const clusteredIndices: number[] = [];
	const clusteredIds: string[] = [];
	for (const cluster of objectClusters) {
		// All clusters (regardless of size) are processed in simple/sweep passes
		clusteredIndices.push(...cluster);
		clusteredIds.push(...cluster.map(idx => placementObjects[idx].id));
	}

	// Set the indices to try for this pass
	indicesToTry[pass] = clusteredIndices;

	// If there are no candidate indices for this pass, return current placements and logs
	if (indicesToTry[pass].length === 0) {
		return {
			placements,
			failed: new Map(placementObjects.map(obj => [obj.id, obj])),
			debug: {
				clusters: clusteredIds,
				indicesToTry,
				debugPlacementLogs
			},
			occupancy: currentOccupancy,
		};
	}

	// Pre-sort the indices to try for this pass, to optimise placement order.
	// The sort order is determined by the first placement mode in the strategy.
	const firstMode = strategy.firstPass.modes?.[0];
	
	// Temporary: Sort by anchor y-coordinate first (top to bottom)
	indicesToTry[pass].sort((a, b) => placementObjects[a].anchor.y - placementObjects[b].anchor.y);


	// Iterate through all candidate indices for simple placement
	for (const idx of indicesToTry[pass]) {
		// Get the placement object for this index
		const obj = placementObjects[idx];

		// Find the most appropriate band for the object's anchor y-position
		const homeBandIndex = findHomeBandIndex(bandArr, obj.anchor.y);

		// Determine the maximum allowed distance for this placement attempt
		const maxDistance = getMaxDistance(strategy.firstPass.maxDistance);

		// Attempt to place the object using the simple placement strategy
		const { foundPlacement, debugLog } = resolvePlacementSimple(obj, strategy.firstPass, bandArr, occupancyArr, homeBandIndex, maxDistance);

		// After calling resolvePlacementSimple in the simple placement loop:
		if (debugLog) {
			debugPlacementLogs[obj.id] = debugLog;
		}

		// Only treat as placed if foundPlacement and foundPlacement.placedPosition are not null
		if (foundPlacement && foundPlacement.placedPosition) {
			// If successfully placed, record the placement
			placements.set(obj.id, foundPlacement);

			// Update occupancy for the band where the object was placed
			const occ = foundPlacement.bandIndex !== undefined ? occupancyArr[foundPlacement.bandIndex] : undefined;
			if (occ && foundPlacement.placedPosition) {
				// Calculate the object's horizontal extents
				const extents = getObjectExtents(foundPlacement.placedPosition.x, obj.dimensions.width);

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
			// If not placed, add to next pass
			indicesToTry[pass + 1].push(idx);
		}
	}

	// Increment pass count
	pass++;
	// Pre-initialise the indices to try for the next pass
	indicesToTry[pass + 1] = [];

	// If there are no candidate indices for this pass, return current placements and logs
	if (!indicesToTry[pass] || indicesToTry[pass].length === 0) {
		return {
			placements,
			failed: new Map(placementObjects.map(obj => [obj.id, obj])),
			debug: {
				clusters: clusteredIds,
				indicesToTry,
				debugPlacementLogs
			},
			occupancy: currentOccupancy,
		};
	}

	// --- 3. Sweep placement pass for unplaced objects ---
	// Sort sweepIndices by horizontal direction (left or right) as specified in strategy
	if (strategy.sweep.horizontal === 'sweep-to-left') {
		indicesToTry[pass].sort((a, b) => placementObjects[a].anchor.x - placementObjects[b].anchor.x);
	} else {
		indicesToTry[pass].sort((a, b) => placementObjects[b].anchor.x - placementObjects[a].anchor.x);
	}

	// Attempt to place each remaining unplaced object using the sweep strategy
	for (const idx of indicesToTry[pass]) {
		const obj = placementObjects[idx];

		// Find the object's home band index based on its anchor y-position
		const homeBandIndex = findHomeBandIndex(bandArr, obj.anchor.y);

		// Determine the maximum allowed distance for this sweep placement
		const maxDistance = getMaxDistance(strategy.sweep.maxDistance);

		// Attempt to place the object using the sweep placement strategy
		const { foundPlacement, debugLog } = resolvePlacementSweep(obj, strategy.sweep, bandArr, occupancyArr, homeBandIndex, maxDistance);

		// After calling resolvePlacementSweep in the sweep placement loop:
		if (debugLog) {
			debugPlacementLogs[obj.id] = debugLog;
		}

		// Only treat as placed if foundPlacement and foundPlacement.placedPosition are not null
		if (foundPlacement && foundPlacement.placedPosition) {
			// Record the successful placement
			placements.set(obj.id, foundPlacement);

			// Update occupancy for the band where the object was placed
			const occ = foundPlacement.bandIndex !== undefined ? occupancyArr[foundPlacement.bandIndex] : undefined;
			if (occ && foundPlacement.placedPosition) {
				// Calculate the object's horizontal extents
				const extents = getObjectExtents(foundPlacement.placedPosition.x, obj.dimensions.width);

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
			// If not placed, add to next pass
			indicesToTry[pass + 1].push(idx);
		}
	}

	// Increment pass count
	pass++;
	// Pre-initialise the indices to try for the next pass
	indicesToTry[pass + 1] = [];

	// --- Compile failed objects from remaining unplaced candidates ---
	// Use the remaining indices to try for this pass to compile the failed objects
	// Safety check: ensure indicesToTry[pass] exists before accessing it
	const currentPassIndices = indicesToTry[pass] || [];
	const failed: Map<string, PlacementObject> = new Map(currentPassIndices.map(idx => [placementObjects[idx].id, placementObjects[idx]]));

	// console.log("placements", placements);
	// console.log("failed", failed);
	// console.log("debugPlacementLogs", debugPlacementLogs);
	// console.log("indicesToTry", indicesToTry);

	// console.log(`calculateBandPlacement: After ${pass} passes with ${indicesToTry[0].length} objects, ${failed.size} failed, ${placements.size} placed.`);

	// Log placement debug info for label with id '16-A359'
	if (debugPlacementLogs['16-A359']) {
		console.log('[calculateBandPlacement] Placement logs for label 16-A359:', debugPlacementLogs['16-A359']);
	}

	return {
		placements,
		failed,
		debug: {
			clusters: clusteredIds,
			indicesToTry,
			debugPlacementLogs
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
