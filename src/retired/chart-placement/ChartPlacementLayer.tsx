import React, { useState, useRef, useEffect, useMemo } from 'react';

// [IMPORT] Context providers/hooks //
import { useChartScales } from "@/context/ChartScalesContext";

// [IMPORT] Placement utilities //
import { generateStandardOffsetLocations, sortOffsetLocations, generatePlacementCandidates, setGridCellOccupancy } from "@/retired/chart-placement/grid-placement";
import { PlaceableObject, placeLabelsWithOccupiedGrid, markOccupiedGrid } from "@/retired/chart-placement/chart-placement-grid";
import * as bitgrid from '@/retired/chart-placement/bitgrid';

/**
 * Props for the ChartPlacementLayer component.
 * This component handles automatic label placement using an occupancy grid algorithm.
 */
interface ChartPlacementLayerProps {
	/** React children to be placed (typically labels or other chart elements) */
	children: React.ReactNode;
	/** Width of the chart area in pixels */
	width: number;
	/** Height of the chart area in pixels */
	height: number;
	/** Size of grid cells for occupancy tracking. Can be square (number) or rectangular ([width, height]) */
	cellSize?: number | [number, number];
	/** Array of anchor coordinates for each child element. Must match children array length */
	childCoords?: Array<{ x: number; y: number } | null>;
	/** Bounding boxes of existing markers/lines to avoid during placement */
	markerBoundingBoxes?: Array<{ x: number; y: number; width: number; height: number } | null>;
	/** Margin between anchor point and placed element */
	margin?: number;
	/** Distance multiplier for placement candidate offsets */
	offsetSize?: number;
	/** Enable debug visualization of grid and placement candidates */
	debugGrid?: boolean;
}

/**
 * ChartPlacementLayer - Automatic label placement using occupancy grid algorithm
 * 
 * This component implements a sophisticated label placement system that:
 * 1. Measures the actual rendered size of each child element
 * 2. Generates multiple placement candidates around each anchor point
 * 3. Uses an occupancy grid to track used space and avoid overlaps
 * 4. Places elements at the best available position based on preference scoring
 * 5. Renders children at their calculated positions with transforms
 * 
 * The placement algorithm is inspired by cartographic label placement principles
 * and uses a multi-tier candidate generation system with intelligent sorting.
 * 
 * @param props - ChartPlacementLayerProps configuration
 * @returns JSX element with placed children and optional debug overlays
 */
