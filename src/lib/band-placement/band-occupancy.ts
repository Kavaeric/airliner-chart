/**
 * Band occupancy calculation utilities for determining occupied and available space within chart bands.
 * 
 * This module provides functions for calculating which areas within chart bands are occupied by obstacles
 * and which areas are available for label placement.
 */

import { PlacementBand } from './chart-bands';

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
 * Represents an obstacle with bounding box coordinates.
 * Used for calculating which areas are occupied within chart bands.
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
 * Determines if an obstacle intersects vertically with a placement band.
 * 
 * @param obstacle - The obstacle to check
 * @param band - The placement band to check against
 * @returns True if the obstacle intersects with the band vertically
 */
function intersectsVertically(obstacle: { minY: number; maxY: number }, band: PlacementBand): boolean {
	return obstacle.maxY > band.top && obstacle.minY < band.bottom;
}

/**
 * Consolidates overlapping and adjacent ranges within a single band using a sweep line algorithm.
 * 
 * This function merges ranges that overlap or are adjacent (touching) into single
 * consolidated ranges, reducing the number of ranges needed to represent the same space.
 * 
 * @param ranges - Array of ranges to consolidate
 * @returns Array of consolidated ranges with no overlaps or adjacencies
 * 
 * @example
 * ```typescript
 * const ranges = [
 *   { start: 100, end: 200, width: 100 },
 *   { start: 150, end: 250, width: 100 },  // Overlaps with first
 *   { start: 300, end: 400, width: 100 }
 * ];
 * const consolidated = consolidateOverlappingRanges(ranges);
 * // Result: [
 * //   { start: 100, end: 250, width: 150 },  // Merged first two
 * //   { start: 300, end: 400, width: 100 }
 * // ]
 * ```
 */
export function consolidateOverlappingRanges(ranges: Range[]): Range[] {
	if (ranges.length === 0) return [];
	
	// Sort by start position for sweep line processing
	const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
	
	const consolidatedRanges = [];
	let currentRange = { ...sortedRanges[0] };
	
	// Sweep through sorted ranges
	for (let i = 1; i < sortedRanges.length; i++) {
		const nextRange = sortedRanges[i];
		
		// Check if current range overlaps or is adjacent to next range
		// Adjacent: currentRange.end >= nextRange.start (allows touching ranges)
		if (currentRange.end >= nextRange.start) {
			// Merge ranges: extend current range to include next range
			currentRange.end = Math.max(currentRange.end, nextRange.end);
			currentRange.width = currentRange.end - currentRange.start;
		} else {
			// No overlap/adjacency: add current range to consolidated list and start new range
			consolidatedRanges.push(currentRange);
			currentRange = { ...nextRange };
		}
	}
	
	// Add the final range
	consolidatedRanges.push(currentRange);
	return consolidatedRanges;
}

/**
 * Inverts occupied ranges to available ranges for a given band and its horizontal extents.
 *
 * @param occupiedRanges - Array of occupied ranges (sorted by start)
 * @param band - The PlacementBand for horizontal boundaries
 * @returns Array of available ranges (start, end, width, top, bottom)
 */
export function invertOccupiedRangesToAvailable(
	occupiedRanges: Range[],
	band: import('./chart-bands').PlacementBand
): Range[] {
	const availableRanges: Range[] = [];
	const left = band.left;
	const right = band.right;
	const top = band.top;
	const bottom = band.bottom;

	if (occupiedRanges.length === 0) {
		availableRanges.push({ start: left, end: right, width: right - left, top, bottom });
		return availableRanges;
	}

	// Add available range before the first occupied range
	if (occupiedRanges[0].start > left) {
		availableRanges.push({ start: left, end: occupiedRanges[0].start, width: occupiedRanges[0].start - left, top, bottom });
	}

	// Add available ranges between occupied ranges
	for (let i = 0; i < occupiedRanges.length - 1; i++) {
		const currentOccupied = occupiedRanges[i];
		const nextOccupied = occupiedRanges[i + 1];
		if (nextOccupied.start > currentOccupied.end) {
			availableRanges.push({ start: currentOccupied.end, end: nextOccupied.start, width: nextOccupied.start - currentOccupied.end, top, bottom });
		}
	}

	// Add available range after the last occupied range
	const lastOccupied = occupiedRanges[occupiedRanges.length - 1];
	if (lastOccupied.end < right) {
		availableRanges.push({ start: lastOccupied.end, end: right, width: right - lastOccupied.end, top, bottom });
	}

	return availableRanges;
}

