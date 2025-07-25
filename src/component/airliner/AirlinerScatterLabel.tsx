// [IMPORT] Third-party libraries //
import { Text } from "@visx/text";
import React from "react";

// [IMPORT] CSS styling //
import labelStyles from "./AirlinerScatterLabel.module.css";

// [IMPORT] Types //
import { AirlinerData } from "@/lib/data/airliner-data-processor";
import { useDebugMode } from "@/context/DebugModeContext";

interface AirlinerScatterLabelProps {
	airlinerData: AirlinerData;
	coords: { x: number; y: number };
	labelOffset?: { x?: number; y?: number };
	forcePosition?: { x: number; y: number };
	classNames?: string;
	dimensions?: { width: number; height: number };
	textSize?: number;
}

/**
 * AirlinerScatterLabel Component
 * 
 * Renders the label for a single airliner at 
 */
const AirlinerScatterLabel = React.forwardRef<SVGGElement, AirlinerScatterLabelProps>(
	({
		airlinerData,
		coords,
		classNames = "",
		textSize = 16
	}, ref) => {

		const debugMode = useDebugMode();

		const labelVerticalAnchor = "middle";
		const labelTextAnchor = "middle";

		const interruptionWeight = 8;
		const interruptionOpacity = 0.8;
		const interruptionColor = "#dddedf";
		const interruptionMiterLimit = 1.5;
		const interruptionLinejoin = "round";

		const dx = 0;
		const dy = 0;

		return (
			<g ref={ref}>
				{/* This is the only way I can think of to have an outline that's on the outside */}
				<Text
					x={coords.x}
					y={coords.y}
					dx={dx}
					dy={dy}
					className={`${labelStyles.airlinerLabel} ${classNames}`}
					verticalAnchor={labelVerticalAnchor}
					textAnchor={labelTextAnchor}
					fontSize={textSize}
					fill="none"
					stroke={interruptionColor}
					strokeWidth={interruptionWeight}
					strokeMiterlimit={interruptionMiterLimit}
					strokeLinejoin={interruptionLinejoin}
					opacity={interruptionOpacity}
				>
					{airlinerData.nameCommon}
				</Text>

				{/* Label */}
				<Text
					x={coords.x}
					y={coords.y}
					dx={dx}
					dy={dy}
					className={`${labelStyles.airlinerLabel} ${classNames}`}
					verticalAnchor={labelVerticalAnchor}
					textAnchor={labelTextAnchor}
					fontSize={textSize}
				>
					{airlinerData.nameCommon}
				</Text>
			</g>
		);
	}
);

export default AirlinerScatterLabel;

		