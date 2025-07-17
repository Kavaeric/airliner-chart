// [IMPORT] Types/interfaces //
import { AirlinerData } from "../types/airliner";

// [IMPORT] Context providers/hooks //
import { ScaleLinear } from "d3-scale";

export interface ProcessedAirlinerData extends AirlinerData {
	// Calculated coordinates
	markerYRangeKM: number;
	markerXPax3Class: number;
	markerXPax2Class: number;
	markerXPax1Class: number;
	markerXPaxLimit: number;
	markerXPaxExit: number;
	
	// Marker styles
	markerStylePax3Class: "diamond" | "line";
	markerStylePax2Class: "diamond" | "line";
	markerStylePax1Class: "diamond" | "line";
	markerStylePaxLimit: "diamond" | "line";
	markerStylePaxExit: "diamond" | "line";
	
	// Line coordinates
	markerLimitLineXCoordinates: {
		validLine: boolean;
		x1: number;
		x2: number;
	};
	markerClassLineXCoordinates: {
		validLine: boolean;
		x1: number;
		x2: number;
	};
}

/**
 * Processes raw airliner data for rendering, including:
 * - Data validation
 * - Capacity clamping
 * - Coordinate calculation
 * - Style assignment
 * - Line coordinate calculation
 */
export function processAirlinerData(
	d: AirlinerData, 
	xScaleView: ScaleLinear<number, number>, 
	yScaleView: ScaleLinear<number, number>
): ProcessedAirlinerData {
	// Create a processed airliner data dictionary
	let airlinerData: Record<string, any> = { ...d };

	// Check if we have a valid range to render
	// All airliners must have a listed range
	if (!airlinerData.rangeKM) {
		throw new Error(`Invalid range data for airliner: ${d.nameCommon}. Range must be defined.`);
	}

	// Check if we have at least one class capacity value
	const hasClassData = [airlinerData.pax1Class, airlinerData.pax2Class, airlinerData.pax3Class].some(v => v !== undefined);
	if (!hasClassData) {
		throw new Error(`Incomplete passenger capacity data for airliner: ${d.nameCommon}. At least one class capacity value must be defined.`);
	}

	// Clamp the three passenger capacity values to the paxLimit, if paxLimit is defined
	if (airlinerData.paxLimit) {
		airlinerData.pax3Class = Math.min(airlinerData.pax3Class, airlinerData.paxLimit);
		airlinerData.pax2Class = Math.min(airlinerData.pax2Class, airlinerData.paxLimit);
		airlinerData.pax1Class = Math.min(airlinerData.pax1Class, airlinerData.paxLimit);
	}
	
	// Clamp again but to the paxExit value, if paxExit is defined
	if (airlinerData.paxExit) {
		airlinerData.pax3Class = Math.min(airlinerData.pax3Class, airlinerData.paxExit);
		airlinerData.pax2Class = Math.min(airlinerData.pax2Class, airlinerData.paxExit);
		airlinerData.pax1Class = Math.min(airlinerData.pax1Class, airlinerData.paxExit);
	}

	// Add the y coordinate for the rated range
	airlinerData.markerYRangeKM = yScaleView(airlinerData.rangeKM);

	// Add the x coordinates for each passenger capacity value
	airlinerData.markerXPax3Class = xScaleView(airlinerData.pax3Class);
	airlinerData.markerXPax2Class = xScaleView(airlinerData.pax2Class);
	airlinerData.markerXPax1Class = xScaleView(airlinerData.pax1Class);
	airlinerData.markerXPaxLimit  = xScaleView(airlinerData.paxLimit);
	airlinerData.markerXPaxExit   = xScaleView(airlinerData.paxExit);

	// Define the marker styles for each passenger capacity value (solid, outline, line)
	airlinerData.markerStylePax3Class = "diamond";
	airlinerData.markerStylePax2Class = "diamond";
	airlinerData.markerStylePax1Class = "diamond";
	airlinerData.markerStylePaxLimit  = "line";
	airlinerData.markerStylePaxExit   = "line";

	// Helper function to get the min and max extents of the passenger capacity values
	function getPaxExtents(useClass: boolean = true, useLimit: boolean = true) {
		// Get the values for each passenger capacity value
		let values = [];

		// Add the class values if flagged
		if (useClass) {
			values.push(airlinerData.pax3Class, airlinerData.pax2Class, airlinerData.pax1Class);
		}
		
		// Add the limit and exit values if flagged
		if (useLimit) {
			values.push(airlinerData.paxLimit, airlinerData.paxExit);
		}

		// Filter out undefined, NaN, etc values
		values = values.filter(v => v !== undefined && !isNaN(v))

		// If there are no values, return undefined
		if (values.length === 0) {
			return {
				min: undefined,
				max: undefined
			};
		}

		return {
			min: Math.min(...values),
			max: Math.max(...values)
		};
	}

	// Calculate coordinates for line connecting the largest class value to the largest limit value
	// Contains a flag for if the line is valid (both values are defined and different)
	const classMax = getPaxExtents(true, false).max;
	const limitMax = getPaxExtents(false, true).max;
	airlinerData.markerLimitLineXCoordinates = {
		validLine: classMax !== undefined && limitMax !== undefined && classMax !== limitMax,
		x1: classMax !== undefined ? xScaleView(classMax) : 0,
		x2: limitMax !== undefined ? xScaleView(limitMax) : 0
	}

	// Ditto, class values
	const classMin = getPaxExtents(true, false).min;
	const classMaxForLine = getPaxExtents(true, false).max;
	airlinerData.markerClassLineXCoordinates = {
		validLine: classMin !== undefined && classMaxForLine !== undefined && classMin !== classMaxForLine,
		x1: classMin !== undefined ? xScaleView(classMin) : 0,
		x2: classMaxForLine !== undefined ? xScaleView(classMaxForLine) : 0
	}

	return airlinerData as ProcessedAirlinerData;
}

/**
 * Gets the label x-coordinate for an airliner based on the smallest available passenger capacity value
 */
export function getLabelXCoordinate(processedData: ProcessedAirlinerData, labelOffset: number = 12): number {
	return (
		(
			processedData.markerXPax3Class ??
			processedData.markerXPax2Class ??
			processedData.markerXPax1Class
		) - labelOffset
	);
}

/**
 * Gets all valid marker data for rendering, filtering out undefined values
 */
export function getValidMarkers(processedData: ProcessedAirlinerData) {
	return [
		{
			// paxExit: exit limit
			value: processedData.paxExit,
			x: processedData.markerXPaxExit,
			style: processedData.markerStylePaxExit,
		},
		{
			// paxLimit: rated limit
			value: processedData.paxLimit,
			x: processedData.markerXPaxLimit,
			style: processedData.markerStylePaxLimit,
		},
		{
			// pax1Class: one-class configuration
			value: processedData.pax1Class,
			x: processedData.markerXPax1Class,
			style: processedData.markerStylePax1Class,
		},
		{
			// pax2Class: two-class configuration
			value: processedData.pax2Class,
			x: processedData.markerXPax2Class,
			style: processedData.markerStylePax2Class,
		},
		{
			// pax3Class: three-class configuration
			value: processedData.pax3Class,
			x: processedData.markerXPax3Class,
			style: processedData.markerStylePax3Class,
		}
	].filter(marker => marker.value !== undefined);
} 