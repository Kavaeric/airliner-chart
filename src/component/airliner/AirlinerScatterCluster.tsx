"use client";

// [IMPORT] React //
import React from "react";

// [IMPORT] Internal components //
import { RectCentre } from "../shape/RectCentre";
import { MarkerPlus } from "../shape/MarkerPlus";

// [IMPORT] Types //
import type { labelCluster } from "@/lib/hooks/use-airliner-view-model";

// [IMPORT] Context hooks //
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";

/**
 * AirlinerScatterCluster
 * 
 * Renders a single cluster visualisation for a group of airliner labels that are too close together.
 * Shows a bounding box and centre marker for the cluster.
 * 
 * @param clusterIndex - The index of the cluster
 * @param cluster - The cluster data
 */
interface AirlinerScatterClusterProps {
	clusterIndex: number;
	cluster: labelCluster;
}

export default function AirlinerScatterCluster({
	clusterIndex,
	cluster
}: AirlinerScatterClusterProps) {
	// === Selection State Management ===
	// Access airliner selection context for visual state only
	// Interaction logic is handled centrally in AirlinerScatterPlot
	const { selectedClusterIndex, hoveredClusterIndex } = useAirlinerSelection();

	// === Visual State Calculation ===
	// Determine visual state based on selection context
	const isHovered = hoveredClusterIndex === clusterIndex;
	const isSelected = selectedClusterIndex === clusterIndex;

	return (
		<g
			key={`cluster-${clusterIndex}`}
			className="airlinerCluster"
			style={{
				pointerEvents: 'none',
				transform: `translate(${cluster.position.x}px, ${cluster.position.y}px)`
			}}
		>
			{/* Cluster bounding box */}
			<RectCentre
				cx={0}
				cy={0}
				width={120}
				height={60}
				strokeWidth={1}
				className={`clusterBoundingBox ${
					isSelected ? 'selectedCluster' : ''
				} ${isHovered ? 'hoveredCluster' : ''}`}
			/>

			{/* Cluster centre marker */}
			<MarkerPlus
				cx={0}
				cy={0}
				weight={1}
				className={`clusterCentreMarker ${
					isSelected ? 'selectedCluster' : ''
				} ${isHovered ? 'hoveredCluster' : ''}`}
			/>
		</g>
	);
} 