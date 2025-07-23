// [IMPORT] Third-party libraries //
import { Text } from "@visx/text";

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
 * Renders the label for a single airliner at the leftmost marker position.
 * Calculates the optimal label position and renders the airliner name.
 */
export default function AirlinerScatterLabel({ 
	airlinerData, 
	coords, 
	labelOffset = { x: 0, y: 0 },
	classNames = ""
}: AirlinerScatterLabelProps) {
	const debugMode = useDebugMode();

	return (
		<>
		<Text
			x={coords.x}
			y={coords.y}
			className={`${labelStyles.airlinerLabel} ${classNames}`}
			verticalAnchor="middle"
			textAnchor="middle"
		>
			{airlinerData.nameCommon}
		</Text>
		</>
	);
}

		