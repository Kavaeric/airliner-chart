// [IMPORT] Third-party libraries //
import { MarkerDiamond } from "@/component/shape/MarkerDiamond";

// [IMPORT] CSS styling //
import markerStyles from "./AirlinerScatterMarker.module.css";

// [IMPORT] Types //
import { AirlinerMarkers } from "@/lib/data/process-airliner-markers";

// [IMPORT] Utilities //
import { getValidAirlinerMarkers } from "@/lib/data/process-airliner-markers";

interface AirlinerScatterMarkerProps {
	airlinerMarkers: AirlinerMarkers;
	markerSize: number;
}

/**
 * AirlinerScatterMarker Component
 *
 * Renders all markers for a single airliner at their calculated positions.
 * Handles different marker styles (diamond/line) and filters out invalid coordinates.
 */
export default function AirlinerScatterMarker({ 
	airlinerMarkers,
	markerSize 
}: AirlinerScatterMarkerProps) {
	// Get valid class markers (diamonds)
	const classMarkers = getValidAirlinerMarkers(airlinerMarkers, 'class');
	// Get valid limit/exit markers (lines)
	const limitMarkers = getValidAirlinerMarkers(airlinerMarkers, 'limit');

	return (
		<g>
			{/* Exit/theoretical limit markers: vertical line */}
			{limitMarkers.map((coord, i) => (
				<line
					key={`line-${i}`}
					x1={coord.x}
					y1={coord.y - markerSize / 2}
					x2={coord.x}
					y2={coord.y + markerSize / 2}
					className={markerStyles.markerLine}
				/>
			))}

			{/* Passenger count markers: diamond */}
			{classMarkers.map((coord, i) => (
				<MarkerDiamond
					key={`diamond-${i}`}
					cx={coord.x}
					cy={coord.y}
					size={markerSize}
					className={markerStyles.markerDiamond}
				/>
			))}
		</g>
	);
} 