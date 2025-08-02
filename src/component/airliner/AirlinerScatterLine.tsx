"use client";

// [IMPORT] Components //
import MarkerBevelLine from "../shape/MarkerBevelLine";

// [IMPORT] Types //
import type { AirlinerMarkerSeries } from "@/lib/data/airliner-types";

// [IMPORT] Context hooks //
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";

interface AirlinerScatterLineProps {
	airlinerID: string;
	airlinerMarkers: AirlinerMarkerSeries;
	plotFormat: any;
}

/**
 * AirlinerScatterLine Component
 *
 * Renders connecting lines between airliner markers with visual state based on selection context.
 * 
 * Features:
 * - Line connecting largest class value to largest limit value (minor line)
 * - Line connecting class values (major line)
 * - Visual state changes based on hover and selection
 */
export default function AirlinerScatterLine({ 
	airlinerID,
	airlinerMarkers, 
	plotFormat
}: AirlinerScatterLineProps) {

	// === Selection State Management ===
	// Access airliner selection context for visual state only
	// Interaction logic is handled centrally in AirlinerScatterPlot
	const { selectedAirlinerID, hoveredAirlinerID } = useAirlinerSelection();

	// === Visual State Calculation ===
	// Determine visual state based on selection context
	const isHovered = hoveredAirlinerID === airlinerID;
	const isSelected = selectedAirlinerID === airlinerID;

	// === Rendering Configuration ===
	const y = airlinerMarkers.lines.y;
	const minorLineValid = Math.abs(airlinerMarkers.lines.x3 - airlinerMarkers.lines.x2) > 0;

	return (
		<g style={{ pointerEvents: 'none' }}>
			{/* Line connecting largest class value to largest limit value */}
			{minorLineValid && (
				<line
					x1={airlinerMarkers.lines.x3}
					x2={airlinerMarkers.lines.x2}
					y1={y}
					y2={y}
					className={`markerConnectingLineMinor ${
						isSelected ? 'selectedAirliner' : ''
					} ${isHovered ? 'hoveredAirliner' : ''}`}
					strokeWidth={plotFormat.markerLineMinorWidth}
				/>
			)}

			{/* Major line connecting min and max class values */}
			<MarkerBevelLine
				x1={airlinerMarkers.lines.x2}
				x2={airlinerMarkers.lines.x1}
				y1={y}
				y2={y}
				className={`markerConnectingLineMajor ${
					isSelected ? 'selectedAirliner' : ''
				} ${isHovered ? 'hoveredAirliner' : ''}`}
				weight={plotFormat.markerLineMajorWidth}
			/>
		</g>
	);
} 