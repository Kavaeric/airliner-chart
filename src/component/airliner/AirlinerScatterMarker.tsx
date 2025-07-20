// [IMPORT] Third-party libraries //
import { MarkerDiamond } from "@/component/shape/MarkerDiamond";

// [IMPORT] CSS styling //
import markerStyles from "./AirlinerScatterMarker.module.css";

// [IMPORT] Types //
import { AirlinerData } from "@/lib/data/airliner-data-processor";
import { AirlinerMarkerCoordinates } from "@/lib/data/process-airliner-marker-coordinates";

interface AirlinerScatterMarkerProps {
	airlinerData: AirlinerData;
	coords: AirlinerMarkerCoordinates;
	markerSize: number;
}

/**
 * AirlinerScatterMarker Component
 *
 * Renders all markers for a single airliner at their calculated positions.
 * Handles different marker styles (diamond/line) and filters out invalid coordinates.
 */
export default function AirlinerScatterMarker({ 
	airlinerData, 
	coords, 
	markerSize 
}: AirlinerScatterMarkerProps) {
	// Helper function to get valid markers with coordinates
	const getValidMarkersWithCoords = () => {
		return [
			{ value: airlinerData.paxExit, x: coords.xPaxExit, style: airlinerData.markerStylePaxExit },
			{ value: airlinerData.paxLimit, x: coords.xPaxLimit, style: airlinerData.markerStylePaxLimit },
			{ value: airlinerData.pax1Class, x: coords.xPax1Class, style: airlinerData.markerStylePax1Class },
			{ value: airlinerData.pax2Class, x: coords.xPax2Class, style: airlinerData.markerStylePax2Class },
			{ value: airlinerData.pax3Class, x: coords.xPax3Class, style: airlinerData.markerStylePax3Class }
		].filter(marker => marker.value !== undefined && marker.x !== undefined);
	};

	const validMarkers = getValidMarkersWithCoords();

	return (
		<g>
			{validMarkers.map((marker, idx) => {
				// Skip rendering if x coordinate is invalid
				if (marker.x === undefined || marker.x === null || isNaN(marker.x)) {
					return null;
				}

				if (marker.style === "diamond") {
					return (
						<MarkerDiamond
							key={`marker-${idx}-${marker.x}-${coords.y}`}
							cx={marker.x}
							cy={coords.y}
							r={markerSize}
							className={markerStyles.markerDiamond}
						/>
					);
				}
				
				if (marker.style === "line") {
					return (
						<line
							key={`marker-${idx}-${marker.x}-${coords.y}`}
							x1={marker.x}
							x2={marker.x}
							y1={coords.y - markerSize / 2}
							y2={coords.y + markerSize / 2}
							className={markerStyles.markerLine}
						/>
					);
				}
				
				return null;
			})}
		</g>
	);
} 