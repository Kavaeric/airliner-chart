"use client";

// [IMPORT] CSS styling //
import plotStyles from "./AirlinerScatterPlot.module.css";

// [IMPORT] Types //
import type { AirlinerMarkerSeries } from "@/lib/data/airliner-types";

interface AirlinerScatterLineProps {
	airlinerID: string;
	airlinerMarkers: AirlinerMarkerSeries;
	plotFormat: any;
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
	airlinerID,
	airlinerMarkers, 
	plotFormat
}: AirlinerScatterLineProps) {

	// Get the y coordinate for line rendering
	const y = airlinerMarkers.lines.y;

	// Check if the major line is valid
	const majorLineValid = Math.abs(airlinerMarkers.lines.x2 - airlinerMarkers.lines.x1) > 0;

	// Check if the minor line is valid
	const minorLineValid = Math.abs(airlinerMarkers.lines.x3 - airlinerMarkers.lines.x2) > 0;

	return (
		<g>
			{/* Line connecting largest class value to largest limit value */}
			{minorLineValid && (
				<line
				x1={airlinerMarkers.lines.x3}
				x2={airlinerMarkers.lines.x2}
				y1={y}
				y2={y}
				className={plotStyles.pointMarkerConnectingLineMinor}
				strokeWidth={plotFormat.markerLineMinorWidth}
			/>
			)}

			{/* Line connecting min and max class values */}
			{majorLineValid && (
				<line
				x1={airlinerMarkers.lines.x2}
				x2={airlinerMarkers.lines.x1}
				y1={y}
				y2={y}
				className={plotStyles.pointMarkerConnectingLineMajor}
				strokeWidth={plotFormat.markerLineMajorWidth}
			/>
			)}
		</g>
	);
} 