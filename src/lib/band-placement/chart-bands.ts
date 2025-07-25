/**
 * Chart band placement utilities for creating vertical space bands that avoid obstacles.
 * 
 * This module provides functions for calculating optimal placement bands for chart elements
 * like labels, ensuring they don't overlap with existing chart content (obstacles).
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
 * An obstacle represents an object that occupies space on the chart.
 * 
 * Obstacles are used to determine where bands cannot be placed, ensuring
 * chart elements don't overlap with existing content like markers or labels.
 */
export interface Obstacle {
	/** Position of the obstacle on the chart */
	position: { x: number; y: number };
	/** Height of the obstacle (vertical space it occupies) */
	height: number;
}

/**
 * Creates a single chart band from top and bottom coordinates.
 * 
 * This utility function calculates the height and centre point of a band
 * given its top and bottom boundaries.
 * 
 * @param top - The top Y-coordinate of the band
 * @param bottom - The bottom Y-coordinate of the band
 * @returns A PlacementBand object with calculated height and centre
 * 
 * @example
 * ```typescript
 * const band = createPlacementBand(10, 30);
 * // Result: { top: 10, bottom: 30, height: 20, centre: 20 }
 * ```
 */
function createPlacementBand(index: number, top: number, bottom: number, left: number = 0, right: number = 0): PlacementBand {
	const height = bottom - top;
	return {
		index,
		top,
		bottom,
		height,
		centre: top + height / 2, // Calculate centre point halfway between top and bottom
		left,
		right
	};
}

/**
 * Calculates vertical placement bands for chart elements based on obstacles.
 * 
 * This function creates bands of vertical space that can be used for placing
 * labels or other chart elements. It considers obstacles (like markers) and
 * creates bands that avoid overlapping with them.
 * 
 * The algorithm works in three main phases:
 * 1. **Initial band creation**: Creates bands between obstacles
 * 2. **Band splitting**: Splits bands that exceed maximum height using padding strategy
 * 3. **Band merging**: Merges bands that are below minimum height
 * 
 * @param dimensions - The width and height of the area to create bands for
 * @param minBandHeight - Minimum height for a band (bands below this will be merged)
 * @param maxBandHeight - Maximum height for a band (bands above this will be split)
 * @param obstacles - Array of obstacles with position and height
 * @param paddingBands - Number of minimum-height padding bands to create on each side when splitting (default: 2)
 * @param paddingBandHeight - Height for padding bands, defaults to minBandHeight and clamps to it if below (default: minBandHeight)
 * @returns Array of chart bands with top, bottom, height, and centre properties
 * 
 * @throws {Error} When input parameters are invalid (negative values, etc.)
 * 
 * @example
 * ```typescript
 * const bands = calculateChartPlacementBands(
 *   { width: 800, height: 600 },
 *   20,  // minBandHeight
 *   100, // maxBandHeight
 *   [{ position: { x: 100, y: 50 }, height: 10 }],
 *   2    // paddingBands
 * );
 * ```
 */
