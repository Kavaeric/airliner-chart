"use client";

// [IMPORT] React //
import { useContext } from "react";

// [IMPORT] Internal types //
import { AirlinerData } from "@/lib/data/airliner-data-processor";
import { AirlinerMarkerCoordinates } from "@/lib/data/process-airliner-marker-coordinates";

// [IMPORT] Context //
import { useChartScales } from "@/context/ChartScalesContext";

// [IMPORT] CSS styling //
import plotStyles from "./AirlinerScatterPlot.module.css";


interface AirlinerScatterLineProps {
	airlinerData: AirlinerData;
	coords: AirlinerMarkerCoordinates;
	index: number;
	markerSize: number;
	markerLineMajorWidth: number;
	markerLineMinorWidth: number;
}

/**
 * AirlinerScatterLine Component
 *
 * Renders connecting lines between airliner markers:
 * - Line connecting largest class value to largest limit value
 * - Line connecting class values
 * - Highlight line for visual emphasis
 */
export default function AirlinerScatterLine({ 
	airlinerData, 
	coords, 
	index, 
	markerSize,
	markerLineMajorWidth,
	markerLineMinorWidth
}: AirlinerScatterLineProps) {

	const { xScaleView } = useChartScales();

	// The limit line is drawn between the larger of paxLimit and paxExit, and the largest of pax1Class, pax2Class, pax3Class
	// The class line is drawn between the largest and smallest of pax1Class, pax2Class, pax3Class

	// So we need three points: 
	// 1. The larger of paxLimit and paxExit
	// 2. The largest of pax1Class, pax2Class, pax3Class
	// 3. The smallest of pax1Class, pax2Class, pax3Class

	// And not of these values are defined

	let lineCoordinates: { x1: number | null, x2: number | null, x3: number | null } = {
		x1: null, // The larger of paxLimit and paxExit
		x2: null, // The largest of pax1Class, pax2Class, pax3Class
		x3: null // The smallest of pax1Class, pax2Class, pax3Class
	};
	
	// Find x1
	// Find the larger of paxLimit and paxExit. If neither are defined, set x1 to null
	if (airlinerData.paxLimit === undefined && airlinerData.paxExit === undefined) {
		lineCoordinates.x1 = null;
	} else {
		lineCoordinates.x1 = Math.max(airlinerData.paxLimit || 0, airlinerData.paxExit || 0);
	}

	// Find x2
	// Find the largest of pax1Class, pax2Class, pax3Class. If none are defined, set x2 to null
	if (airlinerData.pax1Class === undefined && airlinerData.pax2Class === undefined && airlinerData.pax3Class === undefined) {
		lineCoordinates.x2 = null;
	} else {
		lineCoordinates.x2 = Math.max(airlinerData.pax1Class || 0, airlinerData.pax2Class || 0, airlinerData.pax3Class || 0);
	}
	
	// Find x3
	// Find the smallest of pax1Class, pax2Class, pax3Class. If none are defined, set x3 to null
	if (airlinerData.pax1Class === undefined && airlinerData.pax2Class === undefined && airlinerData.pax3Class === undefined) {
		lineCoordinates.x3 = null;
	} else {
		lineCoordinates.x3 = Math.min(airlinerData.pax1Class || Infinity, airlinerData.pax2Class || Infinity, airlinerData.pax3Class || Infinity);
	}

	// Helper function to check if two numbers are defined and unequal
	// In the return statement, this is used to check if a line should be drawn
	// Avoids drawing lines between the same value
	const areDefinedAndUnequal = (x1: number | null, x2: number | null) => {
		if (x1 === null || x2 === null || x1 === x2) {
			return false;
		}
		return true;
	}

	return (
		<g key={`lines-${index}`}>
			{/* Draw a line connecting the largest class value to the largest limit value */}
			{areDefinedAndUnequal(lineCoordinates.x1, lineCoordinates.x2) && (
				<line
					x1={xScaleView(lineCoordinates.x1)}
					x2={xScaleView(lineCoordinates.x2)}
					y1={coords.y}
					y2={coords.y}
					className={plotStyles.pointMarkerConnectingLineMinor}
					strokeWidth={markerLineMinorWidth}
				/>
			)}

			{/* Draw a line connecting the class values */}
			{areDefinedAndUnequal(lineCoordinates.x2, lineCoordinates.x3) && (
				<line
					x1={xScaleView(lineCoordinates.x2)}
					x2={xScaleView(lineCoordinates.x3)}
					y1={coords.y}
					y2={coords.y}
					className={plotStyles.pointMarkerConnectingLineMajor}
					strokeWidth={markerLineMajorWidth}
				/>
			)}

			{/* Extra class value line for pizzaz */}
			{areDefinedAndUnequal(lineCoordinates.x2, lineCoordinates.x3) && (
				<line
					x1={xScaleView(lineCoordinates.x2)}
					x2={xScaleView(lineCoordinates.x3)}
					y1={coords.y}
					y2={coords.y}
					className={plotStyles.pointMarkerConnectingLineMajorHighlight}
					strokeWidth={markerSize + 2}
				/>
			)}
		</g>
	);
} 