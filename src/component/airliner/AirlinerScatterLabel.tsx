// [IMPORT] Third-party libraries //
import { Text } from "@visx/text";
import React from "react";

// [IMPORT] Types //
import { AirlinerLabel } from "@/lib/data/airliner-types";

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

		const labelVerticalAnchor = "middle";
		const labelTextAnchor = "middle";

		const dx = 0;
		const dy = 0;

		return (
			<g ref={ref}>
				{/* This is the only way I can think of to have an outline that's on the outside */}
				<Text
					x={airlinerLabel.labelCoordinates?.x || airlinerLabel.labelAnchor.x}
					y={airlinerLabel.labelCoordinates?.y || airlinerLabel.labelAnchor.y}
					dx={dx}
					dy={dy}
					verticalAnchor={labelVerticalAnchor}
					textAnchor={labelTextAnchor}
					className={"airlinerLabelInterrupt"}
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
					className={"airlinerLabel"}
				>
					{airlinerLabel.labelText}
				</Text>
			</g>
		);
	}
);

export default AirlinerScatterLabel;

		