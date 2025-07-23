"use client";

// [IMPORT] React //
import { useMemo, useState, useEffect, useRef } from "react";

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
import RectCross from "../shape/RectCross";
import { Connector } from "@visx/annotation";

// [IMPORT] Context providers/hooks //
import { useChartScales } from "@/context/ChartScalesContext";
import { useChartData } from "./AirlinerChart";
import { useChartLayout } from "@/context/ChartLayoutContext";
import { useDebugMode } from "@/context/DebugContext";

// [IMPORT] Utilities //
import { processAirlinerData } from "@/lib/data/airliner-data-processor";
import { getAirlinerMarkers, getAirlinerMarkerExtents, getAirlinerMarkerY } from "@/lib/data/process-airliner-markers";
import { measureSVGElement } from "@/lib/utils/measure-svg-elements";
import { calculateChartPlacementBands } from "@/lib/band-placement/chart-bands";
import { calculateBandOccupancy } from "@/lib/band-placement/band-occupancy";
import { calculateBandPlacement } from "@/lib/band-placement/calculate-band-placement";

// [IMPORT] CSS styling //
import plotStyles from "./AirlinerScatterPlot.module.css";
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
 * Receives all layout and scale info from parent.
 */
export default function AirlinerScatterPlot({ 
	width, 
	height,
}: {
	width: number;
	height: number;
}) {
	const { xScaleView, yScaleView } = useChartScales();
	const { xTickGridCount, yTickGridCount } = useChartLayout();
	const data = useChartData();
	const { debugMode } = useDebugMode();
	// Constants for rendering
	const markerSize = 12; // Diameter of the markers
	const markerLineMajorWidth = 4;
	const markerLineMinorWidth = 2;

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

	// Get the airliner markers for each airliner
	const airlinerMarkers = useMemo(() => 
		airlinerData.map((d, index) => getAirlinerMarkers(index, d, xScaleView, yScaleView)), 
		[airlinerData, xScaleView, yScaleView]
	);

	// Calculate bounding boxes for each airliner
	const markerBoundingBoxes = useMemo(() => {
		return airlinerMarkers.map((markers, index) => {
			if (!markers) return null;
			
			// Get class marker extents using existing utility function
			// This gives us the leftmost and rightmost class markers
			const classExtents = getAirlinerMarkerExtents(markers, 'class');
			
			// If no valid class markers, skip this airliner
			if (!classExtents.min || !classExtents.max) {
				return null;
			}
			
			// Calculate Y bounds using marker size
			const markerY = getAirlinerMarkerY(markers);
			const halfSize = markerSize / 2;
			
			// Calculate extents based on requirements:
			// - left extent: smallest available passenger capacity value (minX)
			// - right extent: largest available passenger capacity value (maxX)
			// - vertical extents: calculated through markerSize
			return {
				minX: classExtents.min.x - halfSize, // Left extent with marker size padding
				maxX: classExtents.max.x + halfSize, // Right extent with marker size padding
				minY: markerY - halfSize,            // Top extent
				maxY: markerY + halfSize             // Bottom extent
			};
		}).filter(box => box !== null);
	}, [airlinerMarkers, markerSize]);

	// Consolidated airliner labels entity - contains all label-related data for each airliner
	const airlinerLabels = useMemo(() => {
		const labels = new Map<string, {
			id: string;
			anchor: { x: number; y: number };
			markerRange: { left: number; right: number };
			position: { x: number; y: number };
		}>();

		// Generate airliner IDs (index + ICAO name)
		const airlinerIds = airlinerData.map((d, index) => `${index}-${d.nameICAO}`);

		// Calculate anchor coordinates and initialize label data
		airlinerData.forEach((d, i) => {
			const markers = airlinerMarkers[i];
			if (!markers) return;

			// Get class marker extents
			const classExtents = getAirlinerMarkerExtents(markers, 'class');

			// If no valid class markers, skip this airliner
			if (!classExtents.min || !classExtents.max) {
				return;
			}

			// Calculate the leftmost and rightmost x anchor positions (leftmost and rightmost class markers)
			const xAnchorLeft = classExtents.min.x;
			const xAnchorRight = classExtents.max.x;

			// Calculate the x anchor position:
			// - Default to xAnchorLeft
			// - If xAnchorLeft < 0, clamp to 0
			// - If xAnchorRight < 0, clamp to xAnchorRight
			let xAnchor = xAnchorLeft;
			if (xAnchorRight < 0) {
				xAnchor = xAnchorRight;
			} else if (xAnchorLeft < 0) {
				xAnchor = 0;
			}

			// Calculate the y anchor position (use y from the first class marker)
			const yAnchor = getAirlinerMarkerY(markers);

			const airlinerId = airlinerIds[i];
			labels.set(airlinerId, {
				id: airlinerId,
				anchor: { 
					x: xAnchor, 
					y: yAnchor 
				},
				markerRange: {
					left: classExtents.min.x,
					right: classExtents.max.x
				},
				position: { x: classExtents.min.x, y: yAnchor } // Initial position, will be updated by placement algorithm
			});
		});
		// console.log('airlinerLabels', labels.get('1-A319'));
		return labels;
	}, [airlinerData, airlinerMarkers]);

	// Update label measurements when DOM is ready
	function calculateLabelMeasurements() {
		const measurements = new Map<string, { width: number; height: number }>();

		airlinerLabels.forEach((label, airlinerId) => {
			const index = airlinerData.findIndex((d, i) => `${i}-${d.nameICAO}` === airlinerId);
			if (index !== -1) {
				const measurementKey = `.measured-label-${index}`;
				const measuredDimensions = measureSVGElement(document.querySelector(measurementKey) as SVGElement);

				if (measuredDimensions) {
					measurements.set(airlinerId, measuredDimensions);
				}
			}
		});

		console.log(`calculateLabelMeasurements: Measurements: ${measurements}`);

		// Debug: Measure the first airliner label
		const firstAirlinerLabel = document.querySelector('.measured-label-0') as SVGElement;
		if (firstAirlinerLabel) {
			const measuredDimensions = measureSVGElement(firstAirlinerLabel);
			console.log(`calculateLabelMeasurements: First airliner label measurement: ${measuredDimensions}`);
		}

		return measurements;
	}

	// Separate state for label measurements
	const [labelMeasurements, setLabelMeasurements] = useState<Map<string, { width: number; height: number }>>(new Map());

	// Update label measurements when DOM is ready
	useEffect(() => {
		console.log(`labelMeasurements: Updating label measurements for ${airlinerLabels.size} airliners.`);
		// Log the measurement for the first airliner
		console.log(`labelMeasurements: First airliner measurement: ${labelMeasurements.get('0-A319')}`);
		setLabelMeasurements(calculateLabelMeasurements());
	}, [airlinerData]);

	// Memoise chart placement bands
	const chartPlacementBands = useMemo(() => {
		if (airlinerLabels.size === 0 || labelMeasurements.size === 0) return [];
		const maxLabelHeight = Math.max(...Array.from(labelMeasurements.values()).map(m => m.height));
		const obstacles = airlinerMarkers
			.map((markers) => {
				const classExtents = getAirlinerMarkerExtents(markers, 'class');
				if (!classExtents.min) return null;
				return { position: { x: classExtents.min.x, y: classExtents.min.y }, height: markerSize};
			})
			.filter((o): o is { position: { x: number; y: number }; height: number } => o !== null);
		return calculateChartPlacementBands(
			{ width, height },
			maxLabelHeight,
			maxLabelHeight * 1,
			obstacles,
			2,
			maxLabelHeight
		);
	}, [airlinerLabels, labelMeasurements, airlinerMarkers, markerSize, width, height]);

	// Memoise chart placement bands occupancy
	const chartPlacementBandsOccupancy = useMemo(() => {
		if (chartPlacementBands.length === 0 || markerBoundingBoxes.length === 0) return [];
		return calculateBandOccupancy(
			chartPlacementBands,
			markerBoundingBoxes,
			width,
			height
		);
	}, [chartPlacementBands, markerBoundingBoxes]);

	// Memoise label placement calculation (positions, debug, occupancy)
	const placementResult = useMemo(() => {
		if (airlinerLabels.size === 0 || labelMeasurements.size === 0) return { placements: new Map(), debug: null, occupancy: [], failed: [] };

		// Convert airlinerLabels Map to placement objects array
		const placementObjects = Array.from(airlinerLabels.entries()).map(([airlinerId, label]) => {
			const measurements = labelMeasurements.get(airlinerId) || { width: 200, height: 20 };
			return {
				id: airlinerId,
				anchor: label.anchor,
				position: label.anchor, // Just use anchor for now
				dimensions: measurements
			};
		});

		// Use the average label width and height as the cluster detection radii
		const clusterDetectionRadius = {
			x: Math.max(...Array.from(labelMeasurements.values()).map(m => m.width)) / 3,
			y: Math.max(...Array.from(labelMeasurements.values()).map(m => m.height)) / 3
		};

		return calculateBandPlacement({
			dimensions: { width, height },
			bands: chartPlacementBands,
			occupancy: chartPlacementBandsOccupancy,
			objects: placementObjects,
			clusterDetection: { distance: clusterDetectionRadius },
			strategy: {
				firstPass: {
					modes: ['top-left', 'top', 'left', 'bottom-left', 'bottom'],
					maxDistance: { x: 50, y: 35 },
					offset: { x: 0, y: 0 }
				},
				sweep: {
					horizontal: 'sweep-to-right',
					maxDistance: { x: 50, y: 25 },
					stepFactor: .5,
					verticalSearch: [-1, 1, 0, -2, 2],
					maxIterations: 2,
					xAlign: 'right-anchor'
				}
			}
		});
	}, [airlinerLabels, labelMeasurements, chartPlacementBands, chartPlacementBandsOccupancy]);

	const labelPositions = placementResult.placements;
	const labelPlacementDebug = placementResult.debug;
	const labelPlacementOccupancy = placementResult.occupancy;
	const labelPlacementFailed = placementResult.failed;

	/*
	
	At this point, I'm going to take a break from the coding and address something directly.

	I say this knowing that I'm not a software engineer, and I barely count myself as a developer.
	I am a product designer, though, so this may colour my perspective.

	That is to say, I've decided I really hate TypeScript.
	
	This is specifically directed at you, dear reader, who is reading through this and wondering,
	"gee, Kav, why the hell are you putting so many any[]s in your code? You should know better!"
	
	You know what? Fuck that.

	I understand its purposes on large teams, where the code bases are enormous and you have individual
	developers working on this fragment	of this file belonging to this class in a vast maze of
	architecture that hasn't been properly updated since 1999.

	I also appreciate its ability to type things within a given file, such as this one. Indeed, I like
	it when it's used in this way, because a file like this should stick to one purpose, domain,
	and concern, and the typing keeps me adhering to that.

	But I still hate it. I came in with an open mind and I hate it.

	Why, for instance, does everything have to be so strongly typed when passing data between components
	or utilities? Is not the purpose of clean architecture to ensure that we can keep elements of the
	codebase loosely coupled, and that we can change one thing without having to change everything?
	Or am I mistaken and indeed the point is so that once a type is set that it can never, ever, ever,
	ever be changed? I'm sure that's a great idea for everyone who complains about legacy systems.

	"Documentation as code" -- oh, excellent, because a type defs are such a great form	of documentation.
	Is that how you conduct the rest of your life?

	"Ah, yes, dear, I've sold all our living room furniture and have replaced it with an enormous
	taxidermic specimen of a giraffe. Why are you asking me all these questions? Can't you see the
	form of it,	with four legs and a long neck? You can see what shape it is. What don't you understand?"

	"Oh, so you just hate types." No, types are lovely. Hell, you know I've done stuff in Unity C#, right?
	It's not just "number", but "float", "int", "double", and probably a bunch of others I don't even
	remember. That's fine with me.

	You ever need to charge your phone and you ask your friend for a cable? And they only have that
	shitty Lightning one that breaks and doesn't even work with iPhones anymore? That's what typed
	interfaces are. Oh, sure, maybe it's "safer" so you KNOW that it's a Lightning cable, but deep
	down you know that the reason we all use USB-C is because it's universal and you don't have to
	ask "hey, is it the right shape?"

	Oh, but what of AI? Surely it can help us write better code nowadays, and help you with your miserable
	little type problem? Well, no, of course not, because it doesn't understand architecture, it doesn't
	understand the purpose of the code, and it doesn't understand the context of the code. Prompt it all
	you want, and pretty soon with anything more complex than a single page that just adds two numbers
	together, you'll find you've got crap architecture where everything is importing and exporting from
	every other file in the project along with files still undescribed by science, with all your precious
	type interfaces smeared in pieces across all of them like a fly hit by a windscreen wiper.

	In short, I don't get along with TypeScript.
	
	 */

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
				{airlinerMarkers.map((coords, i) => coords ? (
					<AirlinerScatterLine
						key={`lines-${i}`}
						airlinerMarkers={coords}
						markerSize={markerSize}
						markerLineMajorWidth={markerLineMajorWidth}
						markerLineMinorWidth={markerLineMinorWidth}
					/>
				) : null)}

				{/* Markers */}
				{airlinerMarkers.map((coords, i) => coords ? (
					<AirlinerScatterMarker
						key={`markers-${i}`}
						airlinerMarkers={coords}
						markerSize={markerSize}
					/>
				) : null)}

				{/* Visualise vertical space bands */}
				{debugMode && chartPlacementBands.map((band, i) => (
					<g key={`debug-band-${i}`}>
						<rect
							x={0}
							y={band.top}
							width={width}
							height={band.height}
							fill="none"
							stroke="rgba(0, 150, 90, 0.3)"
							strokeWidth={1}
						/>
						<text
							x={10}
							y={band.top + band.height / 2}
							fill="rgba(0, 150, 90, 0.8)"
							fontSize="12"
							fontWeight="bold"
							dominantBaseline="middle"
						>
							{i}
						</text>
					</g>
				))}

				{/* Visualise label bounding boxes */}
				{debugMode && Array.from(airlinerLabels.entries()).map(([airlinerId, label], i) => {
					const measurements = labelMeasurements.get(airlinerId) || { width: 100, height: 20 };
					const placed = labelPositions.get(airlinerId);
					if (!placed) return null;
					return (
						<RectCross
							key={`debug-box-${i}`}
							x={placed.x - measurements.width / 2}
							y={placed.y - measurements.height / 2}
							width={measurements.width}
							height={measurements.height}
							fill="none"
							stroke="blue"
							strokeWidth={2}
							crossStroke="blue"
							crossStrokeWidth={1}
							crossLines="both"
						/>
					);
				})}

				{/* Label anchor coordinates, for debugging */}
				{debugMode && Array.from(airlinerLabels.values()).map((label, i) => (
					<MarkerCross
						key={`debug-dot-${i}`}
						cx={label.anchor.x}
						cy={label.anchor.y}
						weight={4}
						r={12}
						fill="blue"
						stroke="none"
					/>
				))}

				{/* Visualise marker bounding boxes */}
				{debugMode && markerBoundingBoxes.map((boundingBox, i) => (
					<g key={`debug-marker-box-${i}`}>
						<rect
							x={boundingBox.minX}
							y={boundingBox.minY}
							width={boundingBox.maxX - boundingBox.minX}
							height={boundingBox.maxY - boundingBox.minY}
							fill="rgba(200, 80, 0, 0.5)"
							stroke="rgba(80, 40, 0, 0.8)"
							strokeWidth={2}
						/>
					</g>
				))}

				{/* Visualise clusters (bounding rectangles and centroids) */}
				{debugMode && labelPlacementDebug?.clusters && labelPlacementDebug.clusters.map((cluster: number[], i: number) => {
					if (!Array.isArray(cluster) || cluster.length === 0) return null;
					// Get anchor positions and bounding boxes for this cluster
					const entries = cluster.map(idx => Array.from(airlinerLabels.values())[idx]);
					const anchors = entries.map(entry => entry?.anchor || { x: 0, y: 0 });
					const measurements = entries.map((entry, idx) => labelMeasurements.get(Array.from(airlinerLabels.keys())[cluster[idx]]) || { width: 100, height: 20 });
					// Compute bounding rectangle
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
					// Compute centroid
					const centroid = anchors.reduce((acc, a) => ({ x: acc.x + a.x, y: acc.y + a.y }), { x: 0, y: 0 });
					centroid.x /= anchors.length;
					centroid.y /= anchors.length;
					const isTrueCluster = cluster.length > 1;
					if (!isTrueCluster) return null; // Only render for true clusters

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

				{/* Visualise band occupancy (occupied and available ranges) */}
				{debugMode && labelPlacementOccupancy.map((bandData, bandIndex) => (
					<g key={`debug-band-occupancy-${bandIndex}`}>
						{/* Visualise occupied ranges */}
						{bandData.occupiedRanges.map((range, rangeIndex) => (
							<rect
								key={`debug-occupied-${bandIndex}-${rangeIndex}`}
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

				
				{/* Visualise sweep xSteps as a continuous blue line with tick markers (debug only) */}
				{debugMode && labelPlacementDebug?.sweep && Array.from(airlinerLabels.entries()).map(([airlinerId, label], i) => {
					const xSteps: number[] = labelPlacementDebug.sweep[airlinerId]?.xSteps;
					if (!xSteps || xSteps.length === 0) return null;
					const y = label.anchor.y;
					// Build points string for polyline
					const points = xSteps.map((x: number) => `${x},${y}`).join(' ');
					return (
						<g key={`debug-sweep-line-${i}`}>
							{/* Continuous line */}
							<polyline
								points={points}
								fill="none"
								stroke="blue"
								strokeWidth={1.5}
								opacity={0.7}
							/>
							{/* Tick markers */}
							{xSteps.map((x: number, j: number) => (
								<line
									key={`debug-sweep-tick-${i}-${j}`}
									x1={x}
									y1={y - 4}
									x2={x}
									y2={y + 4}
									stroke="blue"
									strokeWidth={1}
									opacity={0.8}
								/>
							))}
						</g>
					);
				})}

				{/* Labels */}
				{Array.from(airlinerLabels.entries()).map(([airlinerId, label], i) => {
					const airlinerIndex = airlinerData.findIndex((d, idx) => `${idx}-${d.nameICAO}` === airlinerId);
					const anchor = airlinerLabels.get(airlinerId)?.anchor || { x: 0, y: 0 };
					const placed = labelPositions.get(airlinerId) || { x: anchor.x, y: anchor.y };
					
					if (!placed) return null;
					
					return (
						<g key={`label-${i}-${airlinerData[airlinerIndex]?.nameICAO || airlinerId}`}>
							<AirlinerScatterLabel
								airlinerData={airlinerData[airlinerIndex]}
								coords={{
									x: placed.x,
									y: placed.y
								}}
								classNames={`measured-label-${airlinerIndex}`}
							/>

							{/* Debug line from anchor to position */}
							<Connector
								x={anchor.x}
								y={anchor.y}
								dx={placed.x - anchor.x}
								dy={placed.y - anchor.y}
								stroke="blue"
								type="elbow"
								pathProps={{
									opacity: 0.5
								}}
							/>
						</g>
					);
				})}
			</svg>
		</div>
	);
} 