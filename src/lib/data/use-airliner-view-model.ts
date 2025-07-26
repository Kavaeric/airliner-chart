"use client";

import { scaleLinear } from "@visx/scale";
import { useCallback, useEffect, useMemo, useState } from "react";

// [IMPORT] Types/interfaces //
import type { AirlinerData, AirlinerLabel, AirlinerModel, AirlinerMarkerSeries } from "@/lib/data/airliner-types";
import type { Obstacle, PlacementBand } from "@/lib/band-placement/chart-bands";
import type { BandOccupancy } from "@/lib/band-placement/band-occupancy";
import type { PlacementObject } from "@/lib/band-placement/calculate-band-placement";

// [IMPORT] Utilities //
import { plotAirlinerMarkerSeries, plotLabelAnchor } from "@/lib/data/plot-airliner-markers";
import { calculateChartPlacementBands } from "@/lib/band-placement/chart-bands";
import { calculateBandOccupancy } from "@/lib/band-placement/band-occupancy";
import { calculateBandPlacement } from "@/lib/band-placement/calculate-band-placement";
import { detectClustersWithFlatbush } from "@/lib/band-placement/detect-clusters-with-flatbush";

/**
 * @type {AirlinerPlotData}
 * @description A data object for the airliner plot.
 * 
 * @property {ChartBand[]} chartBands - An array of horizontal bands for placement.
 * @property {Occupancy[]} occupancy - An array of occupancy data for the airliner.
 * @property {any} debugData - Debug data for the airliner.
 * @property {any} airlinerLabelClusters - Cluster detection results for the airliner.
 */
export type AirlinerPlotData = {
	chartBands: PlacementBand[];
	obstacles: Obstacle[];
	occupancy: BandOccupancy[];
	debugData?: any;
	airlinerLabelClusters?: any;
}

/**
 * @type {useAirlinerViewModel}
 * @description Manages the data pipeline for airliner chart visualisation.
 * 
 * This hook acts as a ViewModel, transforming raw airliner data into renderable chart elements
 * while managing the complex dependencies between markers, labels, and placement calculations
 * because we live in React-TypeScript hell and we don't have classes.
 * 
 * Data Pipeline:
 * 1. Raw airliner data -> AirlinerModel entries with computed markers
 * 2. DOM measurements -> label dimensions added to entries  
 * 3. Global placement calculation -> chart bands + individual label positions
 * 4. Final render data -> entries with placement + global debug data
 * 
 * Key Features:
 * - Selective updates: Only recalculates what changed (e.g., markers on zoom, not label measurements)
 * - Batched placement: Waits for enough data before running expensive global calculations
 * - Mixed granularity: Per-airliner data (markers, labels) + global data (bands, occupancy)
 * 
 * @param data - Array of airliner data with unique IDs
 * @param xScaleView - X-axis scale function (triggers marker recalculation on change)
 * @param yScaleView - Y-axis scale function (triggers marker recalculation on change)
 * @param width - The width of the chart
 * @param height - The height of the chart
 * @param debug - Optional debug mode flag
 * 
 * @returns {object} ViewModel interface
 * @returns {Map<string, AirlinerModel>} airlinerEntries - Per-airliner computed data
 * @returns {AirlinerPlotData | null} airlinerPlotData - Global placement results (bands, occupancy)
 * @returns {function} plotFormat - Formatting options for the plot (to be moved somewhere else)
 * @returns {function} updateLabelDimensions - Callback for DOM measurement updates
 * @returns {boolean} areAllLabelsMeasured - Whether all labels have been measured
 */
