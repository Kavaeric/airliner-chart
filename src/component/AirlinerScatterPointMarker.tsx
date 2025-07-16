// [IMPORT] Third-party libraries //
import { Diamond } from "./Diamond";
import markerStyles from "./AirlinerScatterPointMarker.module.css";

interface AirlinerScatterPointMarkerProps {
	x: number;
	y: number;
	radius: number;
	markerStyle: "diamond" | "line";
	className?: string;
	zDepth?: number;
}

/**
 * AirlinerScatterPointMarker Component
 *
 * Renders a single marker at the specified position with the given style.
 * Supports solid, outline, and line marker styles.
 */
export default function AirlinerScatterPointMarker({ 
	x, 
	y, 
	radius, 
	markerStyle, 
	className,
	zDepth
}: AirlinerScatterPointMarkerProps) {
	if (markerStyle === "diamond") {
		return (
			<Diamond
				x={x}
				y={y}
				r={radius}
				className={markerStyles.markerDiamond}
				style={{zIndex: zDepth}}
			/>
		);
	}
	
	if (markerStyle === "line") {
		// Render a short vertical line as a marker
		return (
			<line
				x1={x}
				x2={x}
				y1={y - radius / 2}
				y2={y + radius / 2}
				className={markerStyles.markerLine}
				style={{zIndex: zDepth}}
			/>
		);
	}
	
	return null;
} 