import * as bitgrid from '@/retired/chart-placement/bitgrid';

/**
 * Represents a candidate position for placing an object
 */
export interface PlacementCandidate {
	/** Unique identifier for this candidate */
	id?: string;
	/** The bounding box of this candidate position */
	bounds: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	/** Priority/rank of this candidate (lower numbers = higher priority) */
	priority: number;
}

/**
 * Configuration for a candidate position relative to the anchor.
 */
export interface OffsetLocations {
	id?: string;
	dx: number; // x offset multiplier (e.g. 1 = right, -1 = left, 0 = centre)
	dy: number; // y offset multiplier (e.g. 1 = below, -1 = above, 0 = centre)
}

/**
 * Generates candidate positions for placing an object around a bounding box, using relative offsets.
 *
 * @param bounds - The bounding box of the object to place (x, y, width, height)
 * @param offsets - Array of {id, dx, dy} configs, in priority order
 * @param margin - Optional margin between anchor and object
 * @param offsetSize - Optional offset distance for candidate positions. If unspecified, the smaller dimension of the object is used.
 * @returns Array of candidate positions, ordered by input array
 */
export function generatePlacementCandidates(
	bounds: { x: number; y: number; width: number; height: number },
	offsets: OffsetLocations[],
	margin: number = 0,
	offsetSize?: number
): PlacementCandidate[] {
	const { x: anchorX, y: anchorY, width: objectWidth, height: objectHeight } = bounds;
	// The anchor is assumed to be the centre of the label/marker.
	// For each candidate, we want the label's bounding box to be positioned relative to the anchor's centre.
	// So, we subtract half the width/height to centre the box, then apply the dx/dy offset.
	return offsets.map((offset, i) => {
		const centreX = anchorX - objectWidth / 2;
		const centreY = anchorY - objectHeight / 2;

		// Step is the distance between candidates.
		// If offsetSize is not specified, use the smaller dimension of the object.
		const step = offsetSize !== undefined ? offsetSize : Math.min(objectWidth, objectHeight);

		// Calculate the offset distance for each axis
		const xOffset = offset.dx === 0
			? 0
			: Math.sign(offset.dx) * (margin + Math.abs(offset.dx) * step);
		const yOffset = offset.dy === 0
			? 0
			: Math.sign(offset.dy) * (margin + Math.abs(offset.dy) * step);

		const x = centreX + xOffset;
		const y = centreY + yOffset;
		return {
			bounds: {
				x,
				y,
				width: objectWidth,
				height: objectHeight
			},
			priority: i // Higher values are less preferred
		};
	});
}

/**
 * Places one or more objects in an occupancy grid, returning their chosen positions and the updated grid.
 * Accepts either a single object or an array of objects.
 * Uses a bitgrid.BitGrid to store the occupancy of the grid for fast lookup and efficient memory usage.
 *
 * @param objects - A single object or array of objects to place (each with a bounding box and anchor)
 * @param grid - The occupancy grid (bitgrid.BitGrid)
 * @param offsets - Array of candidate offsets (placement strategies)
 * @param margin - Optional margin between anchor and object
 * @returns An object with the array of successfully placed objects and the updated grid
 */
export function placeObjectsInOccupancyGrid(
	objects: { id: string; bounds: { x: number; y: number; width: number; height: number } } | Array<{ id: string; bounds: { x: number; y: number; width: number; height: number } }>,
	grid: bitgrid.BitGrid,
	offsets: OffsetLocations[],
	margin: number = 0,
	offsetSize?: number
) {
	const objArray = Array.isArray(objects) ? objects : [objects];
	const placed: any[] = [];
	
	// For each object, generate candidates, sort them by occupancy, and pick the best one
	for (const obj of objArray) {

		// Generate candidate positions for this object
		let candidates = generatePlacementCandidates(obj.bounds, offsets, margin, offsetSize)
			.map(candidate => {
				const gridCells = getGridCellsForBounds(candidate.bounds, grid);
				// Get the percentage of free cells in the candidate
				const occupancy = checkGridCellsOccupancy(grid, gridCells, true) / gridCells.length;
				return { ...candidate, occupancy };
			});

		// Scores candidates based on a few factors
		// The lower the score, the better the candidate
		function scoreCandidate(candidate: any) { // TODO: type this
			return candidate.occupancy * 100000 + candidate.priority * 1;
		}

		// Sort candidates by their occupancy score
		candidates = candidates.sort((a, b) => scoreCandidate(a) - scoreCandidate(b));

		// Pick the best candidate (lowest occupancy)
		// If all are partially blocked, use the least obstructed one
		const gridCells = getGridCellsForBounds(candidates[0].bounds, grid);
		grid = setGridCellOccupancy(grid, gridCells, true);

		// Place the object in the grid
		placed.push({
			id: obj.id,
			placement: candidates[0]
		});
	}
	return { placed, grid };
}

/**
 * Given a bounding box and a BitGrid, returns all grid cell coordinates ([x, y]) covered by the box.
 * Or, convert a bounding box to a grid cell coordinate array.
 * 
 * @param bounds - The bounding box to get the cells for
 * @param grid - The grid to get the cells from
 * @returns An array of grid cell coordinates ([x, y]) covered by the bounds
 */
export function getGridCellsForBounds(
	bounds: { x: number; y: number; width: number; height: number },
	grid: bitgrid.BitGrid
): Array<[number, number]> {
	// Initialize the cells array
	const cells: Array<[number, number]> = [];

	// Get the grid cell coordinates covered by the bounds
	const x0 = Math.floor(bounds.x / grid.cellWidth);
	const y0 = Math.floor(bounds.y / grid.cellHeight);
	const x1 = Math.ceil((bounds.x + bounds.width) / grid.cellWidth) - 1;
	const y1 = Math.ceil((bounds.y + bounds.height) / grid.cellHeight) - 1;

	// Iterate over the grid cells covered by the bounds and add them to the cells array
	// if they're within the grid bounds
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			if (x >= 0 && x < grid.width && y >= 0 && y < grid.height) {
				cells.push([x, y]);
			}
		}
	}
	return cells;
}

