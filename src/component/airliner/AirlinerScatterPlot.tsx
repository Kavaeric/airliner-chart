"use client";

// [IMPORT] React //
import React, { useMemo, useRef, useCallback, useEffect, useState } from "react";

// [IMPORT] Internal components //
import AirlinerScatterMarker from './AirlinerScatterMarker';
import AirlinerScatterLine from './AirlinerScatterLine';
import AirlinerScatterLabel from './AirlinerScatterLabel';
import AirlinerGridLines from './AirlinerGridLines';
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
import { useProximityDetection } from "@/lib/hooks/use-proximity-detection";

// [IMPORT] Utilities //
import type { AirlinerModel } from "@/lib/data/airliner-types";

// [IMPORT] CSS styling //
import { RectCentre } from "../shape/RectCentre";

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
	const { dataScale, viewportScale, view, drag, mouse } = useResponsiveChartViewport();
	const data = useChartData() as AirlinerModel[];
	const { debugMode } = useDebugMode();
	const { clearSelection, hoveredAirlinerID, selectedAirlinerID, setHoveredAirliner, setSelectedAirliner } = useAirlinerSelection();

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

	// === Proximity Detection ===
	// 
	// Combine all interactive elements for proximity detection
	// This includes airliner lines, labels, and clusters for comprehensive interaction
	const allElements = useMemo(() => [
		// Airliner lines - for hovering over the actual data lines
		// These provide the primary interaction area for airliner data
		...Array.from(airlinerEntries.values()).map(airliner => ({ 
			type: 'airliner', 
			data: airliner 
		})),
		// Airliner labels - for hovering over the text labels
		// These provide additional interaction areas for label-specific interactions
		...Array.from(airlinerEntries.values()).map(airliner => ({ 
			type: 'label', 
			data: airliner 
		})),
		// Label clusters - for hovering over clusters of unrendered labels
		// These allow interaction with clusters to potentially expand them in the future
		...(airlinerLabelClusters ? Array.from(airlinerLabelClusters.entries()).map(entry => ({ 
			type: 'cluster', 
			data: entry 
		})) : [])
	], [airlinerEntries, airlinerLabelClusters]);

	// Unified accessor that handles all element types for proximity detection
	// This provides a consistent interface for extracting bounds, IDs, and visibility
	const unifiedAccessors = {
		/**
		 * Extract bounding box from an element
		 * 
		 * Defines the interactive area for each element type:
		 * - Airliner lines: Use the marker series bounding box
		 * - Labels: Use the label's placed coordinates and dimensions
		 * - Clusters: Use the cluster's position and dimensions
		 */
		getBounds: (element: any): any => {
			switch (element.type) {
				case 'airliner':
					// Use marker series bounding box for airliner lines
					// This encompasses the entire line from start to end marker
					if (element.data.markerSeries) {
						return element.data.markerSeries.seriesBBox;
					}
					return { x: [0, 0], y: [0, 0] };
					
				case 'label':
					// Use label bounding box based on placed coordinates
					const { labelCoordinates, labelDimensions } = element.data.labels;
					if (!labelCoordinates || !labelDimensions) {
						return { x: [0, 0], y: [0, 0] };
					}
					const { x, y } = labelCoordinates;
					const { width, height } = labelDimensions;
					return {
						x: [x - width/2, x + width/2],
						y: [y - height/2, y + height/2]
					};
					
				case 'cluster':
					// Use cluster bounding box for cluster interaction
					const [index, cluster] = element.data;
					return {
						x: [cluster.position.x, cluster.position.x + cluster.dimensions.width],
						y: [cluster.position.y, cluster.position.y + cluster.dimensions.height]
					};
					
				default:
					return { x: [0, 0], y: [0, 0] };
			}
		},
		
		/**
		 * Get unique identifier for an element
		 * 
		 * Used to identify which element was detected and for state management.
		 * Returns the airliner ID for lines and labels, cluster index for clusters.
		 */
		getId: (element: any): string => {
			switch (element.type) {
				case 'airliner':
					return element.data.airlinerID;
				case 'label':
					return element.data.airlinerID;
				case 'cluster':
					const [index, cluster] = element.data;
					return `cluster-${index}`;
				default:
					return 'unknown';
			}
		},
		
		/**
		 * Check if element should be considered for proximity detection
		 * 
		 * Filters out elements that shouldn't be interactive:
		 * - Airliner lines: Only if they have marker data and labels are rendered
		 * - Labels: Only if they have coordinates and aren't in large clusters
		 * - Clusters: Only if they're larger than the threshold (unrendered labels)
		 */
		isVisible: (element: any): boolean => {
			switch (element.type) {
				case 'airliner':
					// Only show airliners whose labels are being rendered
					// This prevents interaction with airliners that are part of large clusters
					const isLabelRendered = !element.data.labels?.clusterSize || 
										   element.data.labels.clusterSize <= labelClusterThreshold;
					return element.data.markerSeries && isLabelRendered;
					
				case 'label':
					// Only show labels that are being rendered (not in large clusters)
					const isLabelRendered2 = !element.data.labels?.clusterSize || 
											element.data.labels.clusterSize <= labelClusterThreshold;
					return element.data.labels?.labelCoordinates && isLabelRendered2;
					
				case 'cluster':
					// Only show clusters that are larger than threshold (unrendered labels)
					// This allows interaction with clusters to potentially expand them
					const [index, cluster] = element.data;
					return cluster.labelIDs.length > labelClusterThreshold;
					
				default:
					return false;
			}
		},
		
		/**
		 * Get the type/category of an element
		 * 
		 * Used for debugging and conditional logic in the proximity detection system.
		 */
		getType: (element: any): string => {
			switch (element.type) {
				case 'airliner':
					return 'line';
				case 'label':
					return 'label';
				case 'cluster':
					return 'cluster';
				default:
					return 'unknown';
			}
		}
	};

	// Initialise proximity detection with unified accessors
	const proximityDetection = useProximityDetection(
		allElements,
		unifiedAccessors,
		{
			maxDistance: 20, // Maximum distance for proximity detection
			onTargetChange: (target) => {
				// Update hovered airliner based on nearest target
				// Only set hover for lines and labels, not clusters
				if (target && target.type !== 'cluster') {
					setHoveredAirliner(target.id);
				} else {
					setHoveredAirliner(null);
				}
			}
		}
	);

	// === Mouse Event Handlers ===
	// 
	// Centralised mouse event handling that integrates proximity detection
	// with chart viewport management and selection functionality
	
	/**
	 * handleMouseMove
	 * 
	 * Handles mouse movement within the chart area.
	 * Updates proximity detection, chart viewport mouse coordinates, and cursor styling.
	 */
	const handleMouseMove = useCallback((event: React.MouseEvent) => {
		// Use proximity detection handlers for hover detection
		proximityDetection.handlers.onMouseMove(event);
		
		// Update mouse coordinates for the chart viewport
		mouse.updateCoordinates(event, event.currentTarget);
	}, [proximityDetection, mouse]);

	/**
	 * handleMouseEnter
	 * 
	 * Handles mouse entering the chart area.
	 * Initialises proximity detection and chart viewport mouse coordinates.
	 */
	const handleMouseEnter = useCallback((event: React.MouseEvent) => {
		// Use proximity detection handlers for hover detection
		proximityDetection.handlers.onMouseEnter(event);
		
		// Update mouse coordinates for the chart viewport
		mouse.updateCoordinates(event, event.currentTarget);
	}, [proximityDetection, mouse]);

	/**
	 * handleMouseLeave
	 * 
	 * Handles mouse leaving the chart area.
	 * Clears proximity detection state and chart viewport mouse coordinates.
	 */
	const handleMouseLeave = useCallback(() => {
		// Use proximity detection handlers to clear hover state
		proximityDetection.handlers.onMouseLeave();
	}, [proximityDetection]);

	/**
	 * handleClick
	 * 
	 * Handles mouse clicks within the chart area.
	 * Manages selection state based on what was clicked.
	 */
	const handleClick = useCallback((event: React.MouseEvent) => {
		// Check if we have a current target from proximity detection
		if (proximityDetection.nearestTarget && proximityDetection.nearestTarget.type !== 'cluster') {
			// Clicked on an interactive element - select it
			const airlinerID = proximityDetection.nearestTarget.id;
			
			// Toggle selection if clicking on already selected airliner
			if (selectedAirlinerID === airlinerID) {
				clearSelection();
			} else {
				// Select the new airliner
				setSelectedAirliner(airlinerID);
			}
		} else {
			// Clicked on empty chart area - clear selection
			clearSelection();
		}
	}, [proximityDetection, selectedAirlinerID, clearSelection, setSelectedAirliner]);

	/**
	 * handleKeyDown
	 * 
	 * Handles keyboard events within the chart area.
	 * Provides keyboard shortcuts for selection management.
	 */
	const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
		switch (event.key) {
			case 'Escape':
				// Clear selection on Escape key
				clearSelection();
				break;
			case 'Enter':
			case ' ':
				// Select currently hovered airliner on Enter or Space
				if (hoveredAirlinerID && hoveredAirlinerID !== selectedAirlinerID) {
					setSelectedAirliner(hoveredAirlinerID);
				}
				break;
		}
	}, [hoveredAirlinerID, selectedAirlinerID, clearSelection, setSelectedAirliner]);


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

			{/* Airliner grid lines - drawn from markers across entire plot area */}
			<AirlinerGridLines
				hoveredAirlinerID={hoveredAirlinerID}
				selectedAirlinerID={selectedAirlinerID}
				airlinerEntries={airlinerEntries}
				width={width}
				height={height}
			/>
			
			{/* Chart area draggable area with comprehensive interaction handling */}
			<rect
				x={0}
				y={0}
				width={width}
				height={height}
				fill="transparent"
				{...drag.bindGestures({ dragAxis: 'both', wheelAxis: 'both', enablePinch: true })}
				// onMouseMove={handleMouseMove}
				// onMouseEnter={handleMouseEnter}
				// onMouseLeave={handleMouseLeave}
				// onClick={handleClick}
				// onKeyDown={handleKeyDown}
				style={{ 
					cursor: proximityDetection.nearestTarget && proximityDetection.nearestTarget.type !== 'cluster' 
						? 'pointer' 
						: 'move', 
					touchAction: 'none',
					/* === Browser Interaction Feedback Suppression === */
					outline: 'none', /* Suppress Chrome desktop white outline */
					WebkitTapHighlightColor: 'transparent', /* Suppress Chrome mobile blue tap highlight */
					userSelect: 'none', /* Prevent text selection */
					WebkitUserSelect: 'none', /* Safari/Chrome */
					MozUserSelect: 'none', /* Firefox */
					msUserSelect: 'none', /* IE/Edge */
					/* Suppress any default browser styling */
					WebkitAppearance: 'none',
					MozAppearance: 'none',
					appearance: 'none'
				}}
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

				// Determine interactive state classes
				const isHovered = airliner.airlinerID === hoveredAirlinerID;
				const isSelected = airliner.airlinerID === selectedAirlinerID;
				const leaderClassNames = [
					"markerLeader",
					isHovered ? "hoveredAirliner" : "",
					isSelected ? "selectedAirliner" : ""
				].filter(Boolean).join(" ");

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
						startOffset={plotFormat.markerSize / -2}
						endOffset={plotFormat.labelPadding / 2}
						minLength={12}
						className={leaderClassNames}
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
						style={{ pointerEvents: 'none' }}
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
				<g style={{ pointerEvents: 'none' }}>
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

			{/* Interaction Debug Visualization */}
			{debugMode && proximityDetection.mousePosition && proximityDetection.nearestTarget && (
				<g style={{ pointerEvents: 'none' }}>
					{/* Mouse cursor indicator */}
					<circle
						cx={proximityDetection.mousePosition.x}
						cy={proximityDetection.mousePosition.y}
						r={4}
						fill="red"
						stroke="white"
						strokeWidth={2}
						style={{ pointerEvents: 'none' }}
					/>
					
					{/* Line from mouse to nearest target */}
					<line
						x1={proximityDetection.mousePosition.x}
						y1={proximityDetection.mousePosition.y}
						x2={proximityDetection.nearestTarget.coordinates.x}
						y2={proximityDetection.nearestTarget.coordinates.y}
						stroke={proximityDetection.nearestTarget.type === 'line' ? 'blue' : proximityDetection.nearestTarget.type === 'cluster' ? 'orange' : 'red'}
						strokeWidth={2}
						strokeDasharray="4 2"
						style={{ pointerEvents: 'none' }}
					/>
					
					{/* Target indicator - different style for each type */}
					<circle
						cx={proximityDetection.nearestTarget.coordinates.x}
						cy={proximityDetection.nearestTarget.coordinates.y}
						r={proximityDetection.nearestTarget.type === 'line' ? 4 : proximityDetection.nearestTarget.type === 'cluster' ? 8 : 6}
						fill="transparent"
						stroke={proximityDetection.nearestTarget.type === 'line' ? 'blue' : proximityDetection.nearestTarget.type === 'cluster' ? 'orange' : 'red'}
						strokeWidth={3}
						strokeDasharray={proximityDetection.nearestTarget.type === 'cluster' ? '2 2' : 'none'}
					/>
					
					{/* Debug information panel */}
					<rect
						x={4}
						y={4}
						width={300}
						height={80}
						fill="rgba(0, 0, 0, 0.8)"
						rx={4}
						style={{ pointerEvents: 'none' }}
					/>
					
					{/* Mouse position text */}
					<text
						x={12}
						y={20}
						fill="white"
						fontSize={12}
						fontWeight="bold"
						style={{ pointerEvents: 'none' }}
					>
						Mouse: ({proximityDetection.mousePosition.x.toFixed(0)}, {proximityDetection.mousePosition.y.toFixed(0)})
					</text>
					
					{/* Target info text */}
					<text
						x={12}
						y={36}
						fill={proximityDetection.nearestTarget.type === 'line' ? '#4A90E2' : proximityDetection.nearestTarget.type === 'cluster' ? '#F5A623' : '#D0021B'}
						fontSize={12}
						fontWeight="bold"
						style={{ pointerEvents: 'none' }}
					>
						Nearest: {proximityDetection.nearestTarget.type} ({proximityDetection.nearestTarget.id})
					</text>
					
					{/* Distance text */}
					<text
						x={12}
						y={52}
						fill={proximityDetection.nearestTarget.type === 'line' ? '#4A90E2' : proximityDetection.nearestTarget.type === 'cluster' ? '#F5A623' : '#D0021B'}
						fontSize={12}
						fontWeight="bold"
						style={{ pointerEvents: 'none' }}
					>
						Distance: {proximityDetection.nearestTarget.distance.toFixed(1)}px
					</text>
					
					{/* Selection state text */}
					<text
						x={12}
						y={68}
						fill="white"
						fontSize={12}
						fontWeight="bold"
						style={{ pointerEvents: 'none' }}
					>
						Hovered: {hoveredAirlinerID || 'none'} | Selected: {selectedAirlinerID || 'none'}
					</text>
				</g>
			)}
		</g>
	);
} 