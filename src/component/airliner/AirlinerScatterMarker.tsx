// [IMPORT] Third-party libraries //
import { MarkerDiamond } from "@/component/shape/MarkerDiamond";

// [IMPORT] CSS styling //
// Styles moved to AirlinerChart.css

// [IMPORT] Types //
import type { AirlinerMarkerSeries } from "@/lib/data/airliner-types";

// [IMPORT] Context hooks //
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";

interface AirlinerScatterMarkerProps {
	airlinerID: string;
	airlinerMarkers: AirlinerMarkerSeries;
	markerSize: number;
}

/**
 * AirlinerScatterMarker Component
 *
 * Renders all markers for a single airliner at their calculated positions.
 * Handles different marker styles (diamond/line) and filters out invalid coordinates.
 * Responds to hover and selection states with visual feedback.
 */
export default function AirlinerScatterMarker({ 
	airlinerID,
	airlinerMarkers,
	markerSize 
}: AirlinerScatterMarkerProps) {

	// === Selection State Management ===
	// Access airliner selection context for hover and selection states
	const { selectedAirlinerID, hoveredAirlinerID } = useAirlinerSelection();

	// === Interaction State Calculation ===
	// Determine if this airliner is currently hovered or selected
	const isHovered = hoveredAirlinerID === airlinerID;
	const isSelected = selectedAirlinerID === airlinerID;
	const isInteractive = isHovered || isSelected;

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
					className={`markerLine ${
						isSelected ? 'selectedAirliner' : ''
					} ${isHovered ? 'hoveredAirliner' : ''}`}
				/>
			))}

			{/* Passenger count markers: diamond */}
			{classMarkers.map((coord, i) => (
				<MarkerDiamond
					key={`diamond-${i}`}
					cx={coord.markerCoordinates.x}
					cy={coord.markerCoordinates.y}
					size={markerSize}
					className={`markerDiamond ${
						isSelected ? 'selectedAirliner' : ''
					} ${isHovered ? 'hoveredAirliner' : ''}`}
				/>
			))}
		</g>
	);
} 