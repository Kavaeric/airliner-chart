import Flatbush from 'flatbush';

/**
 * Clusters items based on spatial proximity using a Flatbush spatial index.
 *
 * This function is generic and can be used for any item type, as long as a bounding box accessor is provided.
 * It returns clusters of indices, where each cluster is a group of items whose bounding boxes are within a specified distance of each other.
 *
 * The clustering is performed using a breadth-first search (BFS) over the proximity graph defined by Flatbush rectangle intersection queries.
 *
 * @template T
 * @param {T[]} items - Array of items to cluster.
 * @param {(item: T) => [number, number, number, number]} getBBox - Function that returns the bounding box [minX, minY, maxX, maxY] for an item.
 * @param {number|{x: number, y: number}} [distance=20] - The proximity distance for clustering. If a number, applies to both axes; if an object, allows separate x/y distances.
 * @returns {number[][]} Array of clusters, each cluster is an array of indices from the input items array.
 *
 * @example
 * // Cluster points with a 10-pixel radius
 * const points = [ {x: 0, y: 0}, {x: 5, y: 5}, {x: 100, y: 100} ];
 * const clusters = detectClustersWithFlatbush(
 *   points,
 *   pt => [pt.x, pt.y, pt.x, pt.y],
 *   10
 * );
 * // clusters: [[0,1],[2]]
 *
 * @example
 * // Cluster rectangles with custom bounding boxes and separate x/y distances
 * const rects = [ {x: 0, y: 0, w: 10, h: 10}, {x: 8, y: 8, w: 10, h: 10} ];
 * const clusters = detectClustersWithFlatbush(
 *   rects,
 *   r => [r.x, r.y, r.x + r.w, r.y + r.h],
 *   { x: 5, y: 5 }
 * );
 * // clusters: [[0],[1]] (since their bounding boxes are not within 5 units)
 */
export function detectClustersWithFlatbush<T>(
	items: T[],
	getBBox: (item: T) => [number, number, number, number],
	distance: number | { x: number; y: number } = 20
): number[][] {
	// Early exit: no items means no clusters
	if (items.length === 0) return [];

	// Determine the proximity distance for x and y axes
	const distX = typeof distance === 'number' ? distance : distance.x;
	const distY = typeof distance === 'number' ? distance : distance.y;

	// Create a Flatbush spatial index for all item bounding boxes
	const index = new Flatbush(items.length);
	for (const item of items) {
		const [minX, minY, maxX, maxY] = getBBox(item);
		index.add(minX, minY, maxX, maxY);
	}
	index.finish();

	// Track which items have already been assigned to a cluster
	const visited = new Set<number>();
	const clusters: number[][] = [];

	// For each unvisited item, perform BFS to find all connected items (proximity graph)
	for (let i = 0; i < items.length; i++) {
		if (visited.has(i)) continue;
		const cluster: number[] = [];
		const queue = [i];
		visited.add(i);
		while (queue.length > 0) {
			const current = queue.pop()!;
			cluster.push(current);
			// Get the bounding box for the current item
			const [minX, minY, maxX, maxY] = getBBox(items[current]);
			// Query Flatbush for all items whose bounding boxes intersect the search rectangle
			const neighbours = index.search(
				minX - distX, minY - distY, maxX + distX, maxY + distY
			);
			// For each neighbour, if not already visited, add to cluster and queue
			for (const neighbour of neighbours) {
				if (!visited.has(neighbour)) {
					visited.add(neighbour);
					queue.push(neighbour);
				}
			}
		}
		// After BFS, add the completed cluster to the list
		clusters.push(cluster);
	}
	return clusters;
} 