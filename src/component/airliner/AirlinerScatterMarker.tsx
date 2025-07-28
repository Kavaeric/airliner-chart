// [IMPORT] Third-party libraries //
import { MarkerDiamond } from "@/component/shape/MarkerDiamond";

// [IMPORT] CSS styling //
import markerStyles from "./AirlinerScatterMarker.module.css";

// [IMPORT] Types //
import type { AirlinerMarkerSeries } from "@/lib/data/airliner-types";

interface AirlinerScatterMarkerProps {
	airlinerMarkers: AirlinerMarkerSeries;
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

	// Get class markers
	const classMarkers = airlinerMarkers.markers.filter(marker =>
		marker.markerClass === 'pax3Class' ||
		marker.markerClass === 'pax2Class' ||
		marker.markerClass === 'pax1Class'
	);

	// Get limit markers
	const limitMarkers = airlinerMarkers.markers.filter(marker =>
		marker.markerClass === 'paxLimit' ||
		marker.markerClass === 'paxExit'
	);

	return (
		<g>
			{/* Exit/theoretical limit markers: vertical line */}
			{limitMarkers.map((coord, i) => (
				<line
					key={`line-${i}`}
					x1={coord.markerCoordinates.x}
					y1={coord.markerCoordinates.y - markerSize / 2}
					x2={coord.markerCoordinates.x}
					y2={coord.markerCoordinates.y + markerSize / 2}
					className={markerStyles.markerLine}
				/>
			))}

			{/* Passenger count markers: diamond */}
			{classMarkers.map((coord, i) => (
				<MarkerDiamond
					key={`diamond-${i}`}
					cx={coord.markerCoordinates.x}
					cy={coord.markerCoordinates.y}
					size={markerSize}
					className={markerStyles.markerDiamond}
				/>
			))}
		</g>
	);
} 