export function useAirlinerViewModel(
	data: AirlinerData[], 
	xScaleView: any,
	yScaleView: any,
	width: number,
	height: number,
	debug: boolean = false
  ) {

	// Plot visual config
	const plotFormat = useMemo(() => ({
		markerSize: 12,
		markerLineMajorWidth: 4,
		markerLineMinorWidth: 2,
		labelFontSize: 16,
		labelPadding: 4,
		labelMargin: 0
	}), []);
	
	/**
	 * @type {Map<string, AirlinerData>}
	 * @description useMemo that holds raw airliner data, consisting of just the airliner ID
	 * and raw airliner data provided from the ChartDataContext.
	 * 
	 * This needs to be recalculated when:
	 * - The data changes (airlinerData)
	 */
	const airlinerData = useMemo(() => {
		const newData = new Map();
		data.forEach(airliner => {
			newData.set(airliner.airlinerID, airliner);
		});
		return newData;
	}, [data]);

	// State that holds label dimensions
	const [labelDimensions, setLabelDimensions] = useState<Map<string, {width: number, height: number}>>(new Map());
	const [areLabelsMeasured, setAreLabelsMeasured] = useState(false);

	// Callback for batch label measurements
	const batchUpdateLabelDimensions = useCallback((dimensionsMap: Map<string, {width: number, height: number}>) => {
		console.log("[useAirlinerViewModel] batchUpdateLabelDimensions: Updating label dimensions");
		setLabelDimensions(dimensionsMap);
		setAreLabelsMeasured(true);
	}, []);

	/**
	 * @type {Map<string, {markerSeries: AirlinerMarkerSeries, labelAnchor: {x: number, y: number}}>}
	 * @description useMemo that holds marker and label anchor data. Recalculates:
	 * - Marker series, including marker coordinates, lines, and bounding boxes
	 * - Label anchor coordinates
	 * 
	 * This needs to be recalculated when:
	 * - The data changes (airlinerData)
	 * - The xScaleView or yScaleView changes (the user zooms or pans)
	 * - Plot format changes (to be implemented properly)
	 */
	const plotElements = useMemo(() => {
		const newElements = new Map();
		data.forEach(airliner => {
			const newMarkers = plotAirlinerMarkerSeries(airliner.airlinerID, airliner.airlinerData, xScaleView, yScaleView, plotFormat.markerSize);
			const newLabelAnchor = plotLabelAnchor(airliner.airlinerID, newMarkers);
			newElements.set(airliner.airlinerID, {
				markerSeries: newMarkers,
				labelAnchor: newLabelAnchor
			});
		});
		return newElements;
	}, [data, xScaleView, yScaleView, plotFormat]);


	
	/**
	 * @type {AirlinerPlotData}
	 * @description useMemo that holds the airliner plot bands and occupancy data. Recalculates:
	 * - Chart bands
	 * - Occupancy
	 * 
	 * This needs to be recalculated when:
	 * - The plot elements change (plotElements)
	 * - The width or height changes
	 */
	const airlinerPlotBands = useMemo(() => {
		console.log("[useAirlinerViewModel] airlinerPlotBands: Calculating airliner plot bands");
		return plotChartBands(plotElements, width, height);
	}, [plotElements, width, height]);

	

	/**
	 * @type {object}
	 * @description
	 * Memoised calculation for label placement, failed placements, and debug data.
	 * This is separated because it is expensive to compute and should only update when necessary.
	 *
	 * @property {Map<string, PlacementObject>} labelPlacement - Map of label positions
	 * @property {Map<string, PlacementObject>} labelFailed - Map of failed label placements
	 * @property {any} labelDebugData - Debug information
	 *
	 * This useMemo recalculates when:
	 * - The airliner plot bands change (`airlinerPlotBands`)
	 * - The label dimensions change (`labelDimensions`)
	 * - The width or height changes
	 */
	const { labelPlacement, labelFailed, debugData: labelDebugData } = useMemo(() => {

		const newLabelPlacement = calculateLabelPlacement(
			airlinerData,
			plotElements,
			labelDimensions,
			airlinerPlotBands.chartBands,
			airlinerPlotBands.occupancy,
			width,
			height
		);

		if (newLabelPlacement.labelPlacement.size === 0) {
			// console.log("[useAirlinerViewModel] labelPlacement: No labels placed");
			return {
				labelPlacement: new Map(),
				labelFailed: new Map(),
				debugData: null
			};
		} else {
			// console.log("[useAirlinerViewModel] labelPlacement: Labels placed: ", newLabelPlacement.labelPlacement.get("0-A318"));
			return newLabelPlacement;
		}
	}, [airlinerData, plotElements, labelDimensions, airlinerPlotBands, width, height]);



	/**
	 * @type {Map<number, labelCluster> | null}
	 * @description useMemo that holds cluster detection results as a simple storage unit.
	 * 
	 * This needs to be recalculated when:
	 * - The label placement changes (labelPlacement, labelFailed)
	 */
	const airlinerLabelClusters = useMemo(() => {
		// If no labels are placed, return null
		if (labelPlacement.size === 0 && labelFailed.size === 0) {
			return null;
		}

		// Prepare all labels for cluster detection (placed + failed)
		const allLabelsForClustering = [

			// Successfully placed labels
			...Array.from(labelPlacement.values()).map(placement => ({
				id: placement.id,
				anchor: placement.anchor,
				dimensions: placement.dimensions,
				position: placement.placedPosition,
				isPlaced: true
			})),
			// Failed labels (use anchor position for clustering)
			...Array.from(labelFailed.values()).map(failed => ({
				id: failed.id,
				anchor: failed.anchor,
				dimensions: failed.dimensions,
				position: failed.anchor, // Use anchor as position for clustering
				isPlaced: false
			}))
		];

		// Run cluster detection and return the result directly
		return detectLabelClusters(allLabelsForClustering, 4); // Default cluster distance
	}, [labelPlacement, labelFailed]);

	/**
	 * @type {Map<string, number | null>}
	 * @description useMemo that creates a mapping from label ID to cluster ID for efficient lookup.
	 * 
	 * This needs to be recalculated when:
	 * - The cluster detection results change (airlinerLabelClusters)
	 */
	const labelToClusterMap = useMemo(() => {
		if (!airlinerLabelClusters) return new Map<string, number | null>();
		
		const map = new Map<string, number | null>();
		airlinerLabelClusters.forEach((cluster, clusterIndex) => {
			cluster.labelIDs.forEach(labelId => {
				map.set(labelId, clusterIndex);
			});
		});
		return map;
	}, [airlinerLabelClusters]);


	// -- Data Composition -- //

	/**
	 * @type {Map<string, AirlinerModel>}
	 * @description
	 * Compose airlinerEntries from airlinerData, plotElements, and labelDimensions in a single useMemo.
	 * This avoids chained effects or infinite loops: do not use airlinerEntries to update anything.
	 */
	const airlinerEntries = useMemo(() => {
		const entries = new Map();
		airlinerData.forEach((airliner, id) => {

			const plot = plotElements.get(id);
			const dims = labelDimensions.get(id);
			const place = labelPlacement.get(id);
			const clusterID = labelToClusterMap.get(id);

			// Get cluster size for all labels
			let clusterSize: number | null = null;
			if (airlinerLabelClusters) {
				if (clusterID !== null && clusterID !== undefined) {
					const cluster = airlinerLabelClusters.get(clusterID);
					if (cluster) {
						clusterSize = cluster.labelIDs.length;
					}
				}
			}

			entries.set(id, {
				...airliner,
				markerSeries: plot?.markerSeries,
				labels: {
					...(airliner.labels ?? {}),
					labelText: airliner.airlinerData.nameCommon ?? "",
					labelAnchor: plot?.labelAnchor,
					labelDimensions: dims ?? (airliner.labels?.labelDimensions ?? null),
					labelCoordinates: place?.placedPosition ?? null,
					clusterID: clusterID ?? null,
					clusterSize: clusterSize
				}
			});
		});
		return entries;
	}, [plotElements, labelDimensions, labelPlacement, labelToClusterMap]);
	
	useEffect(() => {
		console.log("[useAirlinerViewModel] Airliner entries updated. =================================================");
	}, [airlinerEntries]);


	/**
	 * @type {AirlinerPlotData}
	 * @description
	 * Compose airlinerPlotData from airlinerPlotBands and clusterData into a single useMemo.
	 * This ensures entries are always up-to-date and avoids chained effects or infinite loops.
	 * Do not use airlinerPlotData to update anything.
	 */
	const airlinerPlotData = useMemo(() => {
		return {
			...airlinerPlotBands,
			airlinerLabelClusters
		};
	}, [airlinerPlotBands, airlinerLabelClusters]);

	useEffect(() => {
		console.log("[useAirlinerViewModel] Airliner plot data updated. =================================================");
	}, [airlinerPlotData]);


	return {
		airlinerEntries,
		airlinerPlotData,
		batchUpdateLabelDimensions,
		areLabelsMeasured,
		plotFormat,
		labelPlacement,
		labelFailed,
		airlinerLabelClusters,
		labelDebugData
	};
}

