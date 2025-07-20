/**
 * A Uint8Array-based bit-packed grid structure for occupancy or general 2D bitwise use.
 */
export interface BitGrid {
	buffer: Uint8Array;
	width: number;
	height: number;
	cellWidth: number;
	cellHeight: number;
}

/**
 * Creates a bit-packed grid for a given bounding area and cell size.
 *
 * @param width - The width of the bounding area in pixels
 * @param height - The height of the bounding area in pixels
 * @param cellSize - The size of each grid cell. If a single number is provided, the grid will be square. If an array of two numbers is provided, the grid will be rectangular. Useful for if you want to have rectangular cells, or if you want to break the grid into larger cells.
 * @returns BitGrid structure
 */
export function createBitmapGrid(
	width: number,
	height: number,
	cellSize: number | [number, number]
): BitGrid {
	// If the width or height is 0, or they're not numbers, return an empty grid and warn the user
	if (width <= 0 || height <= 0 || typeof width !== 'number' || typeof height !== 'number') {
		console.warn(`createBitmapGrid: Invalid bounding area! Got ${width}x${height}. Returning an empty grid.`);
		return { buffer: new Uint8Array(0), width: 0, height: 0, cellWidth: 1, cellHeight: 1 };
	}

	// If the cell size is invalid, use 1 as the cell size and warn the user
	if (Array.isArray(cellSize)) {
		if (cellSize[0] <= 0 || cellSize[1] <= 0 || typeof cellSize[0] !== 'number' || typeof cellSize[1] !== 'number') {
			console.warn(`createBitmapGrid: Invalid cell size! Got ${cellSize}. Using 1 as the cell size. ${width}x${height}`);
			cellSize = [1, 1];
		}
	} else if (cellSize <= 0 || typeof cellSize !== 'number') {
		console.warn(`createBitmapGrid: Invalid cell size! Got ${cellSize}. Using 1 as the cell size. ${width}x${height}`);
		cellSize = 1;
	}

	// If a cell size dimension is larger than its bounding area dimension, use the bounding area dimension and warn the user
	if (Array.isArray(cellSize)) {
		if (cellSize[0] > width) {
			cellSize[0] = width;
			console.warn(`createBitmapGrid: Cell width is larger than the bounding area [${width}, ${height}]! Got ${cellSize}. Clamping cell size: ${cellSize[0]}, ${cellSize[1]}`);
		}
		if (cellSize[1] > height) {
			cellSize[1] = height;
			console.warn(`createBitmapGrid: Cell height is larger than the bounding area [${width}, ${height}]! Got ${cellSize}. Clamping cell size: ${cellSize[0]}, ${cellSize[1]}`);
		}
	} else if (cellSize > width || cellSize > height) {
		cellSize = Math.min(cellSize, width, height);
		console.warn(`createBitmapGrid: Cell size is larger than the bounding area [${width}, ${height}]! Got ${cellSize}. Clamping cell size: ${cellSize}`);
	}

	/* If the cell size does not divide into the bounding area height or width, warn the user
	if (Array.isArray(cellSize)) {
		if (width % cellSize[0] !== 0) {
			console.warn(`createBitmapGrid: Cell width is not a multiple of the bounding area width [${width}, ${height}]! This may cause unexpected results at the edges. Modulo: ${width % cellSize[0]}`);
		}
		if (height % cellSize[1] !== 0) {
			console.warn(`createBitmapGrid: Cell height is not a multiple of the bounding area height [${width}, ${height}]! This may cause unexpected results at the edges. Modulo: ${height % cellSize[1]}`);
		}
	} else {
		if (width % cellSize !== 0) {
			console.warn(`createBitmapGrid: Cell width is not a multiple of the bounding area width [${width}, ${height}]! This may cause unexpected results at the edges. Modulo: ${width % cellSize}`);
		}
		if (height % cellSize !== 0) {
			console.warn(`createBitmapGrid: Cell height is not a multiple of the bounding area height [${width}, ${height}]! This may cause unexpected results at the edges. Modulo: ${height % cellSize}`);
		}
	}*/

	// Calculate the grid width and height, and the number of cells in the grid
	const gridWidth = Math.ceil(width / (Array.isArray(cellSize) ? cellSize[0] : cellSize));
	const gridHeight = Math.ceil(height / (Array.isArray(cellSize) ? cellSize[1] : cellSize));

	// Calculate the number of bytes needed for the buffer
	const buffer = new Uint8Array(Math.ceil(gridWidth * gridHeight / 8));

	// Return the buffer, grid width, grid height, cell width, and cell height
	return {
		buffer,
		width: gridWidth,
		height: gridHeight,
		cellWidth: Array.isArray(cellSize) ? cellSize[0] : cellSize,
		cellHeight: Array.isArray(cellSize) ? cellSize[1] : cellSize
	};
}

/**
 * Gets the bit index for a cell in the grid.
 * Converts a 2D grid coordinate to a 1D bit index.
 *
 * @param x - The x coordinate of the cell
 * @param y - The y coordinate of the cell
 * @param grid - The grid to get the bit index for
 * @returns The bit index for the cell
 */
export function getBitIndex(x: number, y: number, grid: BitGrid): number {
	return y * grid.width + x;
}

/**
 * Gets the value of a cell in the bit-packed grid.
 * Converts a 2D grid coordinate to a 1D bit index, and checks if the bit is set.
 *
 * @param grid - The grid to check the cell in
 * @param x - The x coordinate of the cell
 * @param y - The y coordinate of the cell
 * @returns True if the cell is occupied, false otherwise
 */
export function getCell(grid: BitGrid, x: number, y: number): boolean {
	const idx = getBitIndex(x, y, grid);
	const byte = Math.floor(idx / 8);
	const bit = idx % 8;
	return (grid.buffer[byte] & (1 << bit)) !== 0;
}

/**
 * Sets a cell in the bit-packed grid to either on (true) or off (false).
 * Converts a 2D grid coordinate to a 1D bit index, and sets the bit to the value.
 *
 * @param grid - The grid to set/clear the cell in
 * @param x - The x coordinate of the cell
 * @param y - The y coordinate of the cell
 * @param value - True to set (occupy), false to clear (free)
 */
export function setCell(grid: BitGrid, x: number, y: number, value: boolean): void {
	const idx = getBitIndex(x, y, grid);
	const byte = Math.floor(idx / 8);
	const bit = idx % 8;
	if (value) {
		grid.buffer[byte] |= (1 << bit); // Set bit
	} else {
		grid.buffer[byte] &= ~(1 << bit); // Clear bit
	}
}

/**
 * Converts the bit-packed grid to a boolean 2D array (for debugging/visualisation).
 *
 * @param grid - The grid to convert to a boolean array
 * @returns A 2D boolean array
 */
export function toBooleanArray(grid: BitGrid): boolean[][] {
	const arr: boolean[][] = [];
	for (let y = 0; y < grid.height; y++) {
		const row: boolean[] = [];
		for (let x = 0; x < grid.width; x++) {
			row.push(getCell(grid, x, y));
		}
		arr.push(row);
	}
	return arr;
}