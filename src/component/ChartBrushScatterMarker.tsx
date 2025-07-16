// [IMPORT] Third-party libraries //
import { Diamond } from "./Diamond";

// [IMPORT] CSS styling //
import markerStyles from "./ChartBrushScatterMarker.module.css";

interface ChartBrushScatterMarkerProps {
	x: number;
	y: number;
	radius: number;
	style: "major" | "minor";
	className?: string;
}

/**
 * ChartBrushScatterMarker Component
 *
 * Renders a single marker at the specified position with the given style.
 * Supports major and minor marker styles for the brush scatter plot.
 */
export default function ChartBrushScatterMarker({ 
	x, 
	y, 
	radius, 
	style, 
	className 
}: ChartBrushScatterMarkerProps) {
	return (
		<Diamond
			x={x}
			y={y}
			r={radius}
			className={style === "major" ? markerStyles.markerMajor : markerStyles.markerMinor}
		/>
	);
} 