/**
 * @function plotChartBands
 * @description Plots the chart bands for layout.
 *
 * @param {Map<string, {markerSeries: AirlinerMarkerSeries, labelAnchor: {x: number, y: number}}>} plotElements - The plot elements.
 * @param {number} width - The width of the chart.
 * @param {number} height - The height of the chart.
 * @returns {AirlinerPlotData} The chart bands.
 */
function plotChartBands(
	plotElements: Map<
		string,
		{
			markerSeries: AirlinerMarkerSeries,
			labelAnchor: { x: number, y: number }
		}
	>,
	width: number,
	height: number
): AirlinerPlotData {

	// Transform marker series bounding boxes into obstacles
	const markersAsObstacles = Array.from(plotElements.values()).map(entry => {
		return {
			minX: entry.markerSeries?.seriesBBox.x[0],
			maxX: entry.markerSeries?.seriesBBox.x[1],
			minY: entry.markerSeries?.seriesBBox.y[0],
			maxY: entry.markerSeries?.seriesBBox.y[1]
		} as Obstacle;
	});

	// Get the chart bands
	const chartBands = calculateChartPlacementBands(
		{width,	height},	// Dimensions
		28,				// Minimum band height
		28,				// Maximum band height
		markersAsObstacles	// Obstacles
	);

	// Get the band occupancy
	const occupancy = calculateBandOccupancy(
		chartBands,
		markersAsObstacles,
		width,
		height
	);

	return {
		chartBands,
		occupancy,
		obstacles: markersAsObstacles,
	}
}

