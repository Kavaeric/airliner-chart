"use client";

// Ignore this file for now, it's deprecated
// @lint-ignore

// [IMPORT] React //
import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from "react";

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

// [IMPORT] Context providers/hooks //
import { useChartScales } from "@/context/ChartScalesContext";
import { useChartData } from "./AirlinerChart";
import { useChartLayout } from "@/context/ChartLayoutContext";
import { useDebugMode } from "@/context/DebugModeContext";

// [IMPORT] Utilities //
import { plotAirlinerMarkerSeries, getAirlinerMarkerExtents, getAirlinerMarkerY } from "@/lib/data/plot-airliner-markers";
import { calculateChartPlacementBands } from "@/lib/band-placement/chart-bands";
import { calculateBandOccupancy } from "@/lib/band-placement/band-occupancy";
import { calculateBandPlacement } from "@/lib/band-placement/calculate-band-placement";
import { Airliner } from '@/lib/data/airliner-types';

// [IMPORT] CSS styling //
import plotStyles from "./AirlinerScatterPlot.module.css";
import labelStyles from "./AirlinerScatterLabel.module.css";
import responsiveStyles from "@/component/ResponsiveSVG.module.css";
import { MarkerCross } from "../shape/MarkerCross";

/**
 * AirlinerScatterPlot Component
 *
 * Renders the main chart area:
 * - Draws gridlines for reference
 * - Plots each airliner with markers, connecting lines, and labels
 * - Renders elements in layers to control z-index ordering
 *
 * Data flow is managed through a multi-stage pipeline:
 * 1. Marker calculation (positions, bounding boxes, anchors)
 * 2. Label measurement (for debug/placement)
 * 3. Placement calculation (label placement, failure, occupancy)
 * 4. Composition of main render data and debug data (per-airliner and global)
 *
 * Receives all layout and scale info from parent.
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
	const data = useChartData() as Airliner[];
	const { debugMode } = useDebugMode();

	// Marker visual config
	const markerSize = 12;
	const markerLineMajorWidth = 4;
	const markerLineMinorWidth = 2;
	const labelFontSize = 14;
	const labelPadding = 4;
	const labelMargin = 0;

	// === Early exit for empty chart ===
	// If chart has no size or no data, show loading state.
	if (width === 0 || height === 0 || data.length === 0) {
		return (
			<div className={plotStyles.chartArea}>
				<p>Loading chart...</p>
			</div>
		);
	}

	// === Plotting pipeline ===
	// 1. Marker calculation for each airliner
	const markerObjects = useMemo(() => {
		const map = new Map();
		data.forEach(airliner => {
			const markerPositions = plotAirlinerMarkerSeries(airliner.idNumber, airliner, xScaleView, yScaleView);
			const classExtents = getAirlinerMarkerExtents(markerPositions, 'class');
			const markerY = getAirlinerMarkerY(markerPositions);
			const halfSize = markerSize / 2;
			const markerBoundingBox =
				classExtents.min && classExtents.max
					? {
						minX: classExtents.min.x - halfSize,
						maxX: classExtents.max.x + halfSize,
						minY: markerY - halfSize,
						maxY: markerY + halfSize
					}
					: null;
			const labelAnchor =
				classExtents.min && classExtents.max
					? {
						x: Math.min(Math.max(classExtents.min.x, 0), classExtents.max.x),
						y: markerY
					}
					: null;
			map.set(airliner.airlinerID, {
				markerPositions,
				markerBoundingBox,
				labelAnchor
			});
		});
		return map;
	}, [data, xScaleView, yScaleView, markerSize]);

	// 2. Label measurement: measure label dimensions for each airliner (used for placement and debug overlays)
	//    - This section tracks the rendered size of each airliner's label in the SVG.
	//    - The measured width/height is used for collision/placement logic and for debug overlays.
	//    - Uses ResizeObserver to reactively update measurements if a label's size changes (e.g., due to font, data, or layout changes).

	// State: Maps airlinerID to an object containing { width, height } of the label's SVG bounding box.
	const [labelMeasurements, setLabelMeasurements] = useState<{ [id: string]: { width: number; height: number } }>({});

	// Ref: Holds a mapping from airlinerID to the actual SVG <g> element for each label.
	//      This allows us to directly access the DOM node for measurement.
	const labelRefs = useRef<{ [airlinerID: string]: SVGGElement | null }>({});

	// Ref callback for measuring label bounding boxes
	const handleLabelRef = (airlinerID: string) => (el: SVGGElement | null) => {
		labelRefs.current[airlinerID] = el;
		if (el) {
			const bbox = el.getBBox();

			// Add padding and margin to the bounding box to get the final dimensions
			const width = bbox.width + labelPadding * 2 + labelMargin * 2;
			const height = bbox.height + labelPadding * 2 + labelMargin * 2;

			setLabelMeasurements(prev => ({
				...prev,
				[airlinerID]: { width, height }
			}));
		}
	};

	// Track if all label measurements are complete
	const [areLabelsMeasured, setAllLabelsMeasured] = useState(false);

	// Whenever labelMeasurements or data changes, check if all labels are measured
	useEffect(() => {
		if (data.length === 0) {
			setAllLabelsMeasured(false);
			return;
		}
		// console.log('labelMeasurements', labelMeasurements);
		const allMeasured = data.every(airliner => !!labelMeasurements[airliner.airlinerID]);
		setAllLabelsMeasured(allMeasured);
	}, [labelMeasurements, data]);

	// Reset label measurements and flag when data changes
	useEffect(() => {
		setLabelMeasurements({});
		setAllLabelsMeasured(false);
	}, [data]);

	// 3. Label objects for placement
	const labelObjects = useMemo(() => {
		return data.map(airliner => {
			const marker = markerObjects.get(airliner.airlinerID);
			const labelMeasurement = labelMeasurements[airliner.airlinerID] || null;
			return {
				id: airliner.airlinerID,
				anchor: marker?.labelAnchor,
				placedPosition: marker?.labelAnchor,
				dimensions: labelMeasurement
			};
		});
	}, [data, markerObjects, labelMeasurements]);

	// 4. markerBoxObstacles for band/occupancy logic
	const markerBoxObstacles = useMemo(() => {
		return Array.from(markerObjects.values())
			.map(obj => obj.markerBoundingBox)
			.filter((box): box is { minX: number, maxX: number, minY: number, maxY: number } => !!box);
	}, [markerObjects]);

	// 5. Placement calculation: only use valid label objects
	const validLabelObjects = useMemo(() => labelObjects.filter(obj => obj.anchor && obj.dimensions), [labelObjects]);

	const placementData = useMemo(() => {
		// Calculate chart bands for label placement
		const maxLabelHeight = Math.max(...validLabelObjects.map(e => e.dimensions?.height || 0), 20);
		const bandObstacles = markerBoxObstacles.map(box => ({
			position: { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 },
			height: box.maxY - box.minY
		}));
		const chartBands = calculateChartPlacementBands(
			{ width, height },
			maxLabelHeight,
			maxLabelHeight,
			bandObstacles
		);
		const occupancy = calculateBandOccupancy(chartBands, markerBoxObstacles, width, height);
		const placementResult = calculateBandPlacement({
			dimensions: { width, height },
			bands: chartBands,
			occupancy,
			objects: validLabelObjects,
			clusterDetection: { distance: { x: 4, y: 4 } },
			strategy: {
				firstPass: {
					modes: ['top-left', 'left', 'top'],
					maxDistance: { x: 50, y: 90 },
					offset: { x: 0, y: 0 }
				},
				sweep: {
					horizontal: 'sweep-to-right',
					maxDistance: { x: 50, y: 90 },
					stepFactor: .5,
					verticalSearch: [-1, 1, 0],
					maxIterations: 2,
					xAlign: 'left-to-anchor'
				}
			}
		});
		// Compose final placement map
		const map = new Map();
		labelObjects.forEach(obj => {
			const placed = placementResult.placements.get(obj.id) || null;
			const failed = placementResult.failed.some((f: any) => f.id === obj.id);
			map.set(obj.id, {
				placement: placed,
				placementFailed: failed,
				placementOccupancy: placementResult.occupancy
			});
		});
		return map;
	}, [labelObjects, validLabelObjects, markerBoxObstacles, width, height]);

	// 6. Compose final data for rendering (merge marker and label data)
	const airlinePlotData = useMemo(() => {
		const map = new Map();
		data.forEach(airliner => {
			const marker = markerObjects.get(airliner.airlinerID);
			const placement = placementData.get(airliner.airlinerID);
			const labelMeasurement = labelMeasurements[airliner.airlinerID] || null;
			map.set(airliner.airlinerID, {
				airlinerID: airliner.airlinerID,
				airlinerData: airliner,
				markerPositions: marker?.markerPositions,
				markerBoundingBox: marker?.markerBoundingBox,
				labelAnchor: marker?.labelAnchor,
				labelDimensions: labelMeasurement,
				placement: placement?.placement?.placement,
				placementFailed: placement?.placementFailed,
				debug: placement?.debug
			});
		});
		return map;
	}, [data, markerObjects, placementData, labelMeasurements]);

	// Compose global debug overlays (bands, occupancy, etc.)
	//    - Repeats band and occupancy calculation for debug overlays
	const airlinerChartDebug = useMemo(() => {
		// chartBands and occupancy are calculated in placementData's useMemo
		// To access them here, recalculate with the same logic
		const placementObjects = data.map(airliner => {
			const marker = markerObjects.get(airliner.airlinerID);
			const labelMeasurement = labelMeasurements[airliner.airlinerID] || null;
			return {
				id: airliner.airlinerID,
				anchor: marker?.labelAnchor,
				position: marker?.labelAnchor,
				dimensions: labelMeasurement,
				markerBoundingBox: marker?.markerBoundingBox
			};
		});
		// Gather marker bounding boxes as obstacles for band placement
		// Each placementObject may have a markerBoundingBox describing the pixel bounds of its markers.
		// We extract all defined bounding boxes to use as obstacles for label band calculation.
		const markerBoxObstacles = placementObjects
			.map(obj => obj.markerBoundingBox) // Extract bounding box (may be undefined)
			.filter(
				(box): box is { minX: number; maxX: number; minY: number; maxY: number } => !!box
			); // Only keep defined boxes

		// Filter placement objects to those eligible for label placement
		// Only objects with both an anchor (desired label position) and measured dimensions (width/height)
		// are considered valid for placement and band calculations.
		const validPlacementObjects = placementObjects.filter(
			obj => obj.anchor && obj.dimensions
		);

		// Determine the maximum label height for band sizing
		// Find the tallest label among all valid placement objects.
		// This value is used to set the vertical size of each band.
		let maxLabelHeight = Math.max(
			...validPlacementObjects.map(e => e.dimensions?.height || 0)
		);

		// Fallback: If no valid heights found, use a default height (20px).
		if (!isFinite(maxLabelHeight) || maxLabelHeight <= 0) maxLabelHeight = 20;

		// Convert marker bounding boxes to band obstacles
		// Each obstacle is represented by its centre position and its height (vertical span).
		// This helps prevent label bands from overlapping with marker areas.
		const bandObstacles = markerBoxObstacles.map(box => ({
			position: {
				x: (box.minX + box.maxX) / 2, // Centre x of bounding box
				y: (box.minY + box.maxY) / 2  // Centre y of bounding box
			},
			height: box.maxY - box.minY // Vertical span of the obstacle
		}));

		// Calculate chart bands for label placement
		// Bands are horizontal regions where labels can be placed.
		// The function takes:
		//   - Chart dimensions ({ width, height })
		//   - Band height (maxLabelHeight)
		//   - Minimum band gap (maxLabelHeight, for now)
		//   - Obstacles (bandObstacles) to avoid
		//   - Band count (3, for now)
		//   - Minimum band height (maxLabelHeight)
		const chartBands = calculateChartPlacementBands(
			{ width, height },     // Chart area dimensions
			maxLabelHeight,        // Minimum band height
			maxLabelHeight,        // Maximum band height
			bandObstacles,         // Obstacles to avoid
		);
		const occupancy = calculateBandOccupancy(chartBands, markerBoxObstacles, width, height);

		// Compose maps for bands and occupancy by band index
		// These are used for debug overlays.
		const bandMap = new Map();
		chartBands.forEach((band, i) => bandMap.set(i, band));
		const occupancyMap = new Map();
		occupancy.forEach((occ, i) => occupancyMap.set(i, occ));
		return {
			chartBands,
			occupancy,
			bandMap,
			occupancyMap
		};
	}, [data, markerObjects, labelMeasurements, width, height]);

	// Compose per-airliner debug data
	//    - Combines all debug info for each airliner for quick lookup
	//    - Access by airlinerID
	const airlinerPlotDebug = useMemo(() => {
		const map = new Map();
		data.forEach(airliner => {
			const marker = markerObjects.get(airliner.airlinerID);
			const placement = placementData.get(airliner.airlinerID);
			map.set(airliner.airlinerID, {
				...airlinePlotData.get(airliner.airlinerID),
				markerBoundingBox: marker?.markerBoundingBox,
				placementOccupancy: placement?.placementOccupancy,
				labelMeasurement: labelMeasurements[airliner.airlinerID] || null,
				debug: placement?.debug
			});
		});
		return map;
	}, [data, markerObjects, placementData, airlinePlotData, labelMeasurements, debugMode]);

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

				{/* Connecting lines between markers for each airliner */}
				{Array.from(airlinePlotData.values()).map((entry, i) => entry.markerPositions ? (
					<AirlinerScatterLine
						key={`lines-${i}`}
						airlinerMarkers={entry.markerPositions}
						markerSize={markerSize}
						markerLineMajorWidth={markerLineMajorWidth}
						markerLineMinorWidth={markerLineMinorWidth}
					/>
				) : null)}

				{/* Markers for each airliner */}
				{Array.from(airlinePlotData.values()).map((entry, i) => entry.markerPositions ? (
					<AirlinerScatterMarker
						key={`markers-${i}`}
						airlinerMarkers={entry.markerPositions}
						markerSize={markerSize}
					/>
				) : null)}

				{/* Visualise vertical space bands (debug, global) */}
				{debugMode && airlinerChartDebug.chartBands.map((band, i) => (
					<g key={`debug-band-${i}`}>
						<rect
							x={0}
							y={band.top}
							width={width}
							height={band.height || 0}
							fill="none"
							stroke="rgba(0, 150, 90, 0.3)"
							strokeWidth={1}
						/>
						<text
							x={10}
							y={(band.top || 0) + (band.height ? band.height / 2 : 0)}
							fill="rgba(0, 150, 90, 0.8)"
							fontSize="12"
							fontWeight="bold"
							dominantBaseline="middle"
						>
							{i}
						</text>
					</g>
				))}

				{/* Label anchor coordinates, for debugging */}
				{debugMode && Array.from(airlinerPlotDebug.values()).map((entry, i) => (
					<MarkerCross
						key={`debug-dot-${i}`}
						cx={entry.labelAnchor?.x || 0}
						cy={entry.labelAnchor?.y || 0}
						weight={4}
						r={12}
						fill="blue"
						stroke="none"
					/>
				))}

				{/* Visualise marker bounding boxes (debug) */}
				{debugMode && Array.from(airlinerPlotDebug.values()).map((entry, i) => (
					
					<g key={`debug-marker-box-${i}`}>
						{entry.markerBoundingBox &&
							<rect
								x={entry.markerBoundingBox.minX}
								y={entry.markerBoundingBox.minY}
								width={(entry.markerBoundingBox.maxX ?? 0) - (entry.markerBoundingBox.minX ?? 0)}
								height={(entry.markerBoundingBox.maxY ?? 0) - (entry.markerBoundingBox.minY ?? 0)}
								fill="rgba(13, 0, 255, 0.5)"
								stroke="rgba(0, 35, 120, 0.8)"
								strokeWidth={2}
							/>
						}
					</g>
				))}

				{/* Visualise clusters (bounding rectangles and centroids) */}
				{debugMode && Array.from(airlinerPlotDebug.values()).map((entry, i) => {
					if (!entry.placement || entry.placementFailed) return null;

					// For single label, skip cluster visualisation
					const anchors = [entry.placement.anchor];
					const measurements = [labelMeasurements[entry.airlinerID] || { width: 100, height: 20 }];

					const rects = anchors.map((a, j) => ({
						minX: a.x - measurements[j].width / 2,
						maxX: a.x + measurements[j].width / 2,
						minY: a.y - measurements[j].height / 2,
						maxY: a.y + measurements[j].height / 2
					}));
					const minX = Math.min(...rects.map(r => r.minX));
					const maxX = Math.max(...rects.map(r => r.maxX));
					const minY = Math.min(...rects.map(r => r.minY));
					const maxY = Math.max(...rects.map(r => r.maxY));
					const centroid = anchors.reduce((acc, a) => ({ x: acc.x + a.x, y: acc.y + a.y }), { x: 0, y: 0 });
					centroid.x /= anchors.length;
					centroid.y /= anchors.length;
					const isTrueCluster = anchors.length > 1;
					if (!isTrueCluster) return null;

					return (
						<g key={`debug-cluster-${i}`}>
							<rect
								x={minX}
								y={minY}
								width={maxX - minX}
								height={maxY - minY}
								fill="rgba(0, 255, 191, 0.2)"
								stroke="teal"
								strokeWidth={2}
							/>
							<MarkerPlus
								cx={centroid.x}
								cy={centroid.y}
								weight={1}
								r={10}
								fill={"teal"}
							/>
							<text
								x={minX}
								y={minY - 8}
								fontSize={14}
								fontWeight="bold"
								fill="teal"
								textAnchor="start"
							>
								{`C${i + 1}: ${anchors.length} labels`}
							</text>
						</g>
					);
				})}

				{/* Visualise band occupancy (debug, global) */}
				{debugMode && airlinerChartDebug.occupancy.map((bandData, i) => (
					<g key={`debug-band-occupancy-${i}`}>
						{bandData.occupiedRanges && bandData.band && bandData.occupiedRanges.map((range: any, rangeIndex: number) => (
							<rect
								key={`debug-occupied-${i}-${rangeIndex}`}
								x={range.start}
								y={bandData.band.top}
								width={range.width}
								height={bandData.band.height}
								fill="rgba(255, 0, 0, 0.2)"
								stroke="rgba(255, 0, 0, 0.4)"
								strokeWidth={1}
							/>
						))}
					</g>
				))}

				{/* Visualise label placement occupancy (debug) */}
				{debugMode && Array.from(airlinerPlotDebug.values()).map((entry, i) => {
					if (!entry.labelAnchor) return null;
					const placed = entry.placement ? { x: entry.placement.x, y: entry.placement.y } : entry.labelAnchor;
					const failed = entry.placementFailed;
					const label = entry.labelMeasurement || { width: 60, height: 16 };
					return (
						<rect
							key={`debug-label-occupancy-${i}`}
							x={placed.x - label.width / 2}
							y={placed.y - label.height / 2}
							width={label.width}
							height={label.height}
							fill={failed ? "rgba(255, 0, 234, 0.1)" : "rgba(0,0,255,0.2)"}
							stroke={failed ? "rgba(255, 0, 153, 0.2)" : "rgba(0,0,255,0.4)"}
							strokeDasharray={failed ? "4, 4" : "0"}
							strokeWidth={1}
							style={{ pointerEvents: 'none' }}
						/>
					);
				})}

				{/* Ghost measurement labels (hidden, for measurement only) */}
				{/* Only render ghost labels until all label measurements are available */}
				{!areLabelsMeasured && (
					<g style={{ opacity: 0, pointerEvents: 'none', position: 'absolute' }}>
						{data.map((airliner) => {
							const entry = airlinePlotData.get(airliner.airlinerID);
							if (!entry || !entry.labelAnchor) return null;
							return (
								<AirlinerScatterLabel
									key={`measure-${airliner.airlinerID}`}
									airlinerData={airliner}
									coords={entry.labelAnchor}
									classNames={`ghost-label-${airliner.airlinerID}`}
									ref={handleLabelRef(airliner.airlinerID)}
									textSize={labelFontSize}
								/>
							);
						})}
					</g>
				)}

				{/* Labels for each airliner, placed according to placement algorithm */}
				{data.map((airliner, i) => {
					const entry = airlinePlotData.get(airliner.airlinerID);
					if (!entry) return null;
					if (!entry.labelAnchor) return null;
					if (!entry.placement) return null;

					if (entry.placementFailed) return null;

					return (
						<g key={`label-${i}-${airliner.nameICAO || airliner.airlinerID}`}>
							<AirlinerScatterLabel
								airlinerData={airliner}
								coords={entry.placement}
								classNames={`label-${airliner.airlinerID}`}
								textSize={labelFontSize}
							/>
							<MarkerLeader
								x1={entry.labelAnchor.x}
								y1={entry.labelAnchor.y}
								x2={entry.placement.x}
								y2={entry.placement.y}
								clippingBBox={entry.labelDimensions}
								targetBBox={{
									width: entry.labelDimensions.width / 2,
									height: entry.labelDimensions.height
								}}
								minLength={12}
								angleStep={45}
								stroke="grey"
								strokeWidth={1}
								opacity={0.5}
							/>
						</g>
					);
				})}

				{/* Debug text showing label placements */}
				{debugMode && (
					<text
						x={20}
						y={20}
						fontSize={16}
						fill="black"
					>
						{`Placed ${Array.from(airlinePlotData.values()).filter(e => !e.placementFailed).length} out of ${airlinePlotData.size} labels, `}
						{`ghost rendering ${typeof window !== "undefined" ? document.querySelectorAll('[class*="measured-label"]').length : 0}`}
					</text>
				)}
			</svg>
		</div>
	);
} 