/**
 * Counts the number of grid cells that are either occupied or free, depending on the checkOccupied flag.
 *
 * @param grid - The grid to check the cells in
 * @param cells - The cells to check
 * @param checkOccupied - The occupancy to check for (true = occupied, false = free)
 * @returns The number of cells matching the checkOccupied flag
 */
export function checkGridCellsOccupancy(grid: bitgrid.BitGrid, cells: Array<[number, number]>, checkOccupied: boolean): number {
	let count = 0;
	for (const [x, y] of cells) {
		const occupied = bitgrid.getCell(grid, x, y);
		// If the occupancy matches the checkOccupied flag, increment the count
		if (checkOccupied ? occupied : !occupied) {
			count++;
		}
	}
	return count;
}

/**
 * Sets the occupancy of all given grid cells to either true or false.
 * 
 * @param grid - The grid to mark the cells in
 * @param cells - The cells to mark as occupied
 * @param value - The value to set the cells to (true = occupied, false = free)
 * @returns The grid with the cells marked as occupied or free
 */
export function setGridCellOccupancy(grid: bitgrid.BitGrid, cells: Array<[number, number]>, value: boolean): bitgrid.BitGrid {
	for (const [x, y] of cells) {
		bitgrid.setCell(grid, x, y, value);
	}
	return grid;
}

/**
 * Procedurally generates offset locations in concentric tiers around the centre.
 *
 * @param options.includeCentre - Whether to include the centre position (default: true)
 * @param options.tiers - Number of concentric tiers to generate (default: 1)
 * @returns Array of OffsetLocations with id, dx, dy
 */
export function generateStandardOffsetLocations({ includeCentre = true, tiers = 1 }: { includeCentre?: boolean, tiers?: number } = {}): OffsetLocations[] {
	let offsets: OffsetLocations[] = [];

	// Generate a square grid of offsets centred at (0,0), with size (2 * tiers + 1)
	// For tiers = 0: only (0,0). For tiers = 1: -1 to 1. For tiers = 2: -2 to 2, etc.
	for (let dy = -tiers; dy <= tiers; dy++) {
		for (let dx = -tiers; dx <= tiers; dx++) {
			offsets.push({dx, dy});
		}
	}

	// Remove the centre position (0,0) if requested
	if (!includeCentre) {
		offsets = offsets.filter(o => o.dx !== 0 || o.dy !== 0);
	}

	// console.log(`Generated ${offsets.length} offset locations:\n ${offsets.map(o => `${o.dx},${o.dy}`).join('\n')}`);

	return offsets;
}

/**
 * Calculates the euclidean distance between two offset locations.
 *
 * @param a - First offset location
 * @param b - Second offset location
 * @returns The euclidean distance between the two points
 */
export function getDistanceBetweenPoints(a: {x: number, y: number}, b: {x: number, y: number}): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Sorts an array of OffsetLocations by distance from an ideal position.
 * Closer positions are preferred, with the ideal position always first.
 *
 * @param offsets - Array of OffsetLocations to sort
 * @param ideal - The ideal offset to sort around (default: {dx: 0, dy: 0})
 * @param rightmost - Whether to sort by rightmost position first (default: true) to be implemented
 * @returns Sorted array of OffsetLocations
 */
/**
 * Sorts OffsetLocations by a scoring function: lower score is preferred.
 * Score is based on euclidean distance from ideal, with a tiebreaker for rightmost/leftmost.
 * The ideal position always receives the lowest possible score.
 *
 * @param offsets - Array of OffsetLocations to sort
 * @param ideal - The ideal offset to sort around (default: {dx: 0, dy: 0})
 * @param rightmost - Whether to prefer rightmost (true) or leftmost (false) as tiebreaker
 * @param topmost - Whether to prefer topmost (true) or bottommost (false) as tiebreaker
 * @returns Sorted array of OffsetLocations
 */
export function sortOffsetLocations(
	offsets: OffsetLocations[],
	ideal: OffsetLocations = { dx: 0, dy: 0 },
	rightmost: boolean = true,
	topmost: boolean = true
): OffsetLocations[] {

	// Assign a score to each offset: lower is better
	// Ideal position gets absolute lowest score
	function score(offset: OffsetLocations): number {

		// Calculate euclidean distance from ideal
		const idealDistance = getDistanceBetweenPoints(
			{ x: offset.dx, y: offset.dy },
			{ x: ideal.dx, y: ideal.dy }
		);

		// Calculate euclidean distance from the origin
		const originDistance = getDistanceBetweenPoints(
			{ x: offset.dx, y: offset.dy },
			{ x: 0, y: 0 }
		);
		
		// Use distance as primary factor
		// Use x-position as tiebreaker: rightmost gets lower score if rightmost=true
		const tiebreakerRightLeft = rightmost ? -offset.dx : offset.dx;
		// Use y-position as tiebreaker: topmost gets lower score if topmost=true
		const tiebreakerTopBottom = topmost ? -offset.dy : offset.dy;

		// Combine distance and tiebreakers
		return idealDistance * 100 + originDistance * 10 + tiebreakerRightLeft + tiebreakerTopBottom;
	}

	const sorted = offsets.slice().sort((a, b) => score(a) - score(b));

	console.log(
		`Sorted ${offsets.length} offset locations by score: [\n${sorted
			.map((o) => `[${o.dx},${o.dy}]`)
			.join(',\n')}]`
	);
	return sorted;
}
