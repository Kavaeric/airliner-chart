// [IMPORT] Types/interfaces //
import { AirlinerData } from "./airliner-data-processor";

// [IMPORT] Context providers/hooks //
import { ScaleLinear } from "d3-scale";

export interface AirlinerMarkerCoordinates {
	y: number;
	xPax3Class: number | undefined;
	xPax2Class: number | undefined;
	xPax1Class: number | undefined;
	xPaxLimit: number | undefined;
	xPaxExit: number | undefined;
}

/**
 * Processes airliner data to calculate marker coordinates for rendering.
 * Converts data values to screen coordinates using the provided scales.
 */
export function processAirlinerMarkerCoordinates(
	processedD: AirlinerData,
	xScaleView: ScaleLinear<number, number>,
	yScaleView: ScaleLinear<number, number>
): AirlinerMarkerCoordinates {
	const y = yScaleView(processedD.rangeKM);
	const xPax3Class = processedD.pax3Class !== undefined ? xScaleView(processedD.pax3Class) : undefined;
	const xPax2Class = processedD.pax2Class !== undefined ? xScaleView(processedD.pax2Class) : undefined;
	const xPax1Class = processedD.pax1Class !== undefined ? xScaleView(processedD.pax1Class) : undefined;
	const xPaxLimit = processedD.paxLimit !== undefined ? xScaleView(processedD.paxLimit) : undefined;
	const xPaxExit = processedD.paxExit !== undefined ? xScaleView(processedD.paxExit) : undefined;

	return {
		y,
		xPax3Class,
		xPax2Class,
		xPax1Class,
		xPaxLimit,
		xPaxExit
	};
} 