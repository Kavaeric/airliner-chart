import { AxisScale } from "@visx/axis";
import { scaleLinear } from "@visx/scale";
import { useDrag, useWheel } from '@use-gesture/react';
import { createContext, useContext, ReactNode, useRef, useImperativeHandle, forwardRef, useState, useMemo, useCallback, useEffect } from "react";

/**
 * @interface ViewportState
 * Represents the current visible region of the chart in data-space coordinates.
 *
 * - `x`: Tuple [min, max] specifying the lower and upper bounds of the visible X-axis in data units.
 *   - Used to determine which portion of the data is currently shown horizontally.
 *   - Changing these values pans or zooms the chart horizontally.
 * - `y`: Tuple [min, max] specifying the lower and upper bounds of the visible Y-axis in data units.
 *   - Used to determine which portion of the data is currently shown vertically.
 *   - Changing these values pans or zooms the chart vertically.
 *
 * This interface is used to store and update the viewport's position and zoom level,
 * allowing chart components to render only the relevant data region and respond to user navigation.
 */
interface ViewportState {
	x: [number, number];
	y: [number, number];
}

/**
 * @interface MouseCoordinates
 * Represents mouse coordinates in both screen space and data space
 */
interface MouseCoordinates {
	screen: {
		x: number;
		y: number;
	};
	data: {
		x: number;
		y: number;
	};
}

/**
 * @interface DragConfig
 * Configuration for drag gesture handling
 */
interface DragConfig {
	axis: 'x' | 'y' | 'both';
	invert: boolean;
	options?: {
		threshold?: number;
		immediate?: boolean;
	};
}

/**
 * @interface ResponsiveChartViewportType
 * ResponsiveChartViewport Context Type
 *
 * Provides viewport state, D3 scales, and imperative controls for chart children.
 * Organized into logical groups for better discoverability and cleaner API access.
 *
 * @property {Object} plotArea Chart dimensions and layout information.
 *   - `width`: The current width of the plot area in pixels.
 *   - `height`: The current height of the plot area in pixels.
 * @property {Object} dataScale D3 scales covering the full data domain (unzoomed).
 *   - `x`: Scale for mapping all X data points to pixel space (e.g., for brushes or extents).
 *   - `y`: Scale for mapping all Y data points to pixel space (e.g., for brushes or extents).
 * @property {Object} viewportScale D3 scales covering the current visible viewport (zoomed/panned).
 *   - `x`: Scale for X axis and plotting visible data.
 *   - `y`: Scale for Y axis and plotting visible data.
 * @property {Object} mouse Current mouse coordinates and tracking state.
 *   - `coordinates`: Current mouse position in both screen and data coordinates.
 *   - `isOverChart`: Whether the mouse is currently over the chart area.
 *   - `updateCoordinates`: Function to update mouse coordinates from a mouse event.
 * @property {Object} view Viewport manipulation functions.
 *   - `move`: Pan the viewport by a given delta in data units. Positive values move right/up.
 *   - `zoom`: Zoom the viewport by a scale factor, optionally around a data-space center point.
 *   - `reset`: Reset the viewport to its initial state (as defined by initialViewport or data extents).
 *   - `zoomToExtents`: Zoom the viewport to fit the full data extents.
 * @property {Object} drag Drag and wheel interaction functions.
 *   - `bindDrag`: Returns gesture bind props for drag interactions with optional configuration.
 *   - `bindWheel`: Returns gesture bind props for wheel interactions.
 *   - `bindGestures`: Returns gesture bind props for combined drag and wheel interactions.
 *   - `isDragging`: Whether a drag operation is currently in progress.
 */
interface ResponsiveChartViewportType {
	plotArea: {
		width: number;	// previously plotWidth
		height: number;// previously plotHeight
	};
	dataScale: {
		x: AxisScale;	// previously xScale
		y: AxisScale;	// previously yScale
	};
	viewportScale: {
		x: AxisScale;	// previously xScaleView
		y: AxisScale;	// previously yScaleView
	};
	mouse: {
		coordinates: MouseCoordinates | null;
		isOverChart: boolean;
		updateCoordinates: (event: React.MouseEvent | MouseEvent, element: Element) => void;
	};
	view: {
		move: (x: number, y: number) => void; // previously translateViewport
		zoom: (factor: number, center?: { x: number; y: number }, axis?: 'x' | 'y' | 'both') => void; // previously zoomViewport
		reset: () => void; // previously resetViewport
		zoomToExtents: () => void; // previously zoomToExtents
	},
	drag: {
		bindDrag: (config?: Partial<DragConfig>) => any;
		bindWheel: (axis?: 'x' | 'y' | 'both', invert?: boolean) => any;
		bindGestures: (config?: { dragAxis?: 'x' | 'y' | 'both', wheelAxis?: 'x' | 'y' | 'both', invertDrag?: boolean, invertWheel?: boolean }) => any;
		isDragging: boolean;
	},
}

