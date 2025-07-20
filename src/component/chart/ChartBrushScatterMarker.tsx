// [IMPORT] Third-party libraries //
import { MarkerDiamond } from "@/component/shape/MarkerDiamond";

// [IMPORT] CSS styling //
import markerStyles from "@/component/chart/ChartBrushScatterMarker.module.css";

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
 * Major markers are diamonds, minor markers are vertical lines.
 */
export default function ChartBrushScatterMarker({ 
	x, 
	y, 
	radius, 
	style, 
	className 
}: ChartBrushScatterMarkerProps) {
	if (style === "major") {
		return (
			<MarkerDiamond
				cx={x}
				cy={y}
				r={radius}
				className={markerStyles.markerMajor}
			/>
		);
	}
	
	if (style === "minor") {
		return (
			<line
				x1={x}
				x2={x}
				y1={y - radius}
				y2={y + radius}
				className={markerStyles.markerMinor}
			/>
		);
	}
	
	return null;
} 