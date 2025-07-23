"use client";

// [IMPORT] Context //
import { useChartScales } from "@/context/ChartScalesContext";

// [IMPORT] CSS styling //
import plotStyles from "./AirlinerScatterPlot.module.css";

// [IMPORT] Types //
import { AirlinerMarkers } from "@/lib/data/process-airliner-markers";

// [IMPORT] Utilities //
import { getValidAirlinerMarkers, getAirlinerMarkerExtents, getAirlinerMarkerY } from "@/lib/data/process-airliner-markers";

interface AirlinerScatterLineProps {
	airlinerMarkers: AirlinerMarkers;
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
	airlinerMarkers, 
	markerSize,
	markerLineMajorWidth,
	markerLineMinorWidth
}: AirlinerScatterLineProps) {

	// Get the y coordinate for line rendering
	const y = getAirlinerMarkerY(airlinerMarkers);

	// Get the extents of the class markers
	const classExtents = getAirlinerMarkerExtents(airlinerMarkers, 'class');

	// Get the extents of the limit markers
	const limitExtents = getAirlinerMarkerExtents(airlinerMarkers, 'limit');

	return (
		<g>
			{/* Line connecting largest class value to largest limit value */}
			{limitExtents.max && classExtents.max && (
				<line
					x1={limitExtents.max.x}
					x2={classExtents.max.x}
					y1={y}
					y2={y}
					className={plotStyles.pointMarkerConnectingLineMinor}
					strokeWidth={markerLineMinorWidth}
				/>
			)}

			{/* Line connecting min and max class values */}
			{classExtents.max && classExtents.min && (
				<line
					x1={classExtents.max.x}
					x2={classExtents.min.x}
					y1={y}
					y2={y}
					className={plotStyles.pointMarkerConnectingLineMajor}
					strokeWidth={markerLineMajorWidth}
				/>
			)}

			{/* Extra class value line for highlight */}
			{classExtents.max && classExtents.min && (
				<line
					x1={classExtents.max.x}
					x2={classExtents.min.x}
					y1={y}
					y2={y}
					className={plotStyles.pointMarkerConnectingLineMajorHighlight}
					strokeWidth={markerSize + 2}
				/>
			)}
		</g>
	);
} 