import * as bitgrid from '@/retired/chart-placement/bitgrid';
import { placeObjectsInOccupancyGrid, OffsetLocations, getGridCellsForBounds, setGridCellOccupancy } from '@/retired/chart-placement/grid-placement';

/**
 * Represents an object with a bounding box to be placed on the chart.
 * Used as input for placement calculations.
 */
export interface PlaceableObject {
	id: string;
	bounds: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
}

/**
 * The result of a placement calculation.
 * Contains the final placements, the updated occupancy grid, and any objects that could not be placed.
 */
export interface PlacementResult {
	placements: Array<{ id: string; placement: any }>;
	grid: bitgrid.BitGrid;
	unplaced: PlaceableObject[];
}

/**
 * Pure function for placing labels using a pre-existing, possibly pre-marked, occupancy grid.
 *
 * This function does not use React hooks and is suitable for non-React contexts or advanced manual control.
 *
 * @param objects - Array of objects to place
 * @param grid - The occupancy grid (may already have cells marked as occupied)
 * @param candidateOffsets - Array of candidate placement strategies
 * @param margin - Optional margin between objects (default: 0)
 * @param offsetSize - Optional offset distance for candidate positions
 * @returns An object containing placements, the updated grid, and any unplaced objects
 */
export function placeLabelsWithOccupiedGrid(
	objects: PlaceableObject[],
	grid: bitgrid.BitGrid,
	candidateOffsets: OffsetLocations[],
	margin: number = 0,
	offsetSize?: number
) {
	// Run the placement algorithm using the provided grid and options.
	const { placed, grid: updatedGrid } = placeObjectsInOccupancyGrid(
		objects,
		grid,
		candidateOffsets,
		margin,
		offsetSize
	);

	// Identify any objects that could not be placed.
	const placedIds = new Set(placed.map(p => p.id));
	const unplaced = objects.filter(obj => !placedIds.has(obj.id));
	
	if (unplaced.length > 0) console.warn(`Unable to place ${unplaced.length} objects: ${unplaced.map(p => p.id).join(', ')}`);
	
	return {
		placements: placed,
		grid: updatedGrid,
		unplaced
	};
}

/**
 * Marks a set of bounding boxes as occupied in the provided grid.
 *
 * This is useful for reserving space for markers, lines, or other elements before running the main placement algorithm.
 * The grid is mutated in place for efficiency.
 *
 * @param grid - The occupancy grid to mark
 * @param boundingBoxes - Array of bounding boxes to mark as occupied (nulls are ignored)
 */
export function markOccupiedGrid(
	grid: bitgrid.BitGrid,
	boundingBoxes: Array<{ x: number; y: number; width: number; height: number } | null>
) {
	if (!boundingBoxes) return;
	for (const box of boundingBoxes) {
		if (!box) continue; // Skip null entries
		// Convert the bounding box to grid cell coordinates
		const cells = getGridCellsForBounds(box, grid);
		// Mark those cells as occupied
		setGridCellOccupancy(grid, cells, true);
	}
}