/**
 * Calculates band occupancy by determining which areas within chart bands are occupied by obstacles
 * and which areas are available for label placement.
 * 
 * This function implements a multi-phase algorithm:
 * 1. **Pre-sort obstacles** by centre Y position for efficient processing
 * 2. **Map obstacles to bands** using sweep line algorithm
 * 3. **Consolidate overlapping ranges** within each band
 * 4. **Calculate available ranges** by inverting occupied ranges
 * 
 * @param chartPlacementBands - Array of placement bands to analyze
 * @param obstacles - Array of obstacles with bounding box coordinates
 * @param chartWidth - Width of the chart area
 * @returns Array of band occupancy data with occupied and available ranges
 * 
 * @example
 * ```typescript
 * const occupancy = calculateBandOccupancy(bands, obstacles, 800);
 * // Result: Array of BandOccupancy objects with occupied and available ranges
 * ```
 */
export function calculateBandOccupancy(
	chartPlacementBands: PlacementBand[],
	obstacles: Obstacle[],
	chartWidth: number,
	chartHeight: number
): BandOccupancy[] {
	
	// Early exit for empty bands
	if (chartPlacementBands.length === 0) {
		console.warn("calculateBandOccupancy: No vertical space bands found.");
		return [];
	}
	
	// Early exit for empty obstacles - return all bands with full availability
	if (obstacles.length === 0) {
		return chartPlacementBands.map((band) => ({
			bandIndex: band.index,
			band: band,
			occupiedRanges: [],
			availableRanges: [{ start: 0, end: chartWidth, width: chartWidth, top: 0, bottom: chartHeight }]
		}));
	}

	let bandOccupancy: BandOccupancy[] = [];

	// Pre-calculate centre Y values and sort in-place to reduce memory allocations
	// Optimization: Pre-calculate centre Y to avoid repeated calculations
	const sortedObstacles = obstacles.map(obstacle => ({
		...obstacle,
		centreY: (obstacle.minY + obstacle.maxY) / 2
	})).sort((a, b) => a.centreY - b.centreY);
	
	// Map obstacles to intersecting bands using sweep line algorithm
	bandOccupancy = chartPlacementBands.map((band) => ({
		bandIndex: band.index,
		band: band,
		occupiedRanges: [] as Range[],
		availableRanges: [] as Range[]
	}));
	
	// Sweep line algorithm: process obstacles in Y-order and map to intersecting bands
	let obstacleIndex = 0;
	
	// Process each band in order (top to bottom)
	for (let bandIndex = 0; bandIndex < bandOccupancy.length; bandIndex++) {
		const currentBand = bandOccupancy[bandIndex];
		
		// Skip obstacles that are entirely below this band
		while (obstacleIndex < sortedObstacles.length && 
			   sortedObstacles[obstacleIndex].maxY < currentBand.band.top) {
			obstacleIndex++;
		}
		
		// Check remaining obstacles for intersection with current band
		for (let i = obstacleIndex; i < sortedObstacles.length; i++) {
			const obstacle = sortedObstacles[i];
			
			// Early exit: if obstacle is entirely below current band, 
			// it will be below all remaining bands too
			if (obstacle.minY > currentBand.band.bottom) {
				break;
			}
			
			// Optimized intersection detection using extracted function
			if (intersectsVertically(obstacle, currentBand.band)) {
				// Add the obstacle's horizontal range to this band
				currentBand.occupiedRanges.push({
					start: obstacle.minX,
					end: obstacle.maxX,
					width: obstacle.maxX - obstacle.minX,
					top: currentBand.band.top,
					bottom: currentBand.band.bottom
				});
			}
		}
	}
	
	// Consolidate overlapping ranges using sweep line algorithm
	// For each band, merge overlapping and adjacent ranges into consolidated ranges
	bandOccupancy.forEach((bandData) => {
		if (bandData.occupiedRanges.length === 0) {
			return; // No ranges to consolidate
		}
		
		// Sort ranges by start position for sweep line processing
		bandData.occupiedRanges.sort((a, b) => a.start - b.start);
		
		// Consolidate overlapping and adjacent ranges
		bandData.occupiedRanges = consolidateOverlappingRanges(bandData.occupiedRanges);
	});
	
	// For each band, calculate available space by inverting occupied ranges
	bandOccupancy.forEach((bandData) => {
		bandData.availableRanges = invertOccupiedRangesToAvailable(bandData.occupiedRanges, bandData.band);
	});
	
	return bandOccupancy;
} 