"use client";

// [IMPORT] React //
import React, { useMemo, useRef, useCallback, useEffect } from "react";

// [IMPORT] Third-party libraries //
import { GridRows, GridColumns } from "@visx/grid";

// [IMPORT] Internal components //
import AirlinerScatterMarker from './AirlinerScatterMarker';
import AirlinerScatterLine from './AirlinerScatterLine';
import AirlinerScatterLabel from './AirlinerScatterLabel';
import * as Voronoi from '@/lib/utils/voronoi'
import DrawVoronoi from '@/component/DrawVoronoi';
import DrawDelaunay from '@/component/DrawDelaunay';
import { MarkerDiamond } from "../shape/MarkerDiamond";
import { MarkerPlus } from "../shape/MarkerPlus";
import { RectCross } from "../shape/RectCross";
import { Connector } from "@visx/annotation";
import { MarkerLeader } from "../shape/MarkerLeader";
import { MarkerCross } from "../shape/MarkerCross";

// [IMPORT] Context providers/hooks //
import { useChartScales } from "@/context/ChartScalesContext";
import { useChartData } from "./AirlinerChart";
import { useChartLayout } from "@/context/ChartLayoutContext";
import { useDebugMode } from "@/context/DebugModeContext";
import { useAirlinerViewModel } from "@/lib/data/use-airliner-view-model";

// [IMPORT] Utilities //
import type { AirlinerModel } from "@/lib/data/airliner-types";

// [IMPORT] CSS styling //
import plotStyles from "./AirlinerScatterPlot.module.css";
import labelStyles from "./AirlinerScatterLabel.module.css";
import responsiveStyles from "@/component/ResponsiveSVG.module.css";
import { RectCentre } from "../shape/RectCentre";

/**
 * AirlinerScatterPlot
 * 
 * MVVM: View. Renders the main chart area and plots data.
 * 
 */
