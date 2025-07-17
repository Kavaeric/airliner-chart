"use client";

// [IMPORT] Third-party libraries //
import { GridRows } from "@visx/grid";
import { GridColumns } from "@visx/grid";
import { Text } from "@visx/text";

// [IMPORT] Internal components //
import { Diamond } from "./Diamond";

// [IMPORT] Context providers/hooks //
import { useChartScalesContext } from "../context/ChartScalesContext";
import { useChartData } from "./AirlinerChart";
import { useChartLayout } from "../context/ChartLayoutContext";

// [IMPORT] Utilities //
import { processAirlinerData, getLabelXCoordinate, getValidMarkers } from "../lib/airliner-data-processor";

// [IMPORT] CSS styling //
import plotStyles from "./AirlinerScatterPlot.module.css";
import responsiveStyles from "./ResponsiveSVG.module.css";

/**
 * AirlinerScatterPlot Component
 *
 * Renders the main chart area:
 * - Draws gridlines for reference
 * - Plots each airliner with markers, connecting lines, and labels
 * - Renders elements in layers to control z-index ordering
 *
 * Receives all layout and scale info from parent.
 */
export default function AirlinerScatterPlot({ width, height }: { width: number; height: number }) {
	const { xScaleView, yScaleView } = useChartScalesContext();
	const data = useChartData();
	const { xTickGridCount, yTickGridCount } = useChartLayout();

	// Constants for rendering
	const markerSize = 12;
	const markerLineMajorWidth = 4;
	const markerLineMinorWidth = 2;
	const labelOffset = 12;

	// If the chart dimensions are 0, or no data, show loading/empty state
	if (width === 0 || height === 0 || data.length === 0) {
		return (
			<div className={plotStyles.chartArea}>
				<p>Loading chart...</p>
			</div>
		);
	}

	// Process all airliner data
	const processedData = data.map(d => processAirlinerData(d, xScaleView, yScaleView));

	// Helper function to render a single marker
	const renderMarker = (x: number, y: number, radius: number, markerStyle: "diamond" | "line", index: number) => {
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
					className={plotStyles.markerDiamond}
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
					className={plotStyles.markerLine}
				/>
			);
		}
		return null;
	};

	return (
		<div className={`${plotStyles.chartArea} ${responsiveStyles.responsiveContainer}`}>
			<svg className={responsiveStyles.responsiveSVG}>
				{/* Gridlines for visual reference */}
				<GridRows
					scale={yScaleView}
					width={width}
					numTicks={yTickGridCount}
					className={plotStyles.gridLine}
				/>
				<GridColumns
					scale={xScaleView}
					height={height}
					numTicks={xTickGridCount}
					className={plotStyles.gridLine}
				/>
				
				{/* Layer 1: Connecting lines (bottom layer) */}
				{processedData.map((processedD, i) => (
					<g key={`lines-${i}`}>
						{/* Draw a line connecting the largest class value to the largest limit value */}
						{processedD.markerLimitLineXCoordinates.validLine && (
							<line
								x1={processedD.markerLimitLineXCoordinates.x1}
								x2={processedD.markerLimitLineXCoordinates.x2}
								y1={processedD.markerYRangeKM}
								y2={processedD.markerYRangeKM}
								className={plotStyles.pointMarkerConnectingLineMinor}
								strokeWidth={markerLineMinorWidth}
							/>
						)}

						{/* Draw a line connecting the class values */}
						{processedD.markerClassLineXCoordinates.validLine && (
							<line
								x1={processedD.markerClassLineXCoordinates.x1}
								x2={processedD.markerClassLineXCoordinates.x2}
								y1={processedD.markerYRangeKM}
								y2={processedD.markerYRangeKM}
								className={plotStyles.pointMarkerConnectingLineMajor}
								strokeWidth={markerLineMajorWidth}
							/>
						)}

						{/* Extra class value line for pizzaz */}
						{processedD.markerClassLineXCoordinates.validLine && (
							<line
								x1={processedD.markerClassLineXCoordinates.x1}
								x2={processedD.markerClassLineXCoordinates.x2}
								y1={processedD.markerYRangeKM}
								y2={processedD.markerYRangeKM}
								className={plotStyles.pointMarkerConnectingLineMajorHighlight}
								strokeWidth={markerSize + 2}
							/>
						)}
					</g>
				))}

				{/* Layer 2: Markers (middle layer) */}
				{processedData.map((processedD, i) => (
					<g key={`markers-${i}`}>
						{getValidMarkers(processedD).map((marker, idx) => 
							renderMarker(marker.x, processedD.markerYRangeKM, markerSize, marker.style, idx)
						)}
					</g>
				))}

				{/* Layer 3: Labels (top layer) */}
				{processedData.map((processedD, i) => (
					<Text
						key={`label-${i}`}
						x={getLabelXCoordinate(processedD, labelOffset)}
						y={processedD.markerYRangeKM}
						className={plotStyles.pointLabel}
						verticalAnchor="middle"
						textAnchor="end"
					>
						{data[i].nameCommon}
					</Text>
				))}
			</svg>
		</div>
	);
} 