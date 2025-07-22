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
	obstacles: Obstacle[],
	paddingBands: number = 2,
	paddingBandHeight?: number
): PlacementBand[] {
	// ===== INPUT VALIDATION =====
	// Validate all input parameters to ensure they meet requirements
	if (minBandHeight <= 0) {
		throw new Error('minBandHeight must be positive');
	}
	if (maxBandHeight <= 0) {
		throw new Error('maxBandHeight must be positive');
	}
	if (dimensions.height <= 0) {
		throw new Error('Chart height must be positive');
	}
	if (paddingBands < 0) {
		throw new Error('paddingBands cannot be negative');
	}
	
	// Clamp maxBandHeight to minBandHeight if it's smaller to ensure logical consistency
	const effectiveMaxBandHeight = Math.max(minBandHeight, maxBandHeight);
	
	// Ensure paddingBandHeight is at least minBandHeight for consistent band sizing
	const effectivePaddingHeight = Math.max(minBandHeight, paddingBandHeight ?? minBandHeight);

	// ===== EARLY RETURN FOR EMPTY CASE =====
	// If no obstacles exist, create a single band spanning the entire chart height
	if (obstacles.length === 0) {
		return [createPlacementBand(0, 0, dimensions.height, 0, dimensions.width)];
	}

	// ===== PHASE 1: INITIAL BAND CREATION =====
	// Extract and sort obstacle Y positions for sequential processing
	// Optimise: only sort if more than one obstacle (single obstacle doesn't need sorting)
	const yPositions = obstacles.length > 1 
		? obstacles.map(o => o.position.y).sort((a, b) => a - b)
		: obstacles.map(o => o.position.y);
	// console.log(`calculateChartPlacementBands: yPositions: ${yPositions}`);

	// Calculate the maximum obstacle height to ensure bands are tall enough to avoid all obstacles
	// If the obstacle height is less than the minimum band height, use the minimum band height instead
	const maxObstacleHeight = Math.max(...obstacles.map(o => o.height), minBandHeight);

	// Pre-allocate bands array with estimated capacity for performance
	// Worst case: 2 bands per obstacle (space before + obstacle space) + 1 final band
	const estimatedBandCount = obstacles.length * 2 + 1;
	let bands: PlacementBand[] = new Array(estimatedBandCount);
	let bandIndex = 0;

	// Initialise tracking variables for band creation
	let currentY = 0; // Current Y position as we process obstacles
	let currentBand: PlacementBand | null = null; // Currently active band being extended

	// Process each obstacle position sequentially to create initial bands
	for (let i = 0; i < yPositions.length; i++) {
		const obstacleY = yPositions[i];
		// Calculate obstacle boundaries using maximum height to ensure sufficient clearance
		const obstacleTop = obstacleY - maxObstacleHeight / 2;
		const obstacleBottom = obstacleY + maxObstacleHeight / 2;

		// Check if this obstacle overlaps with the current band
		if (currentBand && obstacleTop <= currentBand.bottom) {
			// Extend the current band to include this overlapping obstacle
			currentBand.bottom = Math.max(currentBand.bottom, obstacleBottom);
			currentBand.height = currentBand.bottom - currentBand.top;
			currentBand.centre = currentBand.top + currentBand.height / 2;
		} else {
			// No overlap - finalize current band and create new ones
			
			// Add the completed current band to our array (if it exists)
			if (currentBand) {
				bands[bandIndex++] = currentBand;
			}

			// Create a band for the space between current position and this obstacle (if any)
			if (obstacleTop > currentY) {
				bands[bandIndex++] = createPlacementBand(bandIndex, currentY, obstacleTop, 0, dimensions.width);
			}

			// Start a new band for this obstacle
			currentBand = createPlacementBand(bandIndex, obstacleTop, obstacleBottom, 0, dimensions.width);
		}

		// Update current position to the bottom of the processed obstacle
		currentY = Math.max(currentY, obstacleBottom);
	}

	// Add the final band if it exists (for the last obstacle)
	if (currentBand) {
		bands[bandIndex++] = currentBand;
	}

	// Create a band for any remaining space at the bottom of the chart
	if (currentY < dimensions.height) {
		bands[bandIndex++] = createPlacementBand(bandIndex, currentY, dimensions.height, 0, dimensions.width);
	}

	// Trim the pre-allocated array to actual size for memory efficiency
	bands = bands.slice(0, bandIndex);

	// ===== PHASE 2: BAND SPLITTING =====
	// Split bands that exceed maximum height using padding strategy
	// Pre-allocate splitBands array with estimated capacity for performance
	// Worst case: each band splits into 3 parts (top padding + central + bottom padding)
	const estimatedSplitCount = bands.length * 3;
	const splitBands: PlacementBand[] = new Array(estimatedSplitCount);
	let splitIndex = 0;
	
	// Process each band to determine if splitting is needed
	for (let i = 0; i < bands.length; i++) {
		const band = bands[i];
		
		// Check if this band exceeds the maximum allowed height
		if (band.height > effectiveMaxBandHeight) {
			// Calculate total space needed for padding bands
			const totalPaddingHeight = paddingBands * 2 * effectivePaddingHeight;
			const remainingHeight = band.height - totalPaddingHeight;
			
			// Check if padding approach is viable (central band must be at least minBandHeight)
			if (remainingHeight >= minBandHeight) {
				// Use padding strategy: create minimum-height bands at top and bottom
				// with a central band filling the remaining space
				
				// Pre-allocate padding band arrays for performance
				const topPaddingBands: PlacementBand[] = new Array(paddingBands);
				const bottomPaddingBands: PlacementBand[] = new Array(paddingBands);
				
				// Create top padding bands (from top of original band)
				for (let j = 0; j < paddingBands; j++) {
					const topPaddingTop = band.top + (j * effectivePaddingHeight);
					const topPaddingBottom = band.top + ((j + 1) * effectivePaddingHeight);
					topPaddingBands[j] = createPlacementBand(band.index, topPaddingTop, topPaddingBottom, band.left, band.right);
				}
				
				// Create bottom padding bands (from bottom of original band)
				for (let j = 0; j < paddingBands; j++) {
					const bottomPaddingTop = band.bottom - ((j + 1) * effectivePaddingHeight);
					const bottomPaddingBottom = band.bottom - (j * effectivePaddingHeight);
					bottomPaddingBands[j] = createPlacementBand(band.index, bottomPaddingTop, bottomPaddingBottom, band.left, band.right);
				}
				
				// Create central band for the remaining space between padding bands
				const centralBandTop = band.top + (paddingBands * effectivePaddingHeight);
				const centralBandBottom = band.bottom - (paddingBands * effectivePaddingHeight);
				const centralBand = createPlacementBand(band.index, centralBandTop, centralBandBottom, band.left, band.right);
				
				// Combine all bands efficiently: central band first, then padding bands
				splitBands[splitIndex++] = centralBand;
				for (let j = 0; j < paddingBands; j++) {
					splitBands[splitIndex++] = topPaddingBands[j];
					splitBands[splitIndex++] = bottomPaddingBands[j];
				}
			} else {
				// Padding approach not viable - fallback to equal division
				// Calculate maximum possible bands that meet minimum height requirement
				const maxPossibleBands = Math.floor(band.height / effectivePaddingHeight);
				const numBands = Math.max(1, maxPossibleBands);
				const subBands = divideBand(band, numBands);
				
				// Copy sub-bands to splitBands array
				for (let j = 0; j < subBands.length; j++) {
					splitBands[splitIndex++] = subBands[j];
				}
			}
		} else {
			// Band is within acceptable size, keep as-is
			splitBands[splitIndex++] = band;
		}
	}
	
	// Trim splitBands array to actual size and replace original bands
	const finalSplitBands = splitBands.slice(0, splitIndex);
	bands = replaceBandsByIndex(bands, 0, bands.length - 1, finalSplitBands);

	// ===== PHASE 3: BAND MERGING =====
	// Merge bands that are below minimum height with their neighbours
	let i = 0;
	while (i < bands.length) {
		const currentBand = bands[i];
		
		// Check if current band is too small and needs merging
		if (currentBand.height < minBandHeight) {
			const hasPrevBand = i > 0;
			const hasNextBand = i < bands.length - 1;
			
			if (hasPrevBand && hasNextBand) {
				// Both neighbours exist - merge with the smaller one to minimise impact
				const prevBand = bands[i - 1];
				const nextBand = bands[i + 1];
				
				if (prevBand.height <= nextBand.height) {
					// Merge with previous band (smaller or equal)
					bands = mergeBandsByIndex(bands, i - 1, i);
					// Don't increment i - check the same position again after merge
				} else {
					// Merge with next band (smaller)
					bands = mergeBandsByIndex(bands, i, i + 1);
					// Don't increment i - check the same position again after merge
				}
			} else if (hasPrevBand) {
				// Only previous band exists - merge with it
				bands = mergeBandsByIndex(bands, i - 1, i);
				// Don't increment i - check the same position again after merge
			} else if (hasNextBand) {
				// Only next band exists - merge with it
				bands = mergeBandsByIndex(bands, i, i + 1);
				// Don't increment i - check the same position again after merge
			} else {
				// Single band - can't merge, move to next
				i++;
			}
		} else {
			// Band is tall enough - move to next
			i++;
		}
	}

	// Ensure unique, continuous, and correct indexing for all bands, based on vertical order
	bands = bands
		.slice() // copy to avoid mutating in place
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
