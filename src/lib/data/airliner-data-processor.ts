// [IMPORT] Types/interfaces //
import { AirlinerDataRaw } from "@/types/airliner";

export interface AirlinerData extends AirlinerDataRaw {
	markerStylePax3Class: "diamond" | "line";
	markerStylePax2Class: "diamond" | "line";
	markerStylePax1Class: "diamond" | "line";
	markerStylePaxLimit: "diamond" | "line";
	markerStylePaxExit: "diamond" | "line";
}

/**
 * Processes raw airliner data to filter out invalid data and assign marker styles.
 * 
 * @param d - Raw data for a single airliner.
 * @returns Processed airliner data.
 * 
 * @example
 * const processedData = processAirlinerData(rawData);
 */
export function processAirlinerData(d: AirlinerDataRaw): AirlinerData {
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
	// If the passenger capacity value is undefined, leave it as-is
	// Gotta be careful here because if either value is undefined, Math.min/max will return NaN
	if (airlinerData.paxLimit) {
		airlinerData.pax3Class = airlinerData.pax3Class ? Math.min(airlinerData.pax3Class, airlinerData.paxLimit) : airlinerData.pax3Class;
		airlinerData.pax2Class = airlinerData.pax2Class ? Math.min(airlinerData.pax2Class, airlinerData.paxLimit) : airlinerData.pax2Class;
		airlinerData.pax1Class = airlinerData.pax1Class ? Math.min(airlinerData.pax1Class, airlinerData.paxLimit) : airlinerData.pax1Class;
	}
	
	// Clamp again but to the paxExit value, if paxExit is defined
	// If the passenger capacity value is undefined, leave it as-is
	if (airlinerData.paxExit) {
		airlinerData.pax3Class = airlinerData.pax3Class ? Math.min(airlinerData.pax3Class, airlinerData.paxExit) : airlinerData.pax3Class;
		airlinerData.pax2Class = airlinerData.pax2Class ? Math.min(airlinerData.pax2Class, airlinerData.paxExit) : airlinerData.pax2Class;
		airlinerData.pax1Class = airlinerData.pax1Class ? Math.min(airlinerData.pax1Class, airlinerData.paxExit) : airlinerData.pax1Class;
	}

	// Define the marker styles for each passenger capacity value (solid, outline, line)
	airlinerData.markerStylePax3Class = "diamond";
	airlinerData.markerStylePax2Class = "diamond";
	airlinerData.markerStylePax1Class = "diamond";
	airlinerData.markerStylePaxLimit  = "line";
	airlinerData.markerStylePaxExit   = "line";

	return airlinerData as AirlinerData;
}