/**
 * ResponsiveChartViewport Context
 */
const ResponsiveChartViewportContext = createContext<ResponsiveChartViewportType | null>(null);

/**
 * @interface ResponsiveChartViewportProps
 * Props for ResponsiveChartViewport
 *
 * Provides configuration and data for the chart viewport context.
 *
 * @template T - The data type for each datum in the chart.
 *
 * @property {ReactNode} children React children to render within the viewport context. These will have access to the viewport state and scales.
 * @property {T[]} data The array of data objects to be visualised. Used to determine data extents and scaling.
 * @property {(d: T) => number} xAccessor Function to extract the X value from a datum. Used for scaling and viewport calculations.
 * @property {(d: T) => number} yAccessor Function to extract the Y value from a datum. Used for scaling and viewport calculations.
 * @property {number} width The pixel width of the chart area. Used to compute scales and SVG sizing.
 * @property {number} height The pixel height of the chart area. Used to compute scales and SVG sizing.
 * @property {{ x: [number, number]; y: [number, number]; }} [initialViewport] Optional. The initial visible data domain for the viewport, as [min, max] for each axis. If omitted, the viewport defaults to the full data extent.
 * @property {Object} [constraints] Optional. Limits for viewport panning and zooming.
 *   - @property {[number | null, number | null]} x: [min, max] - Limits for the X axis domain (data-space).
 *   - @property {[number | null, number | null]} y: [min, max] - Limits for the Y axis domain (data-space).
 *   - @property {[number | null, number | null]} extentX: [min, max] - Minimum and maximum allowed width of the X viewport (zoom constraints).
 *   - @property {[number | null, number | null]} extentY: [min, max] - Minimum and maximum allowed height of the Y viewport (zoom constraints).
 * @property {React.RefObject<ResponsiveChartViewportType>} [viewportRef] Optional. Ref to expose imperative viewport controls (e.g., translate, zoom, reset) to parent components.
 */
interface ResponsiveChartViewportProps<T> {
	children: ReactNode; // React children to render within the viewport context.
	data: T[]; // The array of data objects to be visualised.
	xAccessor: (d: T) => number; // Function to extract the X value from a datum.
	yAccessor: (d: T) => number; // Function to extract the Y value from a datum.
	width: number; // Pixel width of the chart area.
	height: number; // Pixel height of the chart area.
	initialViewport?: { // Initial visible data domain for the viewport. If omitted, defaults to the full data extent.
		x: [number, number];
		y: [number, number];
	};
	constraints?: {
		x?: [number | null, number | null]; // [min, max] limits for the X axis domain (data-space).
		y?: [number | null, number | null]; // [min, max] limits for the Y axis domain (data-space).
		extentX?: [number | null, number | null]; // [min, max] allowed width of the X viewport (zoom constraints).
		extentY?: [number | null, number | null]; // [min, max] allowed height of the Y viewport (zoom constraints).
	}; // Limits for viewport panning and zooming. Use null for any bound to indicate no constraint.
	viewportRef?: React.RefObject<ResponsiveChartViewportType>; // Optional. Ref to expose imperative viewport controls to parent components.
}

/**
 * @function applyPositionConstraints
 * Enforces position constraints on a domain.
 *
 * Ensures the domain [min, max] does not move outside the allowed axis range.
 * If the domain's min is less than the allowed minimum, the domain is shifted right.
 * If the domain's max is greater than the allowed maximum, the domain is shifted left.
 * The size of the domain is preserved; only its position is changed.
 *
 * @param domain - The current domain as [min, max].
 * @param axis - 'x' or 'y', selects which axis's constraints to use.
 * @param constraints - The constraints object, possibly containing x/y position limits.
 * @returns The domain, shifted if necessary to respect position constraints.
 */
function applyPositionConstraints(
	domain: [number, number], 
	axis: 'x' | 'y', 
	constraints: ResponsiveChartViewportProps<any>['constraints'] | undefined
): [number, number] {
	// If no constraints are provided, return the domain unchanged.
	if (!constraints) return domain;
	
	// Select the correct axis constraint (x or y).
	const constraint = axis === 'x' ? constraints.x : constraints.y;
	if (!constraint) return domain;
	
	let [min, max] = domain;

	// --- Enforce minimum position constraint ---
	// If a minimum is specified and the domain's min is less than allowed:
	// Shift the entire domain right so min equals the constraint.
	if (constraint[0] !== null && min < constraint[0]) {
		// Calculate how much to shift right.
		const offset = constraint[0] - min;
		// Move both min and max by the offset to preserve domain size.
		min = constraint[0];
		max += offset;
	}
	
	// --- Enforce maximum position constraint ---
	// If a maximum is specified and the domain's max is greater than allowed:
	// Shift the entire domain left so max equals the constraint.
	if (constraint[1] !== null && max > constraint[1]) {
		// Calculate how much to shift left.
		const offset = max - constraint[1];
		// Move both min and max by the offset to preserve domain size.
		max = constraint[1];
		min -= offset;
	}
	
	// Return the possibly shifted domain.
	return [min, max];
}

