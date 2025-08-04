"use client";

// [IMPORT] React //
import React from "react";
import { createPortal } from "react-dom";

// [IMPORT] Context hooks //
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";
import { useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";
import { useAnimatedChartViewport } from "@/context/AnimatedChartViewport";

// [IMPORT] Types //
import type { labelCluster } from "@/lib/hooks/use-airliner-view-model";
import type { AirlinerModel } from "@/lib/data/airliner-types";


/**
 * AirlinerScatterClusterMenu
 * 
 * Renders a menu for the selected cluster using a portal for proper positioning.
 * 
 * @param selectedCluster - The selected cluster data
 * @param airlinerEntries - Map of airliner data for displaying cluster contents
 */
interface AirlinerScatterClusterMenuProps {
	selectedCluster: labelCluster;
	airlinerEntries: Map<string, AirlinerModel>;
}

export default function AirlinerScatterClusterMenu({
	selectedCluster,
	airlinerEntries
}: AirlinerScatterClusterMenuProps) {
	// Access selection context for clearing cluster selection and selecting airliners
	const { clearSelection, setSelectedAirliner, setHoveredAirliner } = useAirlinerSelection();
	
	// Access viewport controls for zooming
	const { view, viewportScale } = useResponsiveChartViewport();
	const { setAnimationDuration } = useAnimatedChartViewport();
	// Convert SVG coordinates to viewport coordinates
	const svgElement = document.querySelector('svg');
	if (!svgElement) return null;
	
	const svgRect = svgElement.getBoundingClientRect();
	const viewportX = svgRect.left + selectedCluster.position.x;
	const viewportY = svgRect.top + selectedCluster.position.y;
	
	// Get airliners belonging to this cluster
	const clusterAirliners = selectedCluster.labelIDs
		.map(airlinerID => airlinerEntries.get(airlinerID))
		.filter((airliner): airliner is AirlinerModel => airliner !== undefined);

	// Handle button click: clear cluster selection, select the airliner, and zoom to fit its marker bounding box
	const handleAirlinerClick = (airlinerID: string) => {
		clearSelection();
		setSelectedAirliner(airlinerID);
		
		// Get the selected airliner's data
		const selectedAirliner = airlinerEntries.get(airlinerID);
		if (selectedAirliner?.markerSeries?.seriesBBox) {
			// Set animation duration for smooth zoom
			setAnimationDuration(800);
			
			// Get the marker bounding box extents (in SVG pixel coordinates)
			const { x: [svgXMin, svgXMax], y: [svgYMin, svgYMax] } = selectedAirliner.markerSeries.seriesBBox;
			
			// Convert SVG coordinates to data coordinates for zoom
			const dataXMin = (viewportScale.x as any).invert(svgXMin);
			const dataXMax = (viewportScale.x as any).invert(svgXMax);
			const dataYMin = (viewportScale.y as any).invert(svgYMin);
			const dataYMax = (viewportScale.y as any).invert(svgYMax);
			
			// Zoom to fit the airliner's marker bounding box with aspect ratio preservation
			view.zoomToFit({ x: [dataXMin, dataXMax], y: [dataYMin, dataYMax] }, 0.5);
		}
	};

	// Handle button hover: highlight the airliner without deselecting cluster
	const handleAirlinerHover = (airlinerID: string) => {
		setHoveredAirliner(airlinerID);
	};

	// Handle button leave: clear airliner hover
	const handleAirlinerLeave = () => {
		setHoveredAirliner(null);
	};

	return createPortal(
		<div 
			className="clusterMenu"
			style={{
				position: 'absolute',
				left: `${viewportX}px`,
				top: `${viewportY}px`
			}}
		>
			{clusterAirliners.length >= 8 ? (
				<div className="frame-major frame-flex-horizontal">
					{(() => {
						// Set the max number of airliners per column
						const AIRLINERS_PER_COLUMN = 6;
						const columns = [];
						for (let i = 0; i < clusterAirliners.length; i += AIRLINERS_PER_COLUMN) {
							const columnAirliners = clusterAirliners.slice(i, i + AIRLINERS_PER_COLUMN);
							columns.push(
								<div
									key={`col-${i / AIRLINERS_PER_COLUMN}`}
									className="frame-flex-vertical"
									style={{ flex: 1 }}
								>
									{columnAirliners.map(airliner => (
										<button
											key={airliner.airlinerID}
											type="button"
											className="btn-diminished"
											onClick={() => handleAirlinerClick(airliner.airlinerID)}
											onMouseEnter={() => handleAirlinerHover(airliner.airlinerID)}
											onMouseLeave={handleAirlinerLeave}
										>
											{airliner.airlinerData.nameCommon}
										</button>
									))}
								</div>
							);
							// Add a divider between columns except after the last column
							if (i + AIRLINERS_PER_COLUMN < clusterAirliners.length) {
								columns.push(
									<hr key={`divider-${i / AIRLINERS_PER_COLUMN}`} className="frame-minor" />
								);
							}
						}
						return columns;
					})()}
				</div>
			) : (
				<div className="frame-major frame-flex-vertical">
					{clusterAirliners.map(airliner => (
						<button
							key={airliner.airlinerID}
							type="button"
							className="btn-diminished"
							onClick={() => handleAirlinerClick(airliner.airlinerID)}
							onMouseEnter={() => handleAirlinerHover(airliner.airlinerID)}
							onMouseLeave={handleAirlinerLeave}
						>
							{airliner.airlinerData.nameCommon}
						</button>
					))}
				</div>
			)}
		</div>,
		document.body
	);
} 