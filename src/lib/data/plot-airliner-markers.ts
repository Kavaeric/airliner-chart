// [IMPORT] Types/interfaces //
import type { AirlinerStats, AirlinerMarker, AirlinerMarkerSeries, AirlinerLine} from "@/lib/data/airliner-types";

/**
 * @function plotAirlinerMarkerSeries
 * @description Converts AirlinerStats data into screen-space AirlinerMarker objects.
 * 
 * @param {AirlinerStats} airlinerStats - The airliner's stats.
 * @param {any} xScaleView - The x-scale for the view.
 * @param {any} yScaleView - The y-scale for the view.
 * @param {number} markerSize - The size of the marker.
 * 
 * @returns {AirlinerMarkerSeries} An object containing the airliner ID and the screen-space coordinates for the markers.
 * 
 */
export function plotAirlinerMarkerSeries(
	airlinerID: string,
	airlinerStats: AirlinerStats,
	xScaleView: any,
	yScaleView: any,
	markerSize: number = 12
): AirlinerMarkerSeries {

	let markers: AirlinerMarker[] = [];

	// Get the x-coordinates for the markers
	// If the value is undefined, set the marker to null
	if (airlinerStats.pax3Class) {
		markers.push({
			markerClass: "pax3Class",
			markerCoordinates: plotAirlinerMarkerXY(airlinerStats.pax3Class, airlinerStats.rangeKM, xScaleView, yScaleView)
		});
	}
	if (airlinerStats.pax2Class) {
		markers.push({
			markerClass: "pax2Class",
			markerCoordinates: plotAirlinerMarkerXY(airlinerStats.pax2Class, airlinerStats.rangeKM, xScaleView, yScaleView)
		});
	}
	if (airlinerStats.pax1Class) {	
		markers.push({
			markerClass: "pax1Class",
			markerCoordinates: plotAirlinerMarkerXY(airlinerStats.pax1Class, airlinerStats.rangeKM, xScaleView, yScaleView)
		});
	}

	// Map the markers to their x coordinates
	let xCoordinates = markers.map(marker => marker.markerCoordinates.x);

	// Get the y coordinate, which is the same for all markers
	const yCoordinate = markers.find(marker => marker)?.markerCoordinates.y ?? 0;

	// Get the largest x coordinate of the class markers
	const classXMax = Math.max(...xCoordinates);

	// Get the smallest x coordinate of the class markers
	const classXMin = Math.min(...xCoordinates);

	// Add the limit and exit markers
	if (airlinerStats.paxLimit) {

		// Get the theoretical limit marker
		const limitMarker = plotAirlinerMarkerXY(airlinerStats.paxLimit, airlinerStats.rangeKM, xScaleView, yScaleView);

		// Skip if the theoretical limit is under the largest class marker
		if (limitMarker.x < classXMax) {
			// console.warn(`[plotAirlinerMarkerSeries] Limit marker is under the largest class marker for airliner ${airlinerID}`);
		} else {
			markers.push({
				markerClass: "paxLimit",
				markerCoordinates: limitMarker
			});
		}
	}
	if (airlinerStats.paxExit) {

		// Get the exit marker
		const exitMarker = plotAirlinerMarkerXY(airlinerStats.paxExit, airlinerStats.rangeKM, xScaleView, yScaleView);

		// Skip if the exit limit is under the largest class marker
		if (exitMarker.x < classXMax) {
			// console.warn(`[plotAirlinerMarkerSeries] Exit marker is under the largest class marker for airliner ${airlinerID}`);
		} else {
			markers.push({
				markerClass: "paxExit",
				markerCoordinates: exitMarker
			});
		}
	}

	// Remap the markers to their x coordinates
	xCoordinates = markers.map(marker => marker.markerCoordinates.x);

	// Calculate the bounding box for the marker series
	// Minimum x-coordinate: smallest x-coordinate of class markers
	const BBoxXMin = classXMin - markerSize / 2;
	// Maximum x-coordinate: largest x-coordinate of class markers
	const BBoxXMax = classXMax + markerSize / 2;
	// Minimum y-coordinate: y coordinate of the markers minus half the marker size
	const BBoxYMin = yCoordinate - markerSize / 2;
	// Maximum y-coordinate: y coordinate of the markers plus half the marker size
	const BBoxYMax = yCoordinate + markerSize / 2;

	// Get the largest x coordinate of the markers
	const xMax = Math.max(...xCoordinates);

	// Get line data
	const lines: AirlinerLine = {
		// x1: smallest available pax class marker
		x1: classXMin,

		// x2: largest available pax class marker
		x2: classXMax,

		// x3: largest available marker x coordinate
		x3: xMax,

		// y: any marker's y coordinate
		y: yCoordinate,
	}
	
	const result: AirlinerMarkerSeries = {
		markers,
		lines,
		seriesBBox: {
			x: [BBoxXMin, BBoxXMax],
			y: [BBoxYMin, BBoxYMax]
		}
	}

	return result;
}

/**
 * @function plotLabelAnchor
 * @description Calculates the anchor point for a label based on the passenger class markers.
 * Anchor slides from leftmost marker -> clamped at 0 (left chart edge) -> follows rightmost off-screen
 * 
 * @param {string} airlinerID - The airliner's ID.
 * @param {AirlinerMarkerSeries} markerSeries - The airliner's marker series.
 * @returns {AirlinerMarker} The anchor point for the label.
 */
export function plotLabelAnchor(airlinerID: string, markerSeries: AirlinerMarkerSeries): { x: number; y: number } {

	// Get list of passenger class markers
	const paxClassMarkers = markerSeries.markers.filter(marker =>
		marker.markerClass === "pax3Class" ||
		marker.markerClass === "pax2Class" ||
		marker.markerClass === "pax1Class"
	);

	// Get the leftmost passenger class marker coordinate
	const leftmostMarker = paxClassMarkers.reduce((min, marker) => marker.markerCoordinates.x < min.markerCoordinates.x ? marker : min).markerCoordinates.x;

	// Get the rightmost passenger class marker coordinate
	const rightmostMarker = paxClassMarkers.reduce((max, marker) => marker.markerCoordinates.x > max.markerCoordinates.x ? marker : max).markerCoordinates.x;

	// Label anchor slides along the marker series to stay visible:
	// 1. Prefer leftmost marker position (default case)
	// 2. When series scrolls left, clamp anchor to left edge (0) 
	// 3. When rightmost marker also scrolls off-screen, stop clamping and follow series
	// Formula: clamp leftmost to chart bounds, but never exceed rightmost marker
	const anchorX = Math.min(Math.max(0, leftmostMarker), rightmostMarker);

	// Get the y-coordinate for the anchor
	// Each airliner entry has the same range, so we can just use whatever y coordinate is available (and a number)
	const anchorY = markerSeries.markers.find(marker => marker)?.markerCoordinates.y ?? 0;

	if (anchorY === 0) {
		console.warn(`[getLabelAnchor] No anchor y coordinate found for airliner ${airlinerID}`);
	}

	return {
		x: anchorX,
		y: anchorY
	}
}

/**
 * @function plotAirlinerMarkerXY
 * @description Converts a passenger capacity and range values to screen-space coordinates
 * 
 * @param {number} value - The value to convert.
 * @param {number} range - The range to convert.
 * @param {any} xScaleView - The x-scale for the view.
 * @param {any} yScaleView - The y-scale for the view.
 * @returns {AirlinerMarker} The converted marker.
 */
function plotAirlinerMarkerXY(value: number, range: number, xScaleView: any, yScaleView: any) {
	return {
		x: xScaleView(value),
		y: yScaleView(range)
	}
}