/**
 * @function applyExtentConstraints
 * Enforces minimum and maximum extent (length) constraints on a domain.
 *
 * The function ensures that the domain (e.g., [min, max] for an axis) is not
 * smaller than the minimum allowed extent, and not larger than the maximum allowed extent.
 * If the domain is too small, it expands symmetrically about the centre.
 * If the domain is too large, it contracts symmetrically about the centre.
 *
 * @param domain - The current domain as [min, max].
 * @param axis - 'x' or 'y', used to select the correct constraint.
 * @param constraints - The constraints object, possibly containing extentX/extentY.
 * @returns The domain, adjusted to respect extent constraints.
 */
function applyExtentConstraints(
	domain: [number, number], 
	axis: 'x' | 'y', 
	constraints: ResponsiveChartViewportProps<any>['constraints'] | undefined,
	relativePosition?: number
): [number, number] {
	// If no constraints are provided, return the domain unchanged.
	if (!constraints) return domain;
	
	// Select the correct extent constraint for the axis.
	const constraint = axis === 'x' ? constraints.extentX : constraints.extentY;
	if (!constraint) return domain;
	
	const [minExtent, maxExtent] = constraint;
	const currentExtent = domain[1] - domain[0];
	let [min, max] = domain;

	// --- Enforce minimum extent ---
	// If a minimum extent is specified and the current domain is too small:
	// Expand the domain while preserving the relative position of the zoom center.
	if (minExtent !== null && currentExtent < minExtent) {
		const expansion = minExtent - currentExtent;
		// Preserve the relative position of the zoom center
		if (relativePosition !== undefined) {
			min = domain[0] - (relativePosition * expansion);
			max = domain[1] + ((1 - relativePosition) * expansion);
		} else {
			// Fall back to symmetric expansion around domain center
			const expansionPerSide = expansion / 2;
			min = domain[0] - expansionPerSide;
			max = domain[1] + expansionPerSide;
		}
	}
	
	// --- Enforce maximum extent ---
	// If a maximum extent is specified and the current domain is too large:
	// Contract the domain while preserving the relative position of the zoom center.
	if (maxExtent !== null && currentExtent > maxExtent) {
		const contraction = currentExtent - maxExtent;
		// Preserve the relative position of the zoom center
		if (relativePosition !== undefined) {
			min = domain[0] + (relativePosition * contraction);
			max = domain[1] - ((1 - relativePosition) * contraction);
		} else {
			// Fall back to symmetric contraction around domain center
			const contractionPerSide = contraction / 2;
			min = domain[0] + contractionPerSide;
			max = domain[1] - contractionPerSide;
		}
	}
	
	// Return the possibly adjusted domain.
	return [min, max];
}

/**
 * Apply all constraints to a domain
 */
function applyAllConstraints(
	domain: [number, number], 
	axis: 'x' | 'y', 
	constraints: ResponsiveChartViewportProps<any>['constraints'] | undefined,
	relativePosition?: number
): [number, number] {
	let result = domain;
	result = applyExtentConstraints(result, axis, constraints, relativePosition);
	result = applyPositionConstraints(result, axis, constraints);
	return result;
}

/**
 * @function ResponsiveChartViewport
 * ResponsiveChartViewport Component
 * 
 * A data-driven viewport manager that provides viewport state via context.
 * 
 * @param {Object} props - The component props.
 * @param {ReactNode} props.children - The children to render within the viewport context.
 * @param {T[]} props.data - The data to be visualised.
 * @param {(d: T) => number} props.xAccessor - Function to extract the X value from a datum.
 * @param {(d: T) => number} props.yAccessor - Function to extract the Y value from a datum.
 * @param {number} props.width - The pixel width of the chart area.
 * @param {number} props.height - The pixel height of the chart area.
 * @param {{ x: [number, number]; y: [number, number]; }} [props.initialViewport] - Optional. The initial visible data domain for the viewport, as [min, max] for each axis. If omitted, the viewport defaults to the full data extent.
 * @param {Object} [props.constraints] - Optional. Limits for viewport panning and zooming.
 *   - @property {[number | null, number | null]} x: [min, max] - Limits for the X axis domain (data-space).
 *   - @property {[number | null, number | null]} y: [min, max] - Limits for the Y axis domain (data-space).
 *   - @property {[number | null, number | null]} extentX: [min, max] - Minimum and maximum allowed width of the X viewport (zoom constraints).
 *   - @property {[number | null, number | null]} extentY: [min, max] - Minimum and maximum allowed height of the Y viewport (zoom constraints).
 * @param {React.RefObject<ResponsiveChartViewportType>} [props.viewportRef] - Optional. Ref to expose imperative viewport controls to parent components.
 *
 * @returns {React.ReactNode} The children to render within the viewport context. These will have access to the viewport state and scales.
 *
 * @example
 * ```jsx
 * <ResponsiveChartViewport data={data} xAccessor={xAccessor} yAccessor={yAccessor} width={width} height={height} initialViewport={initialViewport} constraints={constraints} viewportRef={viewportRef}>
 * 	<Chart />
 * </ResponsiveChartViewport>
 * ```
 */
