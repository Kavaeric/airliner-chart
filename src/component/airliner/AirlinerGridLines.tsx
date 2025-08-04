"use client";

// [IMPORT] React //
import React, { useMemo } from "react";

// [IMPORT] Types //
import type { AirlinerModel, AirlinerMarkerSeries, AirlinerMarker } from "@/lib/data/airliner-types";

interface AirlinerGridLinesProps {
	hoveredAirlinerID: string | null;
	selectedAirlinerID: string | null;
	airlinerEntries: Map<string, AirlinerModel>;
	width: number;
	height: number;
}

/**
 * Passenger class name mapping for display labels
 */
const PAX_CLASS_NAMES = {
	pax1Class: "1-Class Capacity",
	pax2Class: "2-Class Capacity", 
	pax3Class: "3-Class Capacity"
} as const;

/**
 * Utility function to get passenger class markers from a marker series
 * Filters markers to only include pax3Class, pax2Class, and pax1Class
 */
function getPaxClassMarkers(markerSeries: AirlinerMarkerSeries): AirlinerMarker[] {
	return markerSeries.markers.filter((marker) =>
		marker.markerClass === 'pax3Class' ||
		marker.markerClass === 'pax2Class' ||
		marker.markerClass === 'pax1Class'
	);
}

/**
 * Utility function to calculate bounds from passenger class markers
 * Returns leftmost x, rightmost x, and y coordinate
 */
function getMarkerBounds(paxClassMarkers: AirlinerMarker[]): { leftmost: number; rightmost: number; y: number } | null {
	if (paxClassMarkers.length === 0) return null;

	// Get the leftmost passenger class marker coordinate
	const leftmost = paxClassMarkers.reduce((min, marker) => 
		marker.markerCoordinates.x < min.markerCoordinates.x ? marker : min
	).markerCoordinates.x;

	// Get the rightmost passenger class marker coordinate
	const rightmost = paxClassMarkers.reduce((max, marker) => 
		marker.markerCoordinates.x > max.markerCoordinates.x ? marker : max
	).markerCoordinates.x;

	// Get the y-coordinate (same for all markers)
	const y = paxClassMarkers[0].markerCoordinates.y;

	return { leftmost, rightmost, y };
}

/**
 * AirlinerGridLines Component
 *
 * Renders grid lines for hovered/selected airliners.
 * - Projects vertical lines from passenger class markers to X-axis
 * - Projects horizontal line from leftmost marker to Y-axis
 * - Handles hover and selection state styling
 * - Only renders when an airliner is active
 * - Draws white selection rectangle for selected airliners
 */
export default function AirlinerGridLines({ 
	hoveredAirlinerID, 
	selectedAirlinerID, 
	airlinerEntries, 
	width,
	height 
}: AirlinerGridLinesProps) {
	
	// === Grid Line Calculation ===
	// Calculate grid lines for hovered/selected airliners with pre-calculated passenger class info
	const activeAirlinerAxisLines = useMemo(() => {
		const lines: Array<{
			x1: number;
			y1: number;
			x2: number;
			y2: number;
			type: 'vertical' | 'horizontal';
			state: 'hovered' | 'selected';
			airlinerID: string;
			paxClassName?: string; // Pre-calculated passenger class name for vertical lines
		}> = [];

		// Helper function to process airliner and generate grid lines
		const processAirlinerForGridLines = (airlinerID: string, state: 'hovered' | 'selected') => {
			const airliner = airlinerEntries.get(airlinerID);
			if (!airliner?.markerSeries) return;

			const paxClassMarkers = getPaxClassMarkers(airliner.markerSeries);
			const bounds = getMarkerBounds(paxClassMarkers);
			if (!bounds) return;

			// Draw vertical lines from each marker across entire plot area
			// Pre-calculate passenger class name for each vertical line
			paxClassMarkers.forEach((marker) => {
				const paxClassName = PAX_CLASS_NAMES[marker.markerClass as keyof typeof PAX_CLASS_NAMES];
				
				lines.push({
					x1: marker.markerCoordinates.x,
					y1: 0, // Top chart edge
					x2: marker.markerCoordinates.x,
					y2: height, // Bottom chart edge
					type: 'vertical',
					state,
					airlinerID,
					paxClassName // Store the passenger class name for text labels
				});
			});

			// Draw horizontal line from leftmost marker across entire plot area
			lines.push({
				x1: 0, // Left chart edge
				y1: bounds.y,
				x2: width, // Right chart edge
				y2: bounds.y,
				type: 'horizontal',
				state,
				airlinerID
			});
		};

		// Process selected airliner first (if any)
		if (selectedAirlinerID) {
			processAirlinerForGridLines(selectedAirlinerID, 'selected');
		}

		// Process hovered airliner (if different from selected)
		if (hoveredAirlinerID && hoveredAirlinerID !== selectedAirlinerID) {
			processAirlinerForGridLines(hoveredAirlinerID, 'hovered');
		}

		return lines.length > 0 ? lines : null;
	}, [hoveredAirlinerID, selectedAirlinerID, airlinerEntries, width, height]);

	// === Selection Rectangle Calculation ===
	// Calculate white rectangle for selected airliner
	const selectionRectangle = useMemo(() => {
		if (!selectedAirlinerID) return null;

		const selectedAirliner = airlinerEntries.get(selectedAirlinerID);
		if (!selectedAirliner?.markerSeries) return null;

		const paxClassMarkers = getPaxClassMarkers(selectedAirliner.markerSeries);
		const bounds = getMarkerBounds(paxClassMarkers);
		if (!bounds) return null;

		return {
			x: bounds.leftmost,
			y: 0, // Top edge of chart
			width: bounds.rightmost - bounds.leftmost,
			height: height // Extend to bottom edge
		};
	}, [selectedAirlinerID, airlinerEntries, height]);

	// Don't render anything if no active airliner
	if (!activeAirlinerAxisLines && !selectionRectangle) {
		return null;
	}

	return (
		<g className="airlinerGridLines">
			{/* Selection rectangle - render first so it appears behind grid lines */}
			{selectionRectangle && (
				<rect
					x={selectionRectangle.x}
					y={selectionRectangle.y}
					width={selectionRectangle.width}
					height={selectionRectangle.height}
					className="airlinerSelectionCapacityHighlight"
				/>
			)}
			
			{/* Grid lines */}
			{activeAirlinerAxisLines?.map((line, index) => (
				<line
					key={`grid-line-${line.airlinerID}-${line.type}-${index}`}
					x1={line.x1}
					y1={line.y1}
					x2={line.x2}
					y2={line.y2}
					className={`airlinerGridLine airlinerGridLine${line.type.charAt(0).toUpperCase() + line.type.slice(1)} airlinerGridLine${line.state.charAt(0).toUpperCase() + line.state.slice(1)}`}
				/>
			))}

			{/* Text labels for vertical lines - only render for selected airliners */}
			{activeAirlinerAxisLines
				?.filter(line => line.airlinerID === selectedAirlinerID && line.type === 'vertical' && line.paxClassName)
				.map((line, index) => (
					<text
						key={`grid-line-label-${line.airlinerID}-${line.type}-${line.state}-${index}`}
						x={line.x1}
						y={height}
						textAnchor="middle"
						className="airlinerGridLineLabel"
					>
						{line.paxClassName}
					</text>
				))}
		</g>
	);
} 