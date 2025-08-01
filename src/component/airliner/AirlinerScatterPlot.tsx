"use client";

// [IMPORT] React //
import React, { useMemo, useRef, useCallback, useEffect } from "react";

// [IMPORT] Internal components //
import AirlinerScatterMarker from './AirlinerScatterMarker';
import AirlinerScatterLine from './AirlinerScatterLine';
import AirlinerScatterLabel from './AirlinerScatterLabel';
import { MarkerPlus } from "../shape/MarkerPlus";
import { MarkerLeader } from "../shape/MarkerLeader";
import { MarkerCross } from "../shape/MarkerCross";
import { GridDots } from "../chart/GridDots";

// [IMPORT] Context providers/hooks //
import { useChartData } from "./AirlinerChart";
import { useDebugMode } from "@/context/DebugModeContext";
import { useAirlinerViewModel } from "@/lib/data/use-airliner-view-model";
import { useResponsiveSVG } from "@/context/ResponsiveSVG";
import { useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";

// [IMPORT] Utilities //
import type { AirlinerModel } from "@/lib/data/airliner-types";

// [IMPORT] CSS styling //
import { RectCentre } from "../shape/RectCentre";
import MarkerBevelLine from "../shape/MarkerBevelLine";

/**
 * AirlinerScatterPlot
 * 
 * MVVM: View. Renders the main chart area and plots data.
 * 
 */
export default function AirlinerScatterPlot() {
	// === Context and chart config ===
	// Retrieve chart scales (x/y), layout config, data, and debug mode from context providers.
	const { width, height } = useResponsiveSVG();
	const { dataScale, viewportScale, view, drag } = useResponsiveChartViewport();
	const data = useChartData() as AirlinerModel[];
	const { debugMode } = useDebugMode();
	const { clearSelection, hoveredAirlinerID, selectedAirlinerID } = useAirlinerSelection();

	// Hide/consolidate labels in clusters larger than this
	const labelClusterThreshold = 3;

	// === ViewModel ===
	const {
		airlinerEntries,		// Map of airliner IDs to their view model data
		airlinerPlotData,		// Plot and placement data for the chart
		batchUpdateLabelDimensions, // Callback for label measurements
		areLabelsMeasured,	// Flag for if all labels have been measured
		plotFormat,				// Formatting options for the plot
		airlinerLabelClusters,	// Cluster detection results
	} = useAirlinerViewModel(data, viewportScale.x, viewportScale.y, width, height, debugMode);

	// === Grid Line Calculation ===
	// Calculate grid lines for hovered/selected airliner
	const activeAirlinerAxisLines = useMemo(() => {
		const activeAirlinerID = selectedAirlinerID || hoveredAirlinerID;
		if (!activeAirlinerID) return null;

		const airliner = airlinerEntries.get(activeAirlinerID);
		if (!airliner?.markerSeries) return null;

		// Determine if this is hover or selection state
		const isSelected = selectedAirlinerID === activeAirlinerID;
		const isHovered = hoveredAirlinerID === activeAirlinerID && !isSelected;

		const lines: Array<{
			x1: number;
			y1: number;
			x2: number;
			y2: number;
			type: 'vertical' | 'horizontal';
			state: 'hovered' | 'selected';
		}> = [];

		// Get all passenger class markers (pax3Class, pax2Class, pax1Class)
		const paxClassMarkers = airliner.markerSeries.markers.filter((marker: import("@/lib/data/airliner-types").AirlinerMarker) =>
			marker.markerClass === 'pax3Class' ||
			marker.markerClass === 'pax2Class' ||
			marker.markerClass === 'pax1Class'
		);

		// Draw vertical lines from each marker to X axis (bottom chart edge)
		paxClassMarkers.forEach((marker: import("@/lib/data/airliner-types").AirlinerMarker) => {
			lines.push({
				x1: marker.markerCoordinates.x,
				y1: marker.markerCoordinates.y,
				x2: marker.markerCoordinates.x,
				y2: height, // Bottom chart edge
				type: 'vertical',
				state: isSelected ? 'selected' : 'hovered'
			});
		});

		// Draw horizontal line from leftmost marker to Y axis (left chart edge)
		if (paxClassMarkers.length > 0) {
			const leftmostMarker = paxClassMarkers.reduce((leftmost: import("@/lib/data/airliner-types").AirlinerMarker, current: import("@/lib/data/airliner-types").AirlinerMarker) =>
				current.markerCoordinates.x < leftmost.markerCoordinates.x ? current : leftmost
			);

			lines.push({
				x1: 0, // Left chart edge
				y1: leftmostMarker.markerCoordinates.y,
				x2: leftmostMarker.markerCoordinates.x,
				y2: leftmostMarker.markerCoordinates.y,
				type: 'horizontal',
				state: isSelected ? 'selected' : 'hovered'
			});
		}

		return lines;
	}, [hoveredAirlinerID, selectedAirlinerID, airlinerEntries, height]);

	// === Batch label measurement logic ===
	// ghostLabelIDs is an array of airliner IDs that have not yet been measured
	const ghostLabelIDs = useMemo(() =>
		Array.from(airlinerEntries.values())
			.filter(a => a.labels?.labelAnchor && a.labels?.labelDimensions === null)
			.map(a => a.airlinerID),
		[airlinerEntries]
	);

	useEffect(() => {
		// console.log(`[AirlinerScatterPlot] Ghost labels to be rendered: ${ghostLabelIDs.length}`);
	}, [ghostLabelIDs]);

	// pendingLabelDimensions is a map of airliner IDs to their dimensions
	const pendingLabelDimensions = useRef(new Map());

	// handleLabelRef is a callback that is used to measure the dimensions of a label
	// It will only call batchUpdateLabelDimensions once all ghost labels have been measured
	const handleLabelRef = useCallback((airlinerID: string) => (el: SVGGElement | null) => {
		if (el) {
			const bbox = el.getBBox();

			// Add arbitrary padding to the width and height
			pendingLabelDimensions.current.set(airlinerID, {
				width: bbox.width + plotFormat.labelPadding * 2 + plotFormat.labelMargin * 2,
				height: bbox.height + plotFormat.labelPadding * 2 + plotFormat.labelMargin * 2
			});

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
			<div className="chartArea">
				<p>Loading chart...</p>
			</div>
		);
	}

	// Render SVG chart
	return (
		<g>
			{/* Grid intersection dots */}
			<GridDots
				xScale={viewportScale.x}
				yScale={viewportScale.y}
				width={width}
				height={height}
				numTicks={10}
				radius={4}
				className="gridIntersectionDot"
			/>

			{/* Airliner grid lines - drawn from markers to chart edges */}
			{activeAirlinerAxisLines && (
				<g className="airlinerGridLines">
					{activeAirlinerAxisLines.map((line, index) => (
						<line
							key={`grid-line-${index}`}
							x1={line.x1}
							y1={line.y1}
							x2={line.x2}
							y2={line.y2}
							className={`airlinerGridLine airlinerGridLine${line.type.charAt(0).toUpperCase() + line.type.slice(1)} airlinerGridLine${line.state.charAt(0).toUpperCase() + line.state.slice(1)}`}
						/>
					))}
				</g>
			)}
			
			{/* Chart area draggable area with selection clearing */}
			<rect
				x={0}
				y={0}
				width={width}
				height={height}
				fill="transparent"
				{...drag.bindGestures({ dragAxis: 'both', wheelAxis: 'both' })}
				onClick={(event) => {
					// Clear selection when clicking on empty chart area
					// Only if not clicking on an interactive element
					if (event.target === event.currentTarget) {
						clearSelection();
					}
				}}
				onKeyDown={(event) => {
					// Clear selection on Escape key
					if (event.key === 'Escape') {
						clearSelection();
					}
				}}
				style={{ cursor: 'move', touchAction: 'none' }}
				tabIndex={0} // Make focusable for keyboard events
				data-chart-viewport="true"
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
						pointerEvents="none"
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
							pointerEvents="none"
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
						airlinerID={airliner.airlinerID}
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
			{Array.from(airlinerEntries.values()).map((airliner) => {
				const label = airliner.labels;
				if (!label?.labelAnchor || !label?.labelCoordinates) return null;
				if (label.clusterSize && label.clusterSize > labelClusterThreshold) return null;
				
				return (
					<MarkerLeader
						key={airliner.airlinerID}
						x1={label.labelAnchor.x}
						y1={label.labelAnchor.y}
						x2={label.labelCoordinates.x}
						y2={label.labelCoordinates.y}
						clippingBBox={{
							width: label.labelDimensions.width,
							height: label.labelDimensions.height 
						}}
						targetBBox={{
							width: Math.max(20, label.labelDimensions.width / 2),
							height: label.labelDimensions.height 
						}}
						minLength={12}
						className="markerLeader"
						debug={debugMode}
					/>
				);
			})}

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
				if (label.clusterSize > labelClusterThreshold) return null;
				return (
					<AirlinerScatterLabel
						key={airliner.airlinerID}
						airlinerID={airliner.airlinerID}
						airlinerLabel={label}
						classNames={`label-${airliner.airlinerID}`}
						debug={debugMode}
					/>
				);
			})}

			{/* Debug: Label bounding boxes */}
			{debugMode && Array.from(airlinerEntries.values()).map((airliner) => {
				const label = airliner.labels;
				if (!label?.labelDimensions) return null;
				if (label.clusterSize && label.clusterSize > labelClusterThreshold) return null;

				// Draw at placed coordinates if available, otherwise at anchor
				return label.labelCoordinates ? (
					<RectCentre
						key={airliner.airlinerID}
						cx={label.labelCoordinates.x}
						cy={label.labelCoordinates.y}
						width={label.labelDimensions.width}
						height={label.labelDimensions.height}
						fill="rgba(22, 78, 234, 0.1)"
						stroke="rgb(23, 116, 238)"
						strokeWidth={1}
					/>
				) : label.labelAnchor ? (
					<RectCentre
						key={airliner.airlinerID}
						cx={label.labelAnchor.x}
						cy={label.labelAnchor.y}
						width={label.labelDimensions.width}
						height={label.labelDimensions.height}
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

						if (cluster.labelIDs.length <= labelClusterThreshold) return null;
						
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
		</g>
	);
} 