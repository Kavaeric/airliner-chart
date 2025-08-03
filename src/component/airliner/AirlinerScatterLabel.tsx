// [IMPORT] Third-party libraries //
import { Text } from "@visx/text";
import React from "react";

// [IMPORT] Types //
import { AirlinerLabel } from "@/lib/data/airliner-types";

// [IMPORT] Context hooks //
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";

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
 * Renders the label for a single airliner with visual state based on selection context.
 *
 * @param {string} airlinerID - The ID of the airliner
 * @param {AirlinerLabel} airlinerLabel - The label data for the airliner
 * @param {string} classNames - Additional CSS class names
 * @param {boolean} debug - Optional debug flag
 */
const AirlinerScatterLabel = React.forwardRef<SVGGElement, AirlinerScatterLabelProps>(
	({
		airlinerID,
		airlinerLabel,
		classNames = "",
		debug = false
	}, ref) => {

		// === Selection State Management ===
		// Access airliner selection context for visual state only
		// Interaction logic is handled centrally in AirlinerScatterPlot
		const { selectedAirlinerID, hoveredAirlinerID } = useAirlinerSelection();

		// === Visual State Calculation ===
		// Determine visual state based on selection context
		const isHovered = hoveredAirlinerID === airlinerID;
		const isSelected = selectedAirlinerID === airlinerID;

		// === Rendering Configuration ===
		const labelVerticalAnchor = "middle";
		const labelTextAnchor = "middle";

		const dx = 0;
		const dy = 0;

		return (
			<g 
				ref={ref}
				style={{ pointerEvents: 'none' }}
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

				{/* Main label text */}
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
					fill="transparent"
				>
					{airlinerLabel.labelText}
				</Text>
			</g>
		);
	}
);

export default AirlinerScatterLabel;

		