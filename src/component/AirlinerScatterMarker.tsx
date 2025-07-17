// [IMPORT] Third-party libraries //
import { Diamond } from "./Diamond";

// [IMPORT] CSS styling //
import markerStyles from "./AirlinerScatterMarker.module.css";

interface AirlinerScatterMarkerProps {
	x: number;
	y: number;
	radius: number;
	markerStyle: "diamond" | "line";
	index: number;
}

/**
 * AirlinerScatterMarker Component
 *
 * Renders a single marker at the specified position with the given style.
 * Supports diamond and line marker styles with proper validation.
 */
export default function AirlinerScatterMarker({ 
	x, 
	y, 
	radius, 
	markerStyle, 
	index 
}: AirlinerScatterMarkerProps) {
	// Skip rendering if x coordinate is invalid
	if (x === undefined || x === null || isNaN(x)) {
		return null;
	}

	if (markerStyle === "diamond") {
		return (
			<Diamond
				key={`marker-${index}-${x}-${y}`}
				x={x}
				y={y}
				r={radius}
				className={markerStyles.markerDiamond}
			/>
		);
	}
	
	if (markerStyle === "line") {
		return (
			<line
				key={`marker-${index}-${x}-${y}`}
				x1={x}
				x2={x}
				y1={y - radius / 2}
				y2={y + radius / 2}
				className={markerStyles.markerLine}
			/>
		);
	}
	
	return null;
} 