export default function AirlinerScatterPlot({ 
	width, 
	height,
}: {
	width: number;
	height: number;
}) {
	// === Context and chart config ===
	// Retrieve chart scales (x/y), layout config, data, and debug mode from context providers.
	const { xScaleView, yScaleView } = useChartScales();
	const { xTickGridCount, yTickGridCount } = useChartLayout();
	const data = useChartData() as AirlinerModel[];
	const { debugMode } = useDebugMode();

	// === ViewModel ===
	const {
		airlinerEntries,		// Map of airliner IDs to their view model data
		airlinerPlotData,		// Plot and placement data for the chart
		batchUpdateLabelDimensions, // Callback for label measurements
		areLabelsMeasured,	// Flag for if all labels have been measured
		plotFormat,				// Formatting options for the plot
		airlinerLabelClusters,	// Cluster detection results
	} = useAirlinerViewModel(data, xScaleView, yScaleView, width, height, debugMode);

	// === Batch label measurement logic ===
	// ghostLabelIDs is an array of airliner IDs that have not yet been measured
	const ghostLabelIDs = useMemo(() =>
		Array.from(airlinerEntries.values())
			.filter(a => a.labels?.labelAnchor && a.labels?.labelDimensions === null)
			.map(a => a.airlinerID),
		[airlinerEntries]
	);

	useEffect(() => {
		console.log(`[AirlinerScatterPlot] Ghost labels to be rendered: ${ghostLabelIDs.length}`);
	}, [ghostLabelIDs]);

	// pendingLabelDimensions is a map of airliner IDs to their dimensions
	const pendingLabelDimensions = useRef(new Map());

	// handleLabelRef is a callback that is used to measure the dimensions of a label
	// It will only call batchUpdateLabelDimensions once all ghost labels have been measured
	const handleLabelRef = useCallback((airlinerID: string) => (el: SVGGElement | null) => {
		if (el) {
			const bbox = el.getBBox();

			// Add arbitrary padding to the width and height
			const xPadding = 8;
			const yPadding = 4;

			pendingLabelDimensions.current.set(airlinerID, { width: bbox.width + xPadding, height: bbox.height + yPadding, xPadding, yPadding });

			// If all ghost labels have been measured, call batchUpdateLabelDimensions
			if (
				pendingLabelDimensions.current.size === ghostLabelIDs.length &&
				ghostLabelIDs.every(id => pendingLabelDimensions.current.has(id))
			) {
				batchUpdateLabelDimensions(new Map(pendingLabelDimensions.current));

				// Clear the pendingLabelDimensions map of references
				pendingLabelDimensions.current.clear();
			}
		}
	}, [ghostLabelIDs, batchUpdateLabelDimensions]);
	
	// === Early exit for empty chart ===
	// If chart has no size or no data, show loading state.
	if (width === 0 || height === 0 || data.length === 0) {
		return (
			<div className={plotStyles.chartArea}>
				<p>Loading chart...</p>
			</div>
		);
	}

	// Render SVG chart
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

				{/* Chart bands */}
				{debugMode && airlinerPlotData?.chartBands.map((band) => (
					<g key={band.index}>
						<rect
							key={band.index}
							x={band.left}
							y={band.top}
							width={band.right - band.left}
							height={band.bottom - band.top}
							fill="none"
							stroke="rgba(17, 158, 106, 0.2)"
							strokeWidth={1}
						/>
						<text
							x={band.left + 4}
							y={band.top + 12}
							fill="rgba(17, 158, 106, 0.8)"
							fontSize={12}
							fontWeight="bold"
						>
							{band.index}
						</text>
					</g>
				))}

				{/* Chart band occupancy */}
				{debugMode && airlinerPlotData?.occupancy.map((band) => (
					<g key={band.bandIndex}>
						{band.occupiedRanges.map((range) => (
							<rect
								key={range.start}
								x={range.start}
								y={band.band.top}
								width={range.width}
								height={band.band.bottom - band.band.top}
								fill="rgba(214, 40, 135, 0.2)"
								stroke="rgba(214, 40, 135, 0.4)"
								strokeWidth={1}
							/>
						))}
					</g>
				))}

				{/* Airliner connecting lines */}
				{Array.from(airlinerEntries.values()).map((airliner) =>
					airliner.markerSeries ? (
						<AirlinerScatterLine
							key={airliner.airlinerID}
							airlinerID={airliner.airlinerID}
							airlinerMarkers={airliner.markerSeries}
							plotFormat={plotFormat}
						/>
					) : null
				)}

				{/* Airliner markers */}
				{Array.from(airlinerEntries.values()).map((airliner) =>
					airliner.markerSeries ? (
						<AirlinerScatterMarker
							key={airliner.airlinerID}
							airlinerMarkers={airliner.markerSeries}
							markerSize={plotFormat.markerSize}
						/>
					) : null
				)}

				{/* Debug: Anchor points */}
				{debugMode && Array.from(airlinerEntries.values()).map((airliner) =>
					airliner.labels?.labelAnchor ? (
						<MarkerCross
							key={airliner.airlinerID}
							cx={airliner.labels?.labelAnchor.x}
							cy={airliner.labels?.labelAnchor.y}
							weight={2}
							fill="blue"
						/>
					) : null
				)}

				{/* Leader lines */}
				{Array.from(airlinerEntries.values()).map((airliner) =>
					airliner.labels?.labelAnchor && airliner.labels?.labelCoordinates ? (
						<MarkerLeader
							key={airliner.airlinerID}
							x1={airliner.labels?.labelAnchor.x}
							y1={airliner.labels?.labelAnchor.y}
							x2={airliner.labels?.labelCoordinates?.x}
							y2={airliner.labels?.labelCoordinates?.y}
							clippingBBox={{
								width: airliner.labels.labelDimensions.width,
								height: airliner.labels.labelDimensions.height 
							}}
							targetBBox={{
								width: Math.max(20, airliner.labels.labelDimensions.width / 4),
								height: airliner.labels.labelDimensions.height 
							}}
							minLength={12}
							strokeWidth={1}
							debug={debugMode}
						/>
					) : null
				)}

				{/* Ghost labels (batch measurement) */}
				{!areLabelsMeasured && (
					<g style={{ opacity: 0, pointerEvents: 'none', position: 'absolute' }}>
						{ghostLabelIDs.map(id => {
							const label = airlinerEntries.get(id)?.labels;
							if (!label) return null;
							return (
								<AirlinerScatterLabel
									key={`measure-${id}`}
									airlinerID={id}
									airlinerLabel={label}
									classNames={`ghost-label-${id}`}
									plotFormat={plotFormat}
									ref={handleLabelRef(id)}
								/>
							);
						})}
					</g>
				)}

				{/* Airliner labels */}
				{areLabelsMeasured && Array.from(airlinerEntries.values()).map((airliner) => {
					const label = airliner.labels;
					if (!label?.labelCoordinates) return null;
					if (label.clusterSize > 2) return null;
					return (
						<AirlinerScatterLabel
							key={airliner.airlinerID}
							airlinerID={airliner.airlinerID}
							airlinerLabel={label}
							plotFormat={plotFormat}
							classNames={`label-${airliner.airlinerID}`}
							debug={debugMode}
						/>
					);
				})}

				{/* Debug: Label bounding boxes */}
				{debugMode && Array.from(airlinerEntries.values()).map((airliner) => {
					if (!airliner.labels?.labelDimensions) return null;

					// Draw at placed coordinates if available, otherwise at anchor
					return airliner.labels?.labelCoordinates ? (
						<RectCentre
							key={airliner.airlinerID}
							cx={airliner.labels.labelCoordinates.x}
							cy={airliner.labels.labelCoordinates.y}
							width={airliner.labels.labelDimensions.width}
							height={airliner.labels.labelDimensions.height}
							fill="rgba(22, 78, 234, 0.1)"
							stroke="rgb(23, 116, 238)"
							strokeWidth={1}
						/>
					) : airliner.labels.labelAnchor ? (
						<RectCentre
							key={airliner.airlinerID}
							cx={airliner.labels.labelAnchor.x}
							cy={airliner.labels.labelAnchor.y}
							width={airliner.labels.labelDimensions.width}
							height={airliner.labels.labelDimensions.height}
							fill="rgba(0, 204, 255, 0.1)"
							stroke="rgba(0, 204, 255, 0.7)"
							strokeDasharray="4 2"
							strokeWidth={1}
						/>
					) : null;
				})}

				{/* Debug: Cluster bounding boxes */}
				{debugMode && airlinerLabelClusters && (
					<g>
						{Array.from(airlinerLabelClusters.entries()).map(([clusterIndex, cluster]) => {

							if (cluster.labelIDs.length === 1) return null;
							
							const fillColor = 'rgba(100, 237, 166, 0.15)';
							const strokeColor = 'rgba(17, 175, 141, 0.8)';
							
							return (
								<g key={`cluster-${clusterIndex}`}>
									{/* Cluster bounding box */}
									<rect
										x={cluster.position.x}
										y={cluster.position.y}
										width={cluster.dimensions.width}
										height={cluster.dimensions.height}
										fill={fillColor}
										stroke={strokeColor}
										strokeWidth={1}
									/>
									
									{/* Cluster centroid marker */}
									<MarkerPlus
										cx={cluster.centroid.x}
										cy={cluster.centroid.y}
										weight={1}
										fill={strokeColor}
									/>
									
									{/* Cluster label */}
									<text
										x={cluster.position.x + 4}
										y={cluster.position.y - 4}
										fill={strokeColor}
										fontSize={12}
										fontWeight="bold"
									>
										Cluster {clusterIndex} ({cluster.labelIDs.length})
									</text>
								</g>
							);
						})}
					</g>
				)}
				
			</svg>
		</div>
	);
} 