// [IMPORT] Third-party libraries //
import { Text } from "@visx/text";
import React from "react";

// [IMPORT] Types //
import { AirlinerLabel } from "@/lib/data/airliner-types";

// [IMPORT] Context hooks //
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";
import { useDebugMode } from "@/context/DebugModeContext";
import { RectCentre } from "../shape/RectCentre";

// [IMPORT] CSS styling //
// Styles moved to AirlinerChart.css

interface AirlinerScatterLabelProps {
	airlinerID: string;
	airlinerLabel: AirlinerLabel;
	classNames?: string;
	debug?: boolean;
}

/**
 * AirlinerScatterLabel Component
 * 
 * Renders the label for a single airliner.
 * 
 * @param {string} airlinerID - The ID of the airliner.
 * @param {AirlinerLabel} airlinerLabel - The label for the airliner.
 * @param {any} plotFormat - The plot format.
 * @param {string} classNames - The class names for the label.
 * @param {boolean} debug - Optional debug flag.
 */
const AirlinerScatterLabel = React.forwardRef<SVGGElement, AirlinerScatterLabelProps>(
	({
		airlinerID,
		airlinerLabel,
		classNames = "",
		debug = false
	}, ref) => {

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

		const labelVerticalAnchor = "middle";
		const labelTextAnchor = "middle";

		const dx = 0;
		const dy = 0;

		return (
			<g 
				ref={ref}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				onClick={handleClick}
				style={{ cursor: 'pointer' }}
			>
				{/* This is the only way I can think of to have an outline that's on the outside */}
				<Text
					x={airlinerLabel.labelCoordinates?.x || airlinerLabel.labelAnchor.x}
					y={airlinerLabel.labelCoordinates?.y || airlinerLabel.labelAnchor.y}
					dx={dx}
					dy={dy}
					verticalAnchor={labelVerticalAnchor}
					textAnchor={labelTextAnchor}
					className={`airlinerLabelInterrupt ${
						isSelected ? 'selectedAirliner' : ''
					} ${isHovered ? 'hoveredAirliner' : ''}`}
				>
					{airlinerLabel.labelText}
				</Text>

				{/* Label */}
				<Text
					x={airlinerLabel.labelCoordinates?.x || airlinerLabel.labelAnchor.x}
					y={airlinerLabel.labelCoordinates?.y || airlinerLabel.labelAnchor.y}
					dx={dx}
					dy={dy}
					verticalAnchor={labelVerticalAnchor}
					textAnchor={labelTextAnchor}
					className={`airlinerLabel ${
						isSelected ? 'selectedAirliner' : ''
					} ${isHovered ? 'hoveredAirliner' : ''}`}
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
					onClick={handleClick}
					fill="transparent"
					stroke={debugMode ? 'green' : 'transparent'}
					style={{ cursor: 'pointer' }}
				>
					{airlinerLabel.labelText}
				</Text>
			</g>
		);
	}
);

export default AirlinerScatterLabel;

		