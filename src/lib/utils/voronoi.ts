import { voronoi } from '@visx/voronoi';
import { delaunay } from '@visx/delaunay';

// Types for our data points
interface DataPoint {
	x: number;
	y: number;
	id: string;
}

/**
 * A shape with a centroid.
 * 
 * @property {number[][]} polygon - Array of [x, y] coordinates
 * @property {number[][]} centroid - Centroid of the polygon
 * 
 * @example
 * const shape: ShapeWithCentroid = {
 *   polygon: [[0, 0], [1, 0], [1, 1], [0, 1]],
 *   centroid: { x: 0.5, y: 0.5 }
 * };
 */
interface ShapeWithCentroid {
	polygon: [number, number][];
	centroid: { x: number; y: number };
}

/**
 * Generic function to find the centroid of a polygon.
 * Takes in an array of [x, y] coordinates and returns the centroid.
 * 
 * - If the polygon is empty, returns { x: 0, y: 0 }.
 * - If there's only one point, it returns the point.
 * - If there's two points, it returns the midpoint.
 * - If there's three or more points, it returns the average of the points.
 * 
 * @param {number[][]} polygon - Array of [x, y] coordinates
 * @returns {number[][]} Centroid of the polygon
 */
export function getCentroid(polygon: [number, number][]): { x: number; y: number } {
	// If the polygon is empty, return { x: 0, y: 0 }.
	if (!polygon || polygon.length === 0) {
		// console.warn(`getCentroid: polygon is empty, returning { x: 0, y: 0 }.`);
		return { x: 0, y: 0 };
	}

	// If there's only one point, return the point.
	if (polygon.length === 1) {
		// console.warn(`getCentroid: polygon has only one point, returning the point.`, polygon);
		return { x: polygon[0][0], y: polygon[0][1] };
	}

	// If there's two or more points, get to work
	let centroidX = 0;
	let centroidY = 0;

	// Calculate the centroid of the polygon (average of all points)
	polygon.forEach(([x, y]) => {
		centroidX += x;
		centroidY += y;
	});

	// Divide by the number of points to get the average
	centroidX /= polygon.length;
	centroidY /= polygon.length;

	// Return the centroid
	return { x: centroidX, y: centroidY };
}

/**
 * Calculate Voronoi polygons and centroids
 * 
 * This is a stateless function that generates Voronoi polygons from points.
 * 
 * @param {DataPoint[]} points - Array of data points
 * @param {number} width - Width of the canvas
 * @param {number} height - Height of the canvas
 * @returns {ShapeWithCentroid[]} Array of polygons with centroids
 * 
 * @example
 * const voronoiPolygons = calculateVoronoi(points, width, height);
 * console.log(voronoiPolygons[0].centroid); // Print the centroid [x, y] of the first polygon
 */
export function calculateVoronoi(
	points: DataPoint[],
	width: number,
	height: number
): ShapeWithCentroid[] {
	// If there are no points, or the width or height is 0, return an empty array
	if (points.length === 0) {
		// console.warn(`calculateVoronoi: No points given, returning an empty array.`, {points, width, height});
		return [];
	}
	if (width === 0 || height === 0) {
		// console.warn(`calculateVoronoi: Canvas width or height is 0, returning an empty array.`, {points, width, height});
		return [];
	}

	// Generate the Voronoi diagram from the points and parameters
	const voronoiDiagram = voronoi<DataPoint>({
		x: (d: DataPoint) => d.x,
		y: (d: DataPoint) => d.y,
		width,
		height,
	});

	// Return the polygons as polygons with centroids
	return Array.from(voronoiDiagram.polygons(points)).map((polygon) => ({
		polygon: polygon as [number, number][],
		centroid: getCentroid(polygon as [number, number][]),
	}));
}

/**
 * Calculate Delaunay triangles and centroids
 * 
 * This is a stateless function that generates Delaunay triangles from points.
 * 
 * @param {DataPoint[]} points - Array of data points
 * @param {number} width - Width of the canvas
 * @param {number} height - Height of the canvas
 * @returns {ShapeWithCentroid[]} Array of triangles with centroids
 * 
 * @example
 * const delaunayTriangles = calculateDelaunay(points, width, height);
 * console.log(delaunayTriangles[0].polygon); // Prints a list of [x, y] coordinates for the first triangle's corners
 */
export function calculateDelaunay(
	points: DataPoint[],
	width: number,
	height: number
): ShapeWithCentroid[] {
	// If there are no points, or the width or height is 0, return an empty array
	if (points.length === 0) {
		// console.warn(`calculateDelaunay: No points given, returning an empty array.`, {points, width, height});
		return [];
	}
	if (width === 0 || height === 0) {
		// console.warn(`calculateDelaunay: Canvas width or height is 0, returning an empty array.`, {points, width, height});
		return [];
	}

	// Create a Delaunay diagram from the points
	const delaunayDiagram = delaunay<DataPoint>({
		data: points,
		x: (d: DataPoint) => d.x,
		y: (d: DataPoint) => d.y,
	});

	// Return the triangles as polygons with centroids
	return Array.from(delaunayDiagram.trianglePolygons()).map((triangle) => ({
		polygon: triangle as [number, number][],
		centroid: getCentroid(triangle as [number, number][]),
	}));
}

export type { DataPoint, ShapeWithCentroid };
