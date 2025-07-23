// [IMPORT] Types/interfaces //
import { AirlinerData } from "@/lib/data/airliner-data-processor";

// [IMPORT] Context providers/hooks //
import { ScaleLinear } from "d3-scale";

export interface AirlinerMarkers {
	id: string;
	
	// Marker coordinates
	pax3Class: { x: number; y: number } | null;
	pax2Class: { x: number; y: number } | null;
	pax1Class: { x: number; y: number } | null;
	paxLimit: { x: number; y: number } | null;
	paxExit: { x: number; y: number } | null;
}

/**
 * @function getAirlinerMarkers
 * Gets all screen-space coordinates for the markers of a single airliner.
 * 
 * @param processedData - Data for a single airliner.
 * @param xScaleView - The x-scale for the view.
 * @param yScaleView - The y-scale for the view.
 * 
 * @returns An object containing the airliner ID and the screen-space coordinates for the markers.
 * 
 * @example
 * const markers = getAirlinerMarkers(airlinerData, xScaleView, yScaleView);
 * 
 * // Get the airliner ID
 * console.log(markers.id);
 * 
 * // Get the x and y coordinates of the marker representing passenger capacity for a 3-class configuration
 * console.log(markers.pax3Class); // { x: 100, y: 200 }
 * 
 * // Get the x and y coordinates of the marker representing passenger capacity for a 2-class configuration
 * // In this example, the data didn't define a 2-class config capacity, so it returns null
 * console.log(markers.pax2Class); // null
 * 
 */
export function getAirlinerMarkers(
	index: number,
	airlinerData: AirlinerData,
	xScaleView: ScaleLinear<number, number>,
	yScaleView: ScaleLinear<number, number>
): AirlinerMarkers {

	// Get the airliner ID
	const id = `${index}-${airlinerData.nameICAO}`;
	// console.log(`getAirlinerMarkers: ${airlinerData.pax3Class}`);

	// Converts the passenger capacity and range values to screen-space coordinates
	function getMarkerXY(value: number, range: number) {
		return {
			x: xScaleView(value),
			y: yScaleView(range)
		}
	}

	// Get the x-coordinates for the markers
	// If the value is undefined, set the marker to null
	const pax3Class = airlinerData.pax3Class !== undefined ? getMarkerXY(airlinerData.pax3Class, airlinerData.rangeKM) : null;
	const pax2Class = airlinerData.pax2Class !== undefined ? getMarkerXY(airlinerData.pax2Class, airlinerData.rangeKM) : null;
	const pax1Class = airlinerData.pax1Class !== undefined ? getMarkerXY(airlinerData.pax1Class, airlinerData.rangeKM) : null;
	const paxLimit = airlinerData.paxLimit !== undefined ? getMarkerXY(airlinerData.paxLimit, airlinerData.rangeKM) : null;
	const paxExit = airlinerData.paxExit !== undefined ? getMarkerXY(airlinerData.paxExit, airlinerData.rangeKM) : null;

	const airlinerMarkers = {
		id,
		pax3Class,
		pax2Class,
		pax1Class,
		paxLimit,
		paxExit
	}

	return airlinerMarkers;
} 

/**
 * Returns an array of valid (non-null) marker coordinates from an AirlinerMarkers object.
 * @param markers - The AirlinerMarkers object.
 * @param filter - 'all' (default): all valid markers; 'class': only class markers; 'limit': only limit/exit markers.
 * @returns Array of { x, y } objects for each valid marker.
 */
export function getValidAirlinerMarkers(
	markers: AirlinerMarkers,
	filter: 'all' | 'class' | 'limit' = 'all'
): { x: number; y: number }[] {
	// Return only the class markers that are defined
	if (filter === 'class') {
		
		let validMarkers: { x: number; y: number }[] = [];
		if (validateMarker(markers.pax3Class)) validMarkers.push(markers.pax3Class);
		if (validateMarker(markers.pax2Class)) validMarkers.push(markers.pax2Class);
		if (validateMarker(markers.pax1Class)) validMarkers.push(markers.pax1Class);

		// console.log(`getValidAirlinerMarkers: ${filter} - ${validMarkers.length}`);
		return validMarkers;
		
		// Return only the limit/exit markers that are defined
	} else if (filter === 'limit') {
		return [
			markers.paxLimit,
			markers.paxExit
		].filter((coord): coord is { x: number; y: number } => coord !== undefined && coord !== null);
	}
	// Default: all markers that are defined
	return [
		markers.pax3Class,
		markers.pax2Class,
		markers.pax1Class,
		markers.paxLimit,
		markers.paxExit
	].filter((coord): coord is { x: number; y: number } => coord !== undefined && coord !== null);
} 

// Takes in a marker and returns true if it is valid (not null or undefined)
function validateMarker(marker: { x: number; y: number } | null): marker is { x: number; y: number } {
	// Check if the marker x is not null
	if (marker === null) {
		return false;
	}
	// Check if the marker y is not null
	if (marker.y === null) {
		return false;
	}
	// If both x and y are not null, return true
	//console.log(`validateMarker: Validated ${marker.x}, ${marker.y}`);
	return true;
}


/**
 * Returns the minimum and maximum coordinates from an AirlinerMarkers object, filtered by marker type.
 * @param markers - The AirlinerMarkers object.
 * @param filter - 'all' (default): all valid markers; 'class': only class markers; 'limit': only limit/exit markers.
 * @returns { min: { x, y }, max: { x, y } } or { min: null, max: null } if there are no valid markers in this selection
 */
export function getAirlinerMarkerExtents(
	markers: AirlinerMarkers,
	filter: 'all' | 'class' | 'limit' = 'all'
): { min: { x: number; y: number } | null, max: { x: number; y: number } | null } {
	// Get all valid markers based on the filter
	const coords = getValidAirlinerMarkers(markers, filter);

	// Find the marker with the minimum x (and y as tiebreaker)
	let min = coords[0];
	let max = coords[0];

	for (let i = 1; i < coords.length; i++) {
		const coord = coords[i];
		if (coord.x < min.x || (coord.x === min.x && coord.y < min.y)) {
			min = coord;
		}
		if (coord.x > max.x || (coord.x === max.x && coord.y > max.y)) {
			max = coord;
		}
	}

	// console.log(`getAirlinerMarkerExtents: ${coords}`);
	// console.log(`getAirlinerMarkerExtents: ${filter} - ${min.x}, ${max.x}`);

	return { min, max };
} 

/**
 * Returns the y coordinate for an airliner from its AirlinerMarkers object.
 * Assumes all markers share the same y value.
 * @param markers - AirlinerMarkers object.
 * @returns y coordinate (number) or null if no markers
*/
export function getAirlinerMarkerY(markers: AirlinerMarkers): number {
	
	const validMarkers = getValidAirlinerMarkers(markers);

	if (!validMarkers.length) {
		throw new Error('No valid markers available for this airliner; cannot determine y value.');
	}

	return validMarkers[0].y;
}