/**
 * @function calculateLabelPlacement
 * @description Calculates the placement of the labels for the airliners.
 * 
 * @param {Map<string, AirlinerData>} airlinerData - The airliner data.
 * @param {Map<string, {markerSeries: AirlinerMarkerSeries, labelAnchor: {x: number, y: number}}>} plotElements - The plot elements.
 * @param {Map<string, {width: number, height: number}>} labelDimensions - The dimensions of the labels.
 * @param {PlacementBand[]} chartBands - The chart bands.
 * @param {BandOccupancy[]} occupancy - The occupancy of the chart.
 * @param {number} width - The width of the chart. 
 * @param {number} height - The height of the chart.
 * @returns {object} The label placement.
 */
function calculateLabelPlacement(
	airlinerDataMap: Map<string, AirlinerData>,
	plotElementsMap: Map<string, {markerSeries: AirlinerMarkerSeries, labelAnchor: {x: number, y: number}}>,
	labelDimensionsMap: Map<string, {width: number, height: number}>,
	chartBands: PlacementBand[], 
	occupancy: BandOccupancy[],
	width: number, 
	height: number
): {
	labelPlacement: Map<string, PlacementObject>;
	labelFailed: Map<string, PlacementObject>;
	debugData: any;	
} {
	// Compose labels as placement objects
	const labelObjects = Array.from(airlinerDataMap.values()).map(entry => {

		// Get the airliner ID
		const airlinerID = entry.airlinerID;

		// Get the label dimensions
		const labelDimensions = labelDimensionsMap.get(airlinerID);
		if (!labelDimensions) {
			return undefined;
		}

		return {
			id: airlinerID,
			anchor: plotElementsMap.get(airlinerID)?.labelAnchor,
			dimensions: { width: labelDimensions.width, height: labelDimensions.height },
			placedPosition: null
		};
	}).filter(entry => entry !== undefined);

	// Run the placement engine
	const labelPlacement = calculateBandPlacement(
		{
			dimensions: { width, height },
			bands: chartBands,
			occupancy,
			objects: labelObjects as PlacementObject[],
			clusterDetection: { distance: { x: 4, y: 4 } },
			strategy: {
				firstPass: {
					modes: ['top-left', 'left', 'top'],
					maxDistance: { x: 50, y: 40 },
					offset: { x: 0, y: 0 }
				},
				sweep: {
					horizontal: 'sweep-to-right',
					maxDistance: { x: 50, y: 40 },
					stepFactor: .5,
					verticalSearch: [-1, 1, 0],
					maxIterations: 2,
					xAlign: 'left-to-anchor'
				}
			}
		}
	);

	// console.log("[calculateLabelPlacement] labelPlacement:", labelPlacement);

	return {
		labelPlacement: labelPlacement.placements,
		labelFailed: labelPlacement.failed,
		debugData: labelPlacement.debug
	}
}

