"use client";

// [IMPORT] React //
import { useMemo } from "react";

// [IMPORT] Third-party libraries //
import { GridRows } from "@visx/grid";
import { GridColumns } from "@visx/grid";
import { Text } from "@visx/text";

// [IMPORT] Internal components //
import AirlinerScatterMarker from './AirlinerScatterMarker';
import AirlinerScatterLine from './AirlinerScatterLine';

// [IMPORT] Context providers/hooks //
import { useChartScalesContext } from "../context/ChartScalesContext";
import { useChartData } from "./AirlinerChart";
import { useChartLayout } from "../context/ChartLayoutContext";

// [IMPORT] Utilities //
import { processAirlinerData, AirlinerData } from "../lib/airliner-data-processor";
import { processAirlinerMarkerCoordinates, AirlinerMarkerCoordinates } from "../lib/process-airliner-marker-coordinates";

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
	const { xTickGridCount, yTickGridCount } = useChartLayout();
	const data = useChartData();

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

	// Process all airliner data - memoised to prevent unnecessary recalculations
	const airlinerData = useMemo(() => data.map(d => processAirlinerData(d)), [data]);

	// Calculate all marker coordinates - memoised to prevent unnecessary recalculations
	const markerCoordinates = useMemo(() => 
		airlinerData.map(d => processAirlinerMarkerCoordinates(d, xScaleView, yScaleView)), 
		[airlinerData, xScaleView, yScaleView]
	);

	// Helper function to get valid markers with coordinates
	const getValidMarkersWithCoords = (airlinerData: AirlinerData, coords: AirlinerMarkerCoordinates) => {
		return [
			{ value: airlinerData.paxExit, x: coords.xPaxExit, style: airlinerData.markerStylePaxExit },
			{ value: airlinerData.paxLimit, x: coords.xPaxLimit, style: airlinerData.markerStylePaxLimit },
			{ value: airlinerData.pax1Class, x: coords.xPax1Class, style: airlinerData.markerStylePax1Class },
			{ value: airlinerData.pax2Class, x: coords.xPax2Class, style: airlinerData.markerStylePax2Class },
			{ value: airlinerData.pax3Class, x: coords.xPax3Class, style: airlinerData.markerStylePax3Class }
		].filter(marker => marker.value !== undefined && marker.x !== undefined);
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
				
				{/* Connecting lines */}
				{markerCoordinates.map((coords, i) => coords ? (
					<AirlinerScatterLine
						key={`lines-${i}`}
						airlinerData={airlinerData[i]}
						coords={coords}
						index={i}
						markerSize={markerSize}
						markerLineMajorWidth={markerLineMajorWidth}
						markerLineMinorWidth={markerLineMinorWidth}
					/>
				) : null)}

				{/* Markers */}
				{airlinerData.map((processedD, i) => {
					const coords = markerCoordinates[i];
					if (!coords) return null;
					return (
						<g key={`markers-${i}`}>
							{getValidMarkersWithCoords(processedD, coords).map((marker, idx) => 
								<AirlinerScatterMarker
									key={`marker-${idx}-${marker.x}-${coords.y}`}
									x={marker.x ?? 0}
									y={coords.y}
									radius={12}
									markerStyle={marker.style}
									index={idx}
								/>
							)}
						</g>
					);
				})}

				{/* Labels */}
				{airlinerData.map((processedD, i) => {
					const coords = markerCoordinates[i];
					if (!coords) return null;
					const labelX = ((coords.xPax3Class ?? coords.xPax2Class ?? coords.xPax1Class) ?? 0) - labelOffset;
					const labelY = coords.y ?? 0;
					return (
						<Text
							key={`label-${i}`}
							x={labelX}
							y={labelY}
							className={plotStyles.pointLabel}
							verticalAnchor="middle"
							textAnchor="end"
						>
							{data[i].nameCommon}
						</Text>
					);
				})}
			</svg>
		</div>
	);
} 