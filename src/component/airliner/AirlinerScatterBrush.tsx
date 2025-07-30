// [IMPORT] React and core libraries //
import React from "react";

// [IMPORT] Context providers/hooks //
import { useChartData } from "@/component/airliner/AirlinerChart";
import { useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";
import { useResponsiveSVG } from "@/context/ResponsiveSVG";
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";

// [IMPORT] Types/interfaces //
import { plotAirlinerMarkerSeries } from "@/lib/data/plot-airliner-markers";
import { RectCentre } from "@/component/shape/RectCentre";

// [IMPORT] CSS styling //
import brushStyles from "@/component/chart/ChartBrush.module.css";
import MarkerBevelLine from "../shape/MarkerBevelLine";

/**
 * AirlinerScatterBrush Component
 *
 * Renders airliner-specific scatter plot data for brush visualisation.
 * Extracted from ChartBrush to separate airliner logic from generic brush functionality.
 *
 * @param className - Optional CSS class for styling
 */
interface AirlinerScatterBrushProps {
	className?: string;
	axisMode?: "x" | "y" | "both";
}

export default function AirlinerScatterBrush({ className, axisMode = "x" }: AirlinerScatterBrushProps) {
	const { dataScale, viewportScale } = useResponsiveChartViewport();
	const { width, height } = useResponsiveSVG();
	const data = useChartData();
	const { selectedAirlinerID } = useAirlinerSelection();

	// Scatter plot logic
	const markerSizeMajor = 4;
	const markerSizeMinor = 4;

	// Memoised data processing - direct range calculation without overlap detection
	const { paxClassRanges, paxLimitCoordinates, selectedAirlinerRange } = React.useMemo((): {
		paxClassRanges: Array<{ x1: number; x2: number }>;
		paxLimitCoordinates: number[];
		selectedAirlinerRange: { x1: number; x2: number } | null;
	} => {

		if (axisMode !== "x") return { paxClassRanges: [], paxLimitCoordinates: [], selectedAirlinerRange: null };

		const paxClassRanges: Array<{ x1: number; x2: number }> = [];
		const paxLimitCoordinates: number[] = [];
		let selectedAirlinerRange: { x1: number; x2: number } | null = null;

		data.forEach(airliner => {
			const markerSeries = plotAirlinerMarkerSeries(
				airliner.airlinerID,
				airliner.airlinerData,
				dataScale.x,
				dataScale.y,
				markerSizeMajor
			);

			// Extract pax class markers (pax3Class, pax2Class, pax1Class)
			const paxClassMarkers = markerSeries.markers.filter(marker =>
				marker.markerClass === "pax3Class" ||
				marker.markerClass === "pax2Class" ||
				marker.markerClass === "pax1Class"
			);

			// Calculate range directly (no overlap detection)
			if (paxClassMarkers.length > 0) {
				const xCoordinates = paxClassMarkers.map(marker => marker.markerCoordinates.x);
				const x1 = Math.min(...xCoordinates);
				const x2 = Math.max(...xCoordinates);

				// Add range immediately (simplified approach)
				paxClassRanges.push({ x1, x2 });

				// Check if this is the selected airliner
				if (airliner.airlinerID === selectedAirlinerID) {
					selectedAirlinerRange = { x1, x2 };
				}
			}

			// Extract pax limit markers (paxLimit, paxExit)
			const paxLimitMarkers = markerSeries.markers.filter(marker =>
				marker.markerClass === "paxLimit" || marker.markerClass === "paxExit"
			);

			// Collect limit x-coordinates
			paxLimitMarkers.forEach(marker => {
				paxLimitCoordinates.push(marker.markerCoordinates.x);
			});
		});

		return { paxClassRanges, paxLimitCoordinates, selectedAirlinerRange };
	}, [data, dataScale.x, axisMode, markerSizeMajor, selectedAirlinerID]);

	// For y-axis: rangeKM is the only data we need to show
	const { rangeCoordinates, selectedAirlinerY } = React.useMemo(() => {

		if (axisMode !== "y") return { rangeCoordinates: [], selectedAirlinerY: null };
		
		const rangeCoordinates: number[] = [];
		let selectedAirlinerY: number | null = null;

		data.forEach(airliner => {
			const markerSeries = plotAirlinerMarkerSeries(
				airliner.airlinerID,
				airliner.airlinerData,
				dataScale.x,
				dataScale.y,
				markerSizeMajor
			);

			const airlinerMarker = markerSeries.markers.find(marker => 
				(
					marker.markerClass === "pax3Class" ||
					marker.markerClass === "pax2Class" ||
					marker.markerClass === "pax1Class" ||
					marker.markerClass === "paxLimit" ||
					marker.markerClass === "paxExit"
				) && typeof marker.markerCoordinates.y === "number"
			);

			if (airlinerMarker) {
				rangeCoordinates.push(airlinerMarker.markerCoordinates.y);
				
				// Check if this is the selected airliner
				if (airliner.airlinerID === selectedAirlinerID) {
					selectedAirlinerY = airlinerMarker.markerCoordinates.y;
				}
			}
		});

		return { rangeCoordinates, selectedAirlinerY };
	}, [data, dataScale.y, markerSizeMajor, selectedAirlinerID]);

	return (
		<g className={className}>
			{/* Background */}
			<rect
				x={0}
				y={0}
				width={width}
				height={height}
				className="airlinerBrushBackground"
			/>

			{/* Border */}
			{axisMode === "x" && (
				<RectCentre
					cx={width / 2}
					cy={0}
					width={width}
					height={0}
					className="brushBorder"
				/>
			)}

			{axisMode === "y" && (
				<RectCentre
					cx={width}
					cy={height / 2}
					width={0}
					height={height}
					className="brushBorder"
				/>
			)}

			{/* Limit coordinates as vertical lines */}
			{axisMode === "x" && paxLimitCoordinates.map((x, index) => (
				<line
					key={`limit-${index}`}
					x1={x}
					y1={height / 2}
					x2={x}
					y2={height}
					className="airlinerBrushLimitLine"
				/>
			))}

			{/* Passenger class ranges as filled rectangles */}
			{axisMode === "x" && paxClassRanges.map((x, index) => (
				<RectCentre
					key={`pax-${index}`}
					cx={(x.x1 + x.x2) / 2}
					cy={3 *height / 4}
					width={x.x2 - x.x1}
					height={height / 2}
					className="airlinerBrushPaxClassRange"
				/>
			))}

			{/* Selected airliner highlight - white box showing extents of class passenger capacity */}
			{axisMode === "x" && selectedAirlinerRange && (
				<MarkerBevelLine
					x1={selectedAirlinerRange.x1}
					y1={3 * height / 4}
					x2={selectedAirlinerRange.x2}
					y2={3 * height / 4}
					weight={height / 6}
					className="selectedAirlinerXHighlight"
				/>
			)}

			{axisMode === "y" && rangeCoordinates.map((y, index) => (
				<line
					key={`range-${index}`}
					x1={0}
					y1={y}
					x2={width / 2}
					y2={y}
					className="airlinerBrushRangeKM"
				/>
			))}

			{/* Selected airliner highlight for Y-axis - white line showing range */}
			{axisMode === "y" && selectedAirlinerY !== null && (
				<line
					x1={0}
					y1={selectedAirlinerY}
					x2={width / 2}
					y2={selectedAirlinerY}
					className="selectedAirlinerYHighlight"
				/>
			)}
		</g>
	);
} 