/**
 * @type {labelCluster}
 * @description A cluster of labels.
 * 
 * @property {number} clusterID - The ID of the cluster.
 * @property {object} centroid - The centroid of the cluster.
 * @property {object} position - The position of the cluster.
 * @property {object} dimensions - The dimensions of the cluster.
 * @property {string[]} labelIDs - The IDs of the labels in the cluster.
 * 
 * @example
 * // A cluster of 3 labels with a centroid at (64, 100), and its bounding box being positioned at (32, 100)
 * // with a width of 300 and a height of 236.
 * const cluster: labelCluster = {
 * 	centroid: { x: 64, y: 100 },
 * 	position: { x: 32, y: 100 },
 * 	dimensions: { width: 300, height: 236 },
 * 	labelIDs: ['0-A318', '0-A319', '0-A320']
 * }
 * 
 * @example
 * // A cluster of 1 label with a centroid at (50, 10), and its bounding box being positioned at (50, 10)
 * // with a width of 100 and a height of 20. This label is isolated: its centroid and position are the same,
 * // and its dimensions are the same as the label's dimensions.
 * const cluster: labelCluster = {
 * 	centroid: { x: 50, y: 10 },
 * 	position: { x: 50, y: 10 },
 * 	dimensions: { width: 100, height: 20 },
 * 	labelIDs: ['0-A318']
 * }
 */
type labelCluster = {
	centroid: { x: number, y: number };
	position: { x: number, y: number };
	dimensions: { width: number, height: number };
	labelIDs: string[];
}

