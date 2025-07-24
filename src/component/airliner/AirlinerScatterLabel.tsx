// [IMPORT] Third-party libraries //
import { Text } from "@visx/text";
import React from "react";

// [IMPORT] CSS styling //
import labelStyles from "./AirlinerScatterLabel.module.css";

// [IMPORT] Types //
import { AirlinerData } from "@/lib/data/airliner-data-processor";
import { useDebugMode } from "@/context/DebugContext";

interface AirlinerScatterLabelProps {
	airlinerData: AirlinerData;
	coords: { x: number; y: number };
	labelOffset?: { x?: number; y?: number };
	forcePosition?: { x: number; y: number };
	classNames?: string;
}

/**
 * AirlinerScatterLabel Component
 * 
 * Renders the label for a single airliner at 
 */
const AirlinerScatterLabel = React.forwardRef<SVGGElement, AirlinerScatterLabelProps>(
	({ airlinerData, coords, labelOffset = { x: 0, y: 0 }, classNames = "" }, ref) => {
		const debugMode = useDebugMode();
		return (
			<g ref={ref}>

				{/* This is the only way I can think of to have an outline that's on the outside */}
				<Text
					x={coords.x}
					y={coords.y}
					className={`${labelStyles.airlinerLabel} ${classNames}`}
					verticalAnchor="middle"
					textAnchor="middle"
					fill="none"
					stroke="#dddedf"
					strokeWidth={8}
					strokeMiterlimit={5}
					opacity={0.5}
				>
					{airlinerData.nameCommon}
				</Text>

				{/* Label */}
				<Text
					x={coords.x}
					y={coords.y}
					className={`${labelStyles.airlinerLabel} ${classNames}`}
					verticalAnchor="middle"
					textAnchor="middle"
				>
					{airlinerData.nameCommon}
				</Text>
			</g>
		);
	}
);

export default AirlinerScatterLabel;

		