export function calculateChartPlacementBands(
	dimensions: { width: number; height: number },
	minBandHeight: number,
	maxBandHeight: number,
	obstacles: Obstacle[]
): PlacementBand[] {
	// ===== INPUT VALIDATION =====
	if (minBandHeight <= 0) {
		throw new Error('minBandHeight must be positive');
	}
	if (maxBandHeight <= 0) {
		throw new Error('maxBandHeight must be positive');
	}
	if (dimensions.height <= 0) {
		throw new Error('Chart height must be positive');
	}

	const effectiveMaxBandHeight = Math.max(minBandHeight, maxBandHeight);

	// ===== EARLY RETURN FOR EMPTY CASE =====
	if (obstacles.length === 0) {
		return [createPlacementBand(0, 0, dimensions.height, 0, dimensions.width)];
	}

	// ===== PHASE 1: INITIAL BAND CREATION =====
	const yPositions = obstacles.length > 1 
		? obstacles.map(o => o.position.y).sort((a, b) => a - b)
		: obstacles.map(o => o.position.y);

	const maxObstacleHeight = Math.max(...obstacles.map(o => o.height), minBandHeight);

	let bands: PlacementBand[] = [];
	let bandIndex = 0;
	let currentY = 0;
	let currentBand: PlacementBand | null = null;

	for (let i = 0; i < yPositions.length; i++) {
		const obstacleY = yPositions[i];
		const obstacleTop = obstacleY - maxObstacleHeight / 2;
		const obstacleBottom = obstacleY + maxObstacleHeight / 2;

		if (currentBand && obstacleTop <= currentBand.bottom) {
			currentBand.bottom = Math.max(currentBand.bottom, obstacleBottom);
			currentBand.height = currentBand.bottom - currentBand.top;
			currentBand.centre = currentBand.top + currentBand.height / 2;
		} else {
			if (currentBand) {
				bands.push(currentBand);
			}
			if (obstacleTop > currentY) {
				bands.push(createPlacementBand(bandIndex++, currentY, obstacleTop, 0, dimensions.width));
			}
			currentBand = createPlacementBand(bandIndex++, obstacleTop, obstacleBottom, 0, dimensions.width);
		}
		currentY = Math.max(currentY, obstacleBottom);
	}

	if (currentBand) {
		bands.push(currentBand);
	}
	if (currentY < dimensions.height) {
		bands.push(createPlacementBand(bandIndex++, currentY, dimensions.height, 0, dimensions.width));
	}

	// ===== PHASE 2: BAND SPLITTING (SIMPLE DIVISION) =====
	let splitBands: PlacementBand[] = [];
	for (let i = 0; i < bands.length; i++) {
		const band = bands[i];
		if (band.height > effectiveMaxBandHeight) {
			const numParts = Math.max(1, Math.floor(band.height / effectiveMaxBandHeight));
			splitBands.push(...divideBand(band, numParts));
		} else {
			splitBands.push(band);
		}
	}
	bands = splitBands;

	// ===== PHASE 3: BAND MERGING =====
	let i = 0;
	while (i < bands.length) {
		const currentBand = bands[i];
		if (currentBand.height < minBandHeight) {
			const hasPrevBand = i > 0;
			const hasNextBand = i < bands.length - 1;
			if (hasPrevBand && hasNextBand) {
				const prevBand = bands[i - 1];
				const nextBand = bands[i + 1];
				if (prevBand.height <= nextBand.height) {
					bands = mergeBandsByIndex(bands, i - 1, i);
				} else {
					bands = mergeBandsByIndex(bands, i, i + 1);
				}
			} else if (hasPrevBand) {
				bands = mergeBandsByIndex(bands, i - 1, i);
			} else if (hasNextBand) {
				bands = mergeBandsByIndex(bands, i, i + 1);
			} else {
				i++;
			}
		} else {
			i++;
		}
	}

	bands = bands
		.slice()
		.sort((a, b) => a.top - b.top)
		.map((band, idx) => ({ ...band, index: idx }));

	return bands;
}

/**
 * Replaces a range of bands in an array with new bands.
 * 
 * This function performs an immutable replacement operation, creating a new array
 * with the specified range replaced by the provided new bands.
 * 
 * @param bands - The original array of placement bands
 * @param startIndex - The starting index of the range to replace (inclusive)
 * @param endIndex - The ending index of the range to replace (inclusive)
 * @param newBands - The new bands to insert in place of the removed range
 * @returns A new array with the specified range replaced by newBands
 * 
 * @throws {Error} When indices are invalid (out of bounds, start > end)
 * 
 * @example
 * ```typescript
 * const bands = [band1, band2, band3, band4];
 * const newBands = [newBand1, newBand2];
 * const result = replaceBandsByIndex(bands, 1, 2, newBands);
 * // Result: [band1, newBand1, newBand2, band4]
 * ```
 */
