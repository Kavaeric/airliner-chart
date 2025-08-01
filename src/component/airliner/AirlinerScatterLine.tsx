"use client";

// [IMPORT] Components //
import MarkerBevelLine from "../shape/MarkerBevelLine";


// [IMPORT] Types //
import type { AirlinerMarkerSeries } from "@/lib/data/airliner-types";

// [IMPORT] Context hooks //
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";
import { useDebugMode } from "@/context/DebugModeContext";

interface AirlinerScatterLineProps {
	airlinerID: string;
	airlinerMarkers: AirlinerMarkerSeries;
	plotFormat: any;
}

/**
 * AirlinerScatterLine Component
 *
 * Renders connecting lines between airliner markers with interactive hover/selection states:
 * - Line connecting largest class value to largest limit value
 * - Line connecting class values
 * - Highlight line for visual emphasis
 * - Interactive hover and click handlers for airliner selection
 */
export default function AirlinerScatterLine({ 
	airlinerID,
	airlinerMarkers, 
	plotFormat
}: AirlinerScatterLineProps) {

	// === Selection State Management ===
	// Access airliner selection context for hover and selection states
	const { 
		selectedAirlinerID, 
		hoveredAirlinerID, 
		setSelectedAirliner, 
		setHoveredAirliner 
	} = useAirlinerSelection();

	// === Debug Mode ===
	const { debugMode } = useDebugMode();

	// === Interaction State Calculation ===
	// Determine if this airliner is currently hovered or selected
	const isHovered = hoveredAirlinerID === airlinerID;
	const isSelected = selectedAirlinerID === airlinerID;
	const isInteractive = isHovered || isSelected;

	// === Event Handlers ===
	// Handle mouse enter for hover state
	const handleMouseEnter = () => {
		setHoveredAirliner(airlinerID);
	};

	// Handle mouse leave to clear hover state
	const handleMouseLeave = () => {
		setHoveredAirliner(null);
	};

	// Handle click for selection state
	const handleClick = () => {
		// Toggle selection: if already selected, deselect; otherwise select
		setSelectedAirliner(isSelected ? null : airlinerID);
	};

	// Get the y coordinate for line rendering
	const y = airlinerMarkers.lines.y;

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

			{/* Invisible line for hover and selection */}
			<MarkerBevelLine
				x1={airlinerMarkers.lines.x2}
				x2={airlinerMarkers.lines.x1}
				y1={y}
				y2={y}
				weight={44}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				onClick={handleClick}
				fill="transparent"
				stroke={debugMode ? 'green' : 'transparent'}
				style={{ cursor: 'pointer' }}
			/>
		</g>
	);
} 