export default function ChartPlacementLayer({ 
	children, 
	width,
	height,
	cellSize = 8,
	childCoords,
	markerBoundingBoxes,
	margin = 0,
	offsetSize = 8,
	debugGrid = false
}: ChartPlacementLayerProps) {
	// State to store measured label sizes (static, only width/height)
	// This is measured once per child set and cached for performance
	const [objectsSizes, setObjectsSizes] = useState<{ id: string, width: number, height: number, x: number, y: number }[]>([]);
	const [measurementComplete, setMeasurementComplete] = useState(false);
	
	// Refs array to hold references to invisible measurement elements
	// Each child gets a ref for measuring its actual rendered bounds
	const measurementRefs = useRef<(SVGGElement | null)[]>([]);

	// Get chart scales from context for coordinate transformations
	const { xScale, yScale } = useChartScales();

	// Memoise the generated and sorted candidate offsets for placement
	// This creates a 3-tier concentric grid of placement candidates, sorted by preference
	// The sorting favours positions to the left and top (dx: -1, dy: -1) with rightmost/topmost tiebreakers
	const candidateOffsets = useMemo(() => {
		// Generate a 3-tier grid of offset locations (excluding centre)
		// This creates 24 candidate positions in a 7x7 grid around each anchor
		const raw = generateStandardOffsetLocations({ tiers: 3, includeCentre: false });

		// Sort offsets by preference using cartographic principles:
		// - Primary: distance from ideal position (top-left: dx: -1, dy: -1)
		// - Secondary: distance from origin (0,0)
		// - Tertiary: prefer leftmost (false) and topmost (true) positions
		return sortOffsetLocations(raw, {dx: -1, dy: -1}, false, true);
	}, []);

	// Build a stable key from the keys of the children
	// This is used to detect when the child set changes and reset measurement
	const childrenKey = (React.Children.map(children, child => {
		if (React.isValidElement(child)) {
			return child.key ?? '';
		}
		return '';
	}) ?? []).join(',');

	// Reset measurement state when the child set changes
	// This ensures we re-measure when labels are added/removed/reordered
	useEffect(() => {
		setMeasurementComplete(false);
	}, [childrenKey]);

	// Measurement logic - determines the actual rendered size of each child
	// This is critical because CSS/rendering can change the final dimensions
	useEffect(() => {
		// Skip if measurement is already complete or no refs available
		if (measurementComplete) return;
		if (!measurementRefs.current.length) return;

		// Measure the bounding box of each child using SVG's getBBox()
		// This gives us the true rendered size and position for placement calculations
		const measured = measurementRefs.current.map((ref, i) => {
			if (ref && typeof ref.getBBox === 'function') {
				try {
					const bbox = ref.getBBox(); // getBBox returns the tight bounding box in local coordinates
					const child = React.Children.toArray(children)[i];

					// Special case: <circle> elements are centre-anchored (cx/cy)
					// We need to convert to top-left coordinates for placement calculations
					if (
						React.isValidElement(child) &&
						child.type === 'circle'
					) {
						const circleEl = child as React.ReactElement<any>;

						// If the circle has explicit cx and cy props, use them to calculate top-left anchor
						if (circleEl.props.cx !== undefined && circleEl.props.cy !== undefined) {
							const cx = Number(circleEl.props.cx);
							const cy = Number(circleEl.props.cy);
							
							// Convert centre coordinates to top-left by subtracting half dimensions
							return {
								id: i.toString(),
								width: bbox.width,
								height: bbox.height,
								x: cx - bbox.width / 2,
								y: cy - bbox.height / 2
							};
						}
					}

					// Default case: most SVG elements (rect, text, etc.) are top-left anchored
					// Use the bbox coordinates directly
					return {
						id: i.toString(),
						width: bbox.width,
						height: bbox.height,
						x: bbox.x,
						y: bbox.y
					};
				} catch {
					// Fallback for measurement failures (e.g., hidden elements)
					return { id: i.toString(), width: 0, height: 0, x: 0, y: 0 };
				}
			}
			// Fallback for missing refs or non-SVG elements
			return { id: i.toString(), width: 0, height: 0, x: 0, y: 0 };
		});

		setObjectsSizes(measured);
		setMeasurementComplete(true);
	}, [measurementComplete, children]);

	// Render invisible measurement elements
	// These are used to measure the actual rendered size of each child
	// They're invisible and don't interfere with user interaction
	const invisibleChildren = React.Children.map(children, (child, index) => {
		// Ensure ref array has enough slots
		if (!measurementRefs.current[index]) {
			measurementRefs.current[index] = null;
		}
		if (!React.isValidElement(child)) {
			return null;
		}
		return (
			<g
				key={`measurement-${index}`}
				ref={(el: SVGGElement | null) => {
					measurementRefs.current[index] = el;
				}}
				style={{
					opacity: 0,
					pointerEvents: 'none'
				}}
				className={`measurement-container-${index}`}
			>
				{child}
			</g>
		);
	});

	// Extract static dimensions from measured sizes
	// This memoized value only changes when the child set changes
	const objectDimensions = useMemo(() =>
		objectsSizes.map(({ id, width, height }) => ({
			id,
			width,
			height
		})),
		[objectsSizes]
	);

	// Prepare objects for placement algorithm
	// This combines static dimensions with dynamic anchor coordinates
	// The bounds represent the ideal position (anchor) with measured dimensions
	const objects = useMemo(() =>
		objectDimensions.map(({ id, width, height }, i) => {
			const anchor = childCoords?.[i] ?? { x: 0, y: 0 };
			return {
				id,
				bounds: {
					x: anchor.x,
					y: anchor.y,
					width,
					height
				}
			};
		}),
		[objectDimensions, childCoords]
	);

	// Core placement algorithm: create grid, mark obstacles, place labels
	// This is the heart of the component - it runs the occupancy grid placement
	const { placements, grid } = useMemo(() => {
		if (!objects.length) return { placements: [], grid: null };
		
		// Create the occupancy grid for collision detection
		// The grid cell size determines placement precision vs performance
		const grid = bitgrid.createBitmapGrid(width, height, cellSize);
		
		// Mark chart edges as occupied to prevent labels from extending outside bounds
		// This creates a "fence" around the chart area
		const markChartEdges = (grid: bitgrid.BitGrid) => {
			const edgeCells: Array<[number, number]> = [];
			
			// Mark top and bottom edges (full width)
			for (let x = 0; x < grid.width; x++) {
				edgeCells.push([x, 0]); // Top edge
				edgeCells.push([x, grid.height - 1]); // Bottom edge
			}
			
			// Mark left and right edges (full height)
			for (let y = 0; y < grid.height; y++) {
				edgeCells.push([0, y]); // Left edge
				edgeCells.push([grid.width - 1, y]); // Right edge
			}
			
			// Mark all edge cells as occupied
			setGridCellOccupancy(grid, edgeCells, true);
		};
		
		// Mark chart edges as occupied to create boundary
		markChartEdges(grid);
		
		// Mark existing markers/lines as occupied to avoid overlaps
		// This ensures labels don't cover important chart elements
		if (markerBoundingBoxes) markOccupiedGrid(grid, markerBoundingBoxes);
		
		// Run the placement algorithm and return results
		// The algorithm will find the best available position for each label
		return { ...placeLabelsWithOccupiedGrid(
			objects,
			grid,
			candidateOffsets,
			margin,
			offsetSize
		), grid };
	}, [objects, width, height, cellSize, markerBoundingBoxes, xScale, yScale, margin, offsetSize, candidateOffsets]);

	// Debug grid overlay - visualizes the occupancy grid
	// Shows which cells are occupied (dark) vs free (light)
	const gridOverlay = useMemo(() => {
		if (!debugGrid || !grid) return null;
		const cells = [];
		const cellW = grid.cellWidth;
		const cellH = grid.cellHeight;
		
		// Render each grid cell with appropriate styling
		for (let y = 0; y < grid.height; y++) {
			for (let x = 0; x < grid.width; x++) {
				const isOccupied = bitgrid.getCell(grid, x, y);
				const isEven = (x + y) % 2 === 0;
				
				// Only show occupied cells to reduce visual clutter
				if (isOccupied) cells.push(
					<rect
						key={`gridcell-${x}-${y}`}
						x={x * cellW}
						y={y * cellH}
						width={cellW}
						height={cellH}
						fill={isOccupied ? 'rgba(0,0,0,0.25)' : (isEven ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.01)')}
						pointerEvents="none"
					/>
				);
			}
		}
		return <g className="debug-grid-overlay">{cells}</g>;
	}, [debugGrid, grid]);

	// Debug overlay: show placement candidates for each label
	// This helps visualize the placement algorithm's decision process
	const debugCandidateOverlay = useMemo(() => {
		if (!debugGrid || !objectsSizes.length || !childCoords) return null;
		return (
			<g className="debug-first-candidate-overlay">
				{objectsSizes.map(({ width, height }, i) => {
					const anchor = childCoords[i] ?? { x: 0, y: 0 };
					
					// Generate all placement candidates for this label
					const candidates = generatePlacementCandidates(
						{ x: anchor.x, y: anchor.y, width, height },
						candidateOffsets,
						margin,
						offsetSize
					)

					return (
						<>
							{/* Highlight the first (preferred) placement candidate */}
							<rect
								key={`candidate-${i}-0`}
								x={candidates[0].bounds.x}
								y={candidates[0].bounds.y}
								width={width}
								height={height}
								fill="none"
								stroke={`rgba(255, 0, 0, 0.5)`}
								strokeWidth={2}
								pointerEvents="none"
							/>
							{/* Show all other candidates with lighter styling */}
							{candidates.map((candidate, j) => (
								<rect
									key={`candidate-${i}-${j}`}
									x={candidate.bounds.x}
									y={candidate.bounds.y}
									width={width}
									height={height}
									fill="none"
									stroke={`rgba(255, 0, 0, 0.1)`}
									strokeWidth={1}
									pointerEvents="none"
								/>
							))}
						</>
					);
				})}
			</g>
		);
	}, [debugGrid, objectsSizes, childCoords, candidateOffsets, margin, offsetSize]);

	return (
		<>
			{/* Debug overlay: candidate bounding boxes */}
			{debugCandidateOverlay}
			
			{/* Invisible measurement layer (only when measurement is not complete) */}
			{!measurementComplete && (
				(() => { console.log('ChartPlacementLayer: rendering measurement layer'); return null; })() ||
				<g className="measurement-layer" style={{ opacity: 0, pointerEvents: 'none' }}>
					{invisibleChildren}
				</g>
			)}

			{/* Debug grid overlay */}
			{gridOverlay}

			{/* Final render layer: render children at their placed positions */}
			{React.Children.map(children, (child, i) => {
				if (!React.isValidElement(child)) return null;
				
				// Find the placement result for this child
				const placement = placements.find(p => p.id === objectsSizes[i]?.id);

				// Skip rendering if no placement found or invalid bounds
				if (!placement || !placement.placement?.bounds) return null;
				const { x, y } = placement.placement.bounds;

				// Calculate the offset from original anchor to final placement position
				// This offset will be applied as a transform to move the child
				const originalAnchor = childCoords?.[i] ?? { x: 0, y: 0 };
				const offset = {
					x: x - originalAnchor.x,
					y: y - originalAnchor.y
				};

				// Render the child with the calculated transform
				return (
					<>
					{/* Debug line showing movement from anchor to placement */}
					{debugGrid && <line x1={originalAnchor.x} y1={originalAnchor.y} x2={x} y2={y} stroke="blue" strokeWidth={1} />}
					
					{/* Main child element with transform applied */}
					<g key={child.key ?? i} transform={`translate(${offset.x}, ${offset.y})`} className={`chart-placement-layer-item-${i}`}>
						{/* Debug overlay: show anchor point */}
						{debugGrid && <circle cx={originalAnchor.x} cy={originalAnchor.y} r={2} fill="red" stroke="none" />}
						
						{/* The actual child element */}
						{child}
					</g>
					</>
				);
			})}
		</>
	);
} 