/**
 * Detects clusters of labels/objects based on spatial proximity.
 * 
 * This helper function provides a focused interface for detecting when labels
 * are close enough to each other to potentially cause overlap issues.
 * It uses the existing Flatbush-based clustering infrastructure but provides
 * a richer interface that includes spatial information for each cluster.
 * 
 * @param labels Array of label objects to check for clustering
 *   - id: string (unique identifier)
 *   - anchor: { x: number, y: number } (centre point)
 *   - dimensions: { width: number, height: number }
 * @param clusterDistance The distance within which labels are considered clustered
 *   - If a number, applies to both axes
 *   - If an object {x, y}, allows separate horizontal/vertical distances
 * @returns Map of labelCluster objects keyed by cluster index, where each cluster contains spatial information
 * 
 * @example
 * // Detect clusters in a set of labels
 * const labels = [
 *   { id: 'label1', anchor: {x: 0, y: 0}, dimensions: {width: 50, height: 20} },
 *   { id: 'label2', anchor: {x: 30, y: 10}, dimensions: {width: 50, height: 20} },
 *   { id: 'label3', anchor: {x: 100, y: 100}, dimensions: {width: 50, height: 20} }
 * ];
 * const result = detectLabelClusters(labels, 40);
 * // result: Map {
 * //   0 => { centroid: {x: 15, y: 5}, position: {x: 0, y: 0}, dimensions: {width: 80, height: 30}, labelIDs: ['label1', 'label2'] },
 * //   1 => { centroid: {x: 100, y: 100}, position: {x: 75, y: 90}, dimensions: {width: 50, height: 20}, labelIDs: ['label3'] }
 * // }
 */
export function detectLabelClusters(
	labels: Array<{
		id: string;
		anchor: { x: number; y: number };
		dimensions: { width: number; height: number };
	}>,
	clusterDistance: number | { x: number; y: number } = 20
): Map<number, labelCluster> {
	// Use the existing Flatbush-based clustering infrastructure
	const clusters = detectClustersWithFlatbush(
		labels,
		label => [
			label.anchor.x - label.dimensions.width / 2,
			label.anchor.y - label.dimensions.height / 2,
			label.anchor.x + label.dimensions.width / 2,
			label.anchor.y + label.dimensions.height / 2
		],
		clusterDistance
	);

	// Convert clusters to labelCluster objects with spatial information
	const clusterMap = new Map<number, labelCluster>();
	
	// Process multi-label clusters
	clusters.forEach((cluster, clusterIndex) => {
		// Get the labels in this cluster
		const clusterLabels = cluster.map(index => labels[index]);
		
		// Calculate centroid (average of all label anchor points)
		const centroidX = clusterLabels.reduce((sum, label) => sum + label.anchor.x, 0) / clusterLabels.length;
		const centroidY = clusterLabels.reduce((sum, label) => sum + label.anchor.y, 0) / clusterLabels.length;
		
		// Calculate bounding box
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		
		clusterLabels.forEach(label => {
			const left = label.anchor.x - label.dimensions.width / 2;
			const right = label.anchor.x + label.dimensions.width / 2;
			const top = label.anchor.y - label.dimensions.height / 2;
			const bottom = label.anchor.y + label.dimensions.height / 2;
			
			minX = Math.min(minX, left);
			maxX = Math.max(maxX, right);
			minY = Math.min(minY, top);
			maxY = Math.max(maxY, bottom);
		});
		
		clusterMap.set(clusterIndex, {
			centroid: { x: centroidX, y: centroidY },
			position: { x: minX, y: minY },
			dimensions: { width: maxX - minX, height: maxY - minY },
			labelIDs: clusterLabels.map(label => label.id)
		});
	});
	
	// Find isolated labels and create single-label clusters
	const clusteredIndices = new Set<number>();
	for (const cluster of clusters) {
		for (const index of cluster) {
			clusteredIndices.add(index);
		}
	}
	
	const isolatedLabels = labels
		.map((label, index) => ({ label, index }))
		.filter(({ index }) => !clusteredIndices.has(index));
	
	// Add isolated labels as single-label clusters
	isolatedLabels.forEach(({ label }, index) => {
		const clusterIndex = clusterMap.size + index;
		clusterMap.set(clusterIndex, {
			centroid: { x: label.anchor.x, y: label.anchor.y },
			position: { 
				x: label.anchor.x - label.dimensions.width / 2, 
				y: label.anchor.y - label.dimensions.height / 2 
			},
			dimensions: { width: label.dimensions.width, height: label.dimensions.height },
			labelIDs: [label.id]
		});
	});

	return clusterMap;
}