export function ResponsiveChartViewport<T>({
	children,
	data,
	xAccessor,
	yAccessor,
	width,
	height,
	initialViewport,
	constraints = {
		x: [null, null],
		y: [null, null],
	},
	viewportRef,
}: ResponsiveChartViewportProps<T>) {

	// Create base scales for full data range
	/**
	 * Calculate xDomain and yDomain as tuple ranges [min, max] using Math.min/Math.max.
	 * If data is empty, default to [0, 1].
	 */
	const xValues = data.map(xAccessor);
	const yValues = data.map(yAccessor);

	// Calculate base domains from data
	const baseXDomain: [number, number] = xValues.length
		? [Math.min(...xValues), Math.max(...xValues)]
		: [0, 1];

	const baseYDomain: [number, number] = yValues.length
		? [Math.min(...yValues), Math.max(...yValues)]
		: [0, 1];

	// Expand domains if constraints are larger than data extents
	const xDomain: [number, number] = [
		constraints?.x?.[0] !== null && constraints?.x?.[0] !== undefined 
			? Math.min(baseXDomain[0], constraints.x![0]) 
			: baseXDomain[0],
		constraints?.x?.[1] !== null && constraints?.x?.[1] !== undefined 
			? Math.max(baseXDomain[1], constraints.x![1]) 
			: baseXDomain[1]
	];

	const yDomain: [number, number] = [
		constraints?.y?.[0] !== null && constraints?.y?.[0] !== undefined 
			? Math.min(baseYDomain[0], constraints.y![0]) 
			: baseYDomain[0],
		constraints?.y?.[1] !== null && constraints?.y?.[1] !== undefined 
			? Math.max(baseYDomain[1], constraints.y![1]) 
			: baseYDomain[1]
	];

	// Clamp zoom extent constraints to the available range within position constraints
	const viewportConstraints = useMemo(() => {
		// If constraints are provided, use them as-is and do not auto-generate or clamp
		if (constraints) {
			return constraints;
		}

		// Otherwise, auto-generate constraints from the domain range
		const xMin = xDomain[0];
		const xMax = xDomain[1];
		const yMin = yDomain[0];
		const yMax = yDomain[1];

		const autoConstraints = {
			x: [xMin, xMax] as [number | null, number | null],
			y: [yMin, yMax] as [number | null, number | null],
			extentX: [null, (xMax - xMin)] as [number | null, number | null],
			extentY: [null, (yMax - yMin)] as [number | null, number | null],
		};

		return autoConstraints;
	}, [constraints, xDomain, yDomain]);

	// Base scales (full data range) - these never change
	const xScale = scaleLinear({
		domain: xDomain,
		range: [0, width],
	});
	
	const yScale = scaleLinear({
		domain: yDomain,
		range: [height, 0],
	});

	// Consolidated viewport state
	const [viewport, setViewport] = useState<ViewportState>({
		x: initialViewport?.x || xDomain,
		y: initialViewport?.y || yDomain,
	});

	// Drag state for tracking isDragging and initial viewport
	const [isDragging, setIsDragging] = useState(false);
	const dragStartViewport = useRef<ViewportState | null>(null);

	// Mouse tracking state
	const [mouseCoordinates, setMouseCoordinates] = useState<MouseCoordinates | null>(null);
	const [isMouseOverChart, setIsMouseOverChart] = useState(false);

	// Global wheel event prevention for chart elements
	useEffect(() => {
		const handleWheel = (event: WheelEvent) => {
			// Check if the wheel event is over a chart element with wheel interaction capabilities
			const target = event.target as Element;
			if (target) {
				// Only prevent wheel events on elements that actually have wheel interaction capabilities
				// Look for chart elements with data-chart-viewport attribute or touch-action: none
				const chartElement = target.closest('[data-chart-viewport]') || 
					target.closest('rect[style*="touch-action: none"]');
				
				if (chartElement) {
					event.preventDefault();
					event.stopPropagation();
				}
			}
		};

		// Use passive: false to allow preventDefault
		document.addEventListener('wheel', handleWheel, { passive: false });
		
		return () => {
			document.removeEventListener('wheel', handleWheel);
		};
	}, []);

	// Viewport scales - memoized to prevent unnecessary re-renders
	const xScaleView = useMemo(() => scaleLinear({
		domain: viewport.x,
		range: [0, width],
	}), [viewport.x[0], viewport.x[1], width]);

	const yScaleView = useMemo(() => scaleLinear({
		domain: viewport.y,
		range: [height, 0],
	}), [viewport.y[0], viewport.y[1], height]);

	// Mouse coordinate update function
	const updateMouseCoordinates = useCallback((event: React.MouseEvent | MouseEvent, element: Element) => {
		const rect = element.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		const dataX = xScaleView.invert(mouseX);
		const dataY = yScaleView.invert(mouseY);

		setMouseCoordinates({
			screen: { x: mouseX, y: mouseY },
			data: { x: dataX, y: dataY },
		});
		setIsMouseOverChart(true);
	}, [xScaleView, yScaleView]);

	/**
	 * @function translateViewport
	 * translateViewport(x: number, y: number)
	 * 
	 * Translate the viewport by a given amount.
	 * 
	 * @param x - The amount to translate the viewport by on the x-axis.
	 * @param y - The amount to translate the viewport by on the y-axis.
	 * 
	 * @example
	 * ```jsx
	 * <button onClick={() => {
	 * 	if (viewportRef.current) {
	 * 	  viewportRef.current.view.move(10, 0);
	 * 	}
	 * }}>
	 * 	Move right
	 * </button>
	 * ```
	 */
	function translateViewport(x: number, y: number) {
		// Calculate new X domain by shifting both ends by x units
		// This moves the visible window horizontally in data space
		const newXDomain: [number, number] = [
			viewport.x[0] + x, // Shift left edge
			viewport.x[1] + x  // Shift right edge
		];

		// Calculate new Y domain by shifting both ends by y units
		// This moves the visible window vertically in data space
		const newYDomain: [number, number] = [
			viewport.y[0] + y, // Shift bottom edge (in data space)
			viewport.y[1] + y  // Shift top edge (in data space)
		];

		// Apply all constraints (position and extent) to the new X domain
		// Ensures the viewport does not pan outside allowed data bounds
		const constrainedXDomain = applyAllConstraints(newXDomain, 'x', viewportConstraints);

		// Apply all constraints (position and extent) to the new Y domain
		const constrainedYDomain = applyAllConstraints(newYDomain, 'y', viewportConstraints);

		// Update the viewport state with the constrained domains
		setViewport({
			x: constrainedXDomain,
			y: constrainedYDomain,
		});
	}

	/**
	 * @function resetViewport
	 * 
	 * Reset the viewport to the initial extents as defined by `initialViewport`.
	 * If `initialViewport` is not provided, the viewport is reset to the full data extent
	 * and will behave similarly to `zoomToExtents()`.
	 * 
	 * @example
	 * ```jsx
	 * <button onClick={() => {
	 * 	if (viewportRef.current) {
	 * 	  viewportRef.current.view.reset();
	 * 	}
	 * }}>
	 * 	Reset
	 * </button>
	 * ```
	 */
	function resetViewport() {
		const resetXDomain = initialViewport?.x || xDomain;
		const resetYDomain = initialViewport?.y || yDomain;
		
		// Apply constraints to ensure the reset viewport respects all bounds
		const constrainedXDomain = applyAllConstraints(resetXDomain, 'x', viewportConstraints);
		const constrainedYDomain = applyAllConstraints(resetYDomain, 'y', viewportConstraints);
		
		setViewport({
			x: constrainedXDomain,
			y: constrainedYDomain,
		});
	}

	/**
	 * @function zoomViewport
	 * zoomViewport(factor: number, center?: { x: number; y: number }, axis?: 'x' | 'y' | 'both')
	 * 
	 * Zoom the viewport by a factor around a specified center point.
	 * 
	 * @param factor - The factor to zoom by. > 1 zooms in, < 1 zooms out.
	 * @param center - Optional data coordinates to center the zoom on. If omitted, uses viewport center.
	 * @param axis - Optional axis constraint ('x', 'y', or 'both'). Defaults to 'both'.
	 * 
	 * @example
	 * ```jsx
	 * <button onClick={() => {
	 * 	if (viewportRef.current) {
	 * 	  viewportRef.current.view.zoom(1.2); // Zoom in by 20% on both axes
	 * 	}
	 * }}>
	 * 	Zoom in
	 * </button>
	 * 
	 * <button onClick={() => {
	 * 	if (viewportRef.current) {
	 * 	  viewportRef.current.view.zoom(1.1, undefined, 'x'); // Zoom in by 10% on X-axis only
	 * 	}
	 * }}>
	 * 	Zoom X-axis only
	 * </button>
	 * ```
	 */
	function zoomViewport(factor: number, center?: { x: number; y: number }, axis: 'x' | 'y' | 'both' = 'both') {
		// Determine the centre of zoom.
		// If a centre is provided, use it; otherwise, use the midpoint of the current viewport.
		const centerX = center?.x ?? (viewport.x[0] + viewport.x[1]) / 2;
		const centerY = center?.y ?? (viewport.y[0] + viewport.y[1]) / 2;

		// Calculate the current width and height of the viewport in data space.
		const xRange = viewport.x[1] - viewport.x[0];
		const yRange = viewport.y[1] - viewport.y[0];

		// Calculate the new width and height after zooming based on axis parameter
		// A factor > 1 zooms in (smaller range), < 1 zooms out (larger range).
		const newXRange = axis === 'y' ? xRange : xRange / factor;
		const newYRange = axis === 'x' ? yRange : yRange / factor;

		// Calculate the relative position of the zoom center within the current viewport
		// This preserves the proportional position of the zoom center in the new viewport
		const relativePosition = {
			x: (centerX - viewport.x[0]) / xRange,
			y: (centerY - viewport.y[0]) / yRange
		};

		// Compute the new domain bounds that preserve the relative position of the zoom center
		const newViewport = {
			x: [
				centerX - (relativePosition.x * newXRange),
				centerX + ((1 - relativePosition.x) * newXRange)
			] as [number, number],
			y: [
				centerY - (relativePosition.y * newYRange),
				centerY + ((1 - relativePosition.y) * newYRange)
			] as [number, number]
		};

		// Apply all constraints (position and extent) to ensure the viewport stays within allowed bounds.
		// Pass the relative positions to preserve the zoom center's relative position during constraint application
		const constrainedXDomain = applyAllConstraints(newViewport.x, 'x', viewportConstraints, relativePosition.x);
		const constrainedYDomain = applyAllConstraints(newViewport.y, 'y', viewportConstraints, relativePosition.y);

		// Update the viewport state with the new, constrained domains.
		setViewport({
			x: constrainedXDomain,
			y: constrainedYDomain,
		});
	}

	/**
	 * @function zoomToExtents
	 * 
	 * Zoom the viewport to show the full data extents.
	 * 
	 * @example
	 * ```jsx
	 * <button onClick={() => {
	 * 	if (viewportRef.current) {
	 * 	  viewportRef.current.view.zoomToExtents();
	 * 	}
	 * }}>
	 * 	Show all data
	 * </button>
	 * ```
	 */
	function zoomToExtents() {
		// Apply constraints to ensure the extents viewport respects all bounds
		const constrainedXDomain = applyAllConstraints(xDomain, 'x', viewportConstraints);
		const constrainedYDomain = applyAllConstraints(yDomain, 'y', viewportConstraints);
		
		setViewport({
			x: constrainedXDomain,
			y: constrainedYDomain,
		});
	}

	/**
	 * @function createDragHandler
	 * Creates a drag handler function based on configuration
	 */
	const createDragHandler = useCallback((config: DragConfig) => {
		return ({ 
			active, 
			movement: [mx, my]
		}: { 
			active: boolean; 
			movement: [number, number];
		}) => {
			setIsDragging(active);
			
			if (active) {
				// Store initial viewport state on first drag frame
				if (!dragStartViewport.current) {
					dragStartViewport.current = { ...viewport };
				}
				
				// Calculate deltas based on config
				const dataDeltaX = config.axis !== 'y' 
					? (mx / width) * (dragStartViewport.current.x[1] - dragStartViewport.current.x[0])
					: 0;
				const dataDeltaY = config.axis !== 'x'
					? (my / height) * (dragStartViewport.current.y[1] - dragStartViewport.current.y[0])
					: 0;
				
				// Apply inversion
				const finalDeltaX = config.invert ? dataDeltaX : -dataDeltaX;
				const finalDeltaY = config.invert ? -dataDeltaY : dataDeltaY;
				
				// Calculate target viewport
				const targetXDomain: [number, number] = config.axis !== 'y' ? [
					dragStartViewport.current.x[0] + finalDeltaX,
					dragStartViewport.current.x[1] + finalDeltaX
				] : viewport.x;
				
				const targetYDomain: [number, number] = config.axis !== 'x' ? [
					dragStartViewport.current.y[0] + finalDeltaY,
					dragStartViewport.current.y[1] + finalDeltaY
				] : viewport.y;
				
				// Apply constraints
				const constrainedXDomain = applyAllConstraints(targetXDomain, 'x', viewportConstraints);
				const constrainedYDomain = applyAllConstraints(targetYDomain, 'y', viewportConstraints);
				
				// Update viewport
				setViewport({
					x: constrainedXDomain,
					y: constrainedYDomain,
				});
			} else {
				dragStartViewport.current = null;
			}
		};
	}, [viewport, viewportConstraints, width, height]);

	/**
	 * @function useConfigurableDrag
	 * Single configurable drag hook that replaces multiple individual hooks
	 */
	const useConfigurableDrag = useCallback((config: DragConfig) => {
		const handler = createDragHandler(config);
		return useDrag(handler, {
			filterTaps: true,
			preventScroll: true,
			...config.options,
		});
	}, [createDragHandler]);

	// Memoize common configurations to prevent unnecessary re-creation
	const dragConfigs = useMemo(() => ({
		both: { axis: 'both' as const, invert: false },
		x: { axis: 'x' as const, invert: false },
		y: { axis: 'y' as const, invert: false },
		xInverted: { axis: 'x' as const, invert: true },
		yInverted: { axis: 'y' as const, invert: true },
		bothInverted: { axis: 'both' as const, invert: true },
	}), []);

	// Create drag bind functions using the configurable hook
	const bindDrag = useConfigurableDrag(dragConfigs.both);
	const bindDragX = useConfigurableDrag(dragConfigs.x);
	const bindDragY = useConfigurableDrag(dragConfigs.y);
	const bindDragXInverted = useConfigurableDrag(dragConfigs.xInverted);
	const bindDragYInverted = useConfigurableDrag(dragConfigs.yInverted);
	const bindDragInverted = useConfigurableDrag(dragConfigs.bothInverted);

	// @use-gesture/react wheel handler
	const bindWheel = useWheel(({ 
		delta: [dx, dy], 
		offset: [ox, oy],
		velocity: [vx, vy],
		direction: [dirX, dirY],
		event 
	}) => {
		// Calculate zoom factor from wheel delta
		const delta = dy;
		const baseZoomFactor = delta < 0 ? 1.1 : 0.9; // Zoom in by 10% or zoom out by 10%
		const zoomFactor = baseZoomFactor;
		
		// Calculate zoom center from event position
		if (event && event.currentTarget) {
			const rect = (event.currentTarget as Element).getBoundingClientRect();
			const mouseX = event.clientX - rect.left;
			const mouseY = event.clientY - rect.top;
			
			const zoomCenterX = xScaleView.invert(mouseX);
			const zoomCenterY = yScaleView.invert(mouseY);
			
			// Apply zoom with constraints
			zoomViewport(zoomFactor, { x: zoomCenterX, y: zoomCenterY }, 'both');
		}
	}, {
		preventDefault: true,
		eventOptions: { passive: false }
	});



	// Combined gesture bind function
	const bindGestures = useCallback((config: { 
		dragAxis?: 'x' | 'y' | 'both', 
		wheelAxis?: 'x' | 'y' | 'both', 
		invertDrag?: boolean, 
		invertWheel?: boolean 
	} = {}) => {
		const { dragAxis = 'both', wheelAxis = 'both', invertDrag = false, invertWheel = false } = config;
		
		// Select the appropriate pre-configured drag bind based on configuration
		let dragBind;
		if (invertDrag) {
			// Use axis-specific inverted handlers when invertDrag is true
			if (dragAxis === 'x') {
				dragBind = bindDragXInverted();
			} else if (dragAxis === 'y') {
				dragBind = bindDragYInverted();
			} else {
				dragBind = bindDragInverted(); // Both axes inverted
			}
		} else {
			// Use normal axis-specific handlers
			if (dragAxis === 'x') {
				dragBind = bindDragX();
			} else if (dragAxis === 'y') {
				dragBind = bindDragY();
			} else {
				dragBind = bindDrag(); // Both axes normal
			}
		}
		
		// Create wheel bind with config
		const wheelBind = bindWheel();
		
		// Combine the bind props
		return {
			...dragBind,
			// Don't spread wheelBind to avoid conflicts
			// Create custom wheel handler that properly prevents scrolling
			onWheel: (e: React.WheelEvent) => {
				// Handle wheel event directly instead of relying on @use-gesture/react
				const delta = e.deltaY;
				const baseZoomFactor = delta < 0 ? 1.1 : 0.9; // Zoom in by 10% or zoom out by 10%
				const zoomFactor = baseZoomFactor;
				
				// Calculate zoom center from event position
				const rect = e.currentTarget.getBoundingClientRect();
				const mouseX = e.clientX - rect.left;
				const mouseY = e.clientY - rect.top;
				
				const zoomCenterX = xScaleView.invert(mouseX);
				const zoomCenterY = yScaleView.invert(mouseY);
				
				// Apply zoom with constraints
				zoomViewport(zoomFactor, { x: zoomCenterX, y: zoomCenterY }, 'both');
			}
		};
	}, [bindDrag, bindDragX, bindDragY, bindDragXInverted, bindDragYInverted, bindDragInverted, bindWheel, xScaleView, yScaleView, zoomViewport]);

	// Create configurable bindDrag function that selects from pre-configured hooks
	const bindDragConfigurable = useCallback((config?: Partial<DragConfig>) => {
		const axis = config?.axis ?? 'both';
		const invert = config?.invert ?? false;
		
		// Select the appropriate pre-configured drag bind
		if (invert) {
			if (axis === 'x') return bindDragXInverted();
			if (axis === 'y') return bindDragYInverted();
			return bindDragInverted(); // both
		} else {
			if (axis === 'x') return bindDragX();
			if (axis === 'y') return bindDragY();
			return bindDrag(); // both
		}
	}, [bindDrag, bindDragX, bindDragY, bindDragXInverted, bindDragYInverted, bindDragInverted]);

	const viewportManager: ResponsiveChartViewportType = useMemo(() => ({
		plotArea: {
			width,
			height,
		},
		dataScale: {
			x: xScale,
			y: yScale,
		},
		viewportScale: {
			x: xScaleView,
			y: yScaleView,
		},
		mouse: {
			coordinates: mouseCoordinates,
			isOverChart: isMouseOverChart,
			updateCoordinates: updateMouseCoordinates,
		},
		view: {
			move: translateViewport,
			zoom: zoomViewport,
			reset: resetViewport,
			zoomToExtents,
		},
		drag: {
			bindDrag: bindDragConfigurable,
			bindWheel,
			bindGestures,
			isDragging,
		},
	}), [width, height, xScale, yScale, xScaleView, yScaleView, mouseCoordinates, isMouseOverChart, updateMouseCoordinates, translateViewport, zoomViewport, resetViewport, zoomToExtents, bindDragConfigurable, bindWheel, bindGestures, isDragging]);

	// Expose viewport functions via ref if provided
	useImperativeHandle(viewportRef, () => viewportManager, [viewportManager]);
	
	return (
		<ResponsiveChartViewportContext.Provider value={viewportManager}>	
				{children}
			</ResponsiveChartViewportContext.Provider>
		);
}