export function replaceBandsByIndex(
	bands: PlacementBand[],
	startIndex: number,
	endIndex: number,
	newBands: PlacementBand[]
): PlacementBand[] {
	// Validate indices to prevent array access errors
	if (startIndex < 0 || endIndex >= bands.length || startIndex > endIndex) {
		throw new Error(`Invalid range: startIndex=${startIndex}, endIndex=${endIndex}, array length=${bands.length}`);
	}

	// Create a copy of the original array to maintain immutability
	const result = [...bands];
	
	// Remove the old range and insert the new bands using splice
	// splice(startIndex, deleteCount, ...itemsToInsert)
	result.splice(startIndex, endIndex - startIndex + 1, ...newBands);
	
	return result;
}

/**
 * Merges a range of bands into a single band.
 * 
 * This function combines multiple adjacent bands into one band that spans
 * from the first band's top to the last band's bottom.
 * 
 * @param bands - The original array of placement bands
 * @param startIndex - The starting index of the range to merge (inclusive)
 * @param endIndex - The ending index of the range to merge (inclusive)
 * @returns A new array with the specified range merged into a single band
 * 
 * @throws {Error} When indices are invalid (out of bounds, start > end)
 * 
 * @example
 * ```typescript
 * const bands = [band1, band2, band3, band4];
 * const result = mergeBandsByIndex(bands, 1, 2);
 * // Result: [band1, mergedBand, band4] where mergedBand spans band2 and band3
 * ```
 */
export function mergeBandsByIndex(
	bands: PlacementBand[],
	startIndex: number,
	endIndex: number
): PlacementBand[] {
	// Validate indices to prevent array access errors
	if (startIndex < 0 || endIndex >= bands.length || startIndex > endIndex) {
		throw new Error(`Invalid range: startIndex=${startIndex}, endIndex=${endIndex}, array length=${bands.length}`);
	}

	// If only one band in range, no merging needed - return copy of original array
	if (startIndex === endIndex) {
		return [...bands];
	}

	// Get the first and last bands in the range to determine merge boundaries
	const firstBand = bands[startIndex];
	const lastBand = bands[endIndex];
	
	// Create a merged band spanning from first band's top to last band's bottom
	const mergedBand = createPlacementBand(firstBand.index, firstBand.top, lastBand.bottom, firstBand.left, lastBand.right);
	
	// Replace the range with the single merged band
	return replaceBandsByIndex(bands, startIndex, endIndex, [mergedBand]);
}

/**
 * Divides a single band into equal-sized sub-bands.
 * 
 * This function splits a band into a specified number of equal-height sub-bands.
 * Useful for creating multiple placement options within a large available space.
 * 
 * @param band - The band to divide
 * @param numParts - The number of equal parts to divide the band into
 * @returns An array of sub-bands, each with equal height
 * 
 * @throws {Error} When numParts is not positive
 * 
 * @example
 * ```typescript
 * const band = { top: 0, bottom: 100, height: 100, centre: 50 };
 * const subBands = divideBand(band, 3);
 * // Result: 3 bands with heights of 33.33 each
 * ```
 */
export function divideBand(band: PlacementBand, numParts: number): PlacementBand[] {
	// Validate input to ensure logical division is possible
	if (numParts <= 0) {
		throw new Error(`Invalid number of parts: ${numParts}. Must be greater than 0.`);
	}
	
	// If only one part requested, return the original band unchanged
	if (numParts === 1) {
		return [band];
	}
	
	// Calculate the height of each sub-band
	const subBandHeight = band.height / numParts;
	
	// Create sub-bands by dividing the original band into equal parts
	const subBands: PlacementBand[] = [];
	for (let i = 0; i < numParts; i++) {
		const subBandTop = band.top + (i * subBandHeight);
		const subBandBottom = band.top + ((i + 1) * subBandHeight);
		subBands.push(createPlacementBand(band.index, subBandTop, subBandBottom, band.left, band.right));
	}
	
	return subBands;
}