/**
 * useResponsiveChartViewport Hook
 * 
 * Hook to access viewport state from ResponsiveChartViewport context
 * 
 * @property {Object} plotArea Chart dimensions and layout information.
 *   - `width`: The current width of the plot area in pixels.
 *   - `height`: The current height of the plot area in pixels.
 * @property {Object} dataScale D3 scales covering the full data domain (unzoomed).
 *   - `x`: Scale for mapping all X data points to pixel space (e.g., for brushes or extents).
 *   - `y`: Scale for mapping all Y data points to pixel space (e.g., for brushes or extents).
 * @property {Object} viewportScale D3 scales covering the current visible viewport (zoomed/panned).
 *   - `x`: Scale for X axis and plotting visible data.
 *   - `y`: Scale for Y axis and plotting visible data.
 * @property {Object} mouse Current mouse coordinates and tracking state.
 *   - `coordinates`: Current mouse position in both screen and data coordinates.
 *   - `isOverChart`: Whether the mouse is currently over the chart area.
 *   - `updateCoordinates`: Function to update mouse coordinates from a mouse event.
 * @property {Object} view Viewport manipulation functions.
 *   - `move`: Pan the viewport by a given delta in data units. Positive values move right/up.
 *   - `zoom`: Zoom the viewport by a scale factor, optionally around a data-space center point.
 *   - `reset`: Reset the viewport to its initial state (as defined by initialViewport or data extents).
 *   - `zoomToExtents`: Zoom the viewport to fit the full data extents.
 * @property {Object} drag Drag and wheel interaction functions.
 *   - `bindDrag`: Returns gesture bind props for drag interactions with optional configuration.
 *   - `bindWheel`: Returns gesture bind props for wheel interactions.
 *   - `bindGestures`: Returns gesture bind props for combined drag and wheel interactions.
 *   - `isDragging`: Whether a drag operation is currently in progress.
 */
export function useResponsiveChartViewport(): ResponsiveChartViewportType {
	const context = useContext(ResponsiveChartViewportContext);
	if (!context) {
		throw new Error('useResponsiveChartViewport must be used within a ResponsiveChartViewport component');
	}
	return context;
}
