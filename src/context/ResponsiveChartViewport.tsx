import { AxisScale } from "@visx/axis";
import { scaleLinear } from "@visx/scale";
import { extent } from "d3-array";
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
 * @property {Object} view Viewport manipulation functions.
 *   - `move`: Pan the viewport by a given delta in data units. Positive values move right/up.
 *   - `zoom`: Zoom the viewport by a scale factor, optionally around a data-space center point.
 *   - `reset`: Reset the viewport to its initial state (as defined by initialViewport or data extents).
 *   - `zoomToExtents`: Zoom the viewport to fit the full data extents.
 * @property {Object} drag Drag and wheel interaction functions.
 *   - `start`: Start a drag operation. Call on mouseDown/touchStart to begin viewport panning.
 *   - `move`: Handle drag movement. Call on mouseMove/touchMove during a drag operation.
 *   - `end`: End a drag operation. Call on mouseUp/touchEnd to finish viewport panning.
 *   - `wheel`: Handle mouse wheel events for zooming the viewport.
 *   - `disableScrollBehaviour`: Create a wheel handler that prevents page scrolling and calls wheel.
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
	view: {
		move: (x: number, y: number) => void; // previously translateViewport
		zoom: (factor: number, center?: { x: number; y: number }) => void; // previously zoomViewport
		reset: () => void; // previously resetViewport
		zoomToExtents: () => void; // previously zoomToExtents
	},
	drag: {
		start: (event: React.PointerEvent | React.MouseEvent | React.TouchEvent, axis?: 'x' | 'y' | 'both', invert?: boolean) => void; // previously viewDragStart
		move: (event: PointerEvent | React.MouseEvent | React.TouchEvent, invert?: boolean) => void; // previously viewDragMove
		end: (event?: PointerEvent | React.MouseEvent | React.TouchEvent) => void; // previously viewDragEnd
		wheel: (event: React.WheelEvent, axis?: 'x' | 'y' | 'both', center?: { x: number; y: number }, invert?: boolean) => void; // previously viewWheel
		disableScrollBehaviour: (axis?: 'x' | 'y' | 'both', center?: { x: number; y: number }, invert?: boolean) => (event: React.WheelEvent) => void; // previously disableScrollBehaviour
		isDragging: boolean; // previously viewIsDragging
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
 *   Use `null` to indicate no constraint for a bound.
 *
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

	// Drag state management using refs to avoid re-renders during drag
	const dragState = useRef({
		isDragging: false,
		startPos: null as { x: number; y: number } | null,
		startViewport: null as ViewportState | null,
		dragAxis: null as 'x' | 'y' | 'both' | null,
		invertDirection: false,
	});

	// Viewport scales - memoized to prevent unnecessary re-renders
	const xScaleView = useMemo(() => scaleLinear({
		domain: viewport.x,
		range: [0, width],
	}), [viewport.x[0], viewport.x[1], width]);

	const yScaleView = useMemo(() => scaleLinear({
		domain: viewport.y,
		range: [height, 0],
	}), [viewport.y[0], viewport.y[1], height]);

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
	 * zoomViewport(factor: number, center?: { x: number; y: number })
	 * 
	 * Zoom the viewport by a factor around a specified center point.
	 * 
	 * @param factor - The factor to zoom by. > 1 zooms in, < 1 zooms out.
	 * @param center - Optional data coordinates to center the zoom on. If omitted, uses viewport center.
	 * 
	 * @example
	 * ```jsx
	 * <button onClick={() => {
	 * 	if (viewportRef.current) {
	 * 	  viewportRef.current.view.zoom(1.2);
	 * 	}
	 * }}>
	 * 	Zoom in
	 * </button>
	 * ```
	 */
	function zoomViewport(factor: number, center?: { x: number; y: number }) {
		// Determine the centre of zoom.
		// If a centre is provided, use it; otherwise, use the midpoint of the current viewport.
		const centerX = center?.x ?? (viewport.x[0] + viewport.x[1]) / 2;
		const centerY = center?.y ?? (viewport.y[0] + viewport.y[1]) / 2;

		// Calculate the current width and height of the viewport in data space.
		const xRange = viewport.x[1] - viewport.x[0];
		const yRange = viewport.y[1] - viewport.y[0];

		// Calculate the new width and height after zooming.
		// A factor > 1 zooms in (smaller range), < 1 zooms out (larger range).
		const newXRange = xRange / factor;
		const newYRange = yRange / factor;

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
	 * @function viewDragStart
	 * 
	 * Start a drag operation to pan the viewport.
	 * 
	 * @param event - The mouse/touch/pointer down event.
	 * @param axis - Optional axis constraint for the drag operation ('x', 'y', or 'both'). Defaults to 'both'.
	 * 
	 * @example
	 * ```jsx
	 * <rect
	 *   onMouseDown={(e) => viewport.drag.start(e, 'x')}  // Constrain mouse movements to X-axis only
	 *   onTouchStart={(e) => viewport.drag.start(e, 'y')} // Constrain touch screen movement to Y-axis only
	 * />
	 * ```
	 */
	const viewDragStart = useCallback((event: React.PointerEvent | React.MouseEvent | React.TouchEvent, axis: 'x' | 'y' | 'both' = 'both', invert: boolean = false) => {
		// Prevent default to avoid text selection and other browser behaviors
		event.preventDefault();
		
		// Get client coordinates from the event
		const clientX = 'clientX' in event ? event.clientX : event.touches?.[0]?.clientX ?? 0;
		const clientY = 'clientY' in event ? event.clientY : event.touches?.[0]?.clientY ?? 0;
		
		dragState.current.isDragging = true;
		dragState.current.startPos = { x: clientX, y: clientY };
		dragState.current.startViewport = { ...viewport };
		dragState.current.dragAxis = axis;
		dragState.current.invertDirection = invert;
		
		// Attach global listeners so drag continues even if pointer leaves the SVG
		document.addEventListener("pointermove", viewDragMove);
		document.addEventListener("pointerup", viewDragEnd);
	}, [viewport]);

	/**
	 * @function viewDragMove
	 * 
	 * Handle drag movement to pan the viewport.
	 * 
	 * @param event - The mouse/touch/pointer move event.
	 * 
	 * @example
	 * ```jsx
	 * <rect
	 *   onMouseMove={viewport.drag.move}
	 *   onTouchMove={viewport.drag.move}
	 * />
	 * ```
	 */
	const viewDragMove = useCallback((event: PointerEvent | React.MouseEvent | React.TouchEvent, invert: boolean = false) => {
		// If a drag is not in progress, or if any of the required refs are missing, do nothing
		if (!dragState.current.isDragging || !dragState.current.startPos || !dragState.current.startViewport || !dragState.current.dragAxis) return;

		// Prevent default to avoid scrolling and other browser behaviors
		event.preventDefault();

		// Get client coordinates from the event
		const clientX = 'clientX' in event ? event.clientX : event.touches?.[0]?.clientX ?? 0;
		const clientY = 'clientY' in event ? event.clientY : event.touches?.[0]?.clientY ?? 0;

		// Calculate the total movement since drag start (like ChartBrush does)
		const totalDeltaX = clientX - dragState.current.startPos.x;
		const totalDeltaY = clientY - dragState.current.startPos.y;
		
		// Ignore tiny movements (noise)
		if (Math.abs(totalDeltaX) < 1 && Math.abs(totalDeltaY) < 1) return;

		// Convert screen deltas to data deltas using the start viewport scales
		// We need to calculate how much data space corresponds to the screen movement
		// Use startViewport to avoid using corrupted current viewport state
		const dataDeltaX = (totalDeltaX / width) * (dragState.current.startViewport.x[1] - dragState.current.startViewport.x[0]);
		const dataDeltaY = (totalDeltaY / height) * (dragState.current.startViewport.y[1] - dragState.current.startViewport.y[0]);

		// Apply invert direction if specified (either from parameter or stored state)
		const shouldInvert = invert || dragState.current.invertDirection;
		const finalDataDeltaX = shouldInvert ? -dataDeltaX : dataDeltaX;
		const finalDataDeltaY = shouldInvert ? -dataDeltaY : dataDeltaY;

		// Calculate the target viewport based on the original start viewport plus the total movement
		// Apply axis constraints based on the drag axis setting
		let targetXDomain: [number, number] = dragState.current.startViewport.x;
		let targetYDomain: [number, number] = dragState.current.startViewport.y;

		if (dragState.current.dragAxis === 'x' || dragState.current.dragAxis === 'both') {
			targetXDomain = [
				dragState.current.startViewport.x[0] - finalDataDeltaX,
				dragState.current.startViewport.x[1] - finalDataDeltaX
			];
		}

		if (dragState.current.dragAxis === 'y' || dragState.current.dragAxis === 'both') {
			targetYDomain = [
				dragState.current.startViewport.y[0] + finalDataDeltaY,
				dragState.current.startViewport.y[1] + finalDataDeltaY
			];
		}

		// Apply constraints to the target viewport
		const constrainedXDomain = applyAllConstraints(targetXDomain, 'x', viewportConstraints);
		const constrainedYDomain = applyAllConstraints(targetYDomain, 'y', viewportConstraints);

		// Validate that the constrained domains are valid numbers
		if (isNaN(constrainedXDomain[0]) || isNaN(constrainedXDomain[1]) || 
			isNaN(constrainedYDomain[0]) || isNaN(constrainedYDomain[1])) {
			/* console.warn('Invalid viewport domains detected, aborting drag update:', {
				targetXDomain,
				targetYDomain,
				constrainedXDomain,
				constrainedYDomain
			}); */
			return;
		}

		// Update the viewport state directly (bypass translateViewport to avoid double-constraining)
		setViewport({
			x: constrainedXDomain,
			y: constrainedYDomain,
		});
	}, [width, height, viewport, viewportConstraints]);

	/**
	 * @function viewDragEnd
	 * 
	 * End a drag operation.
	 * 
	 * @param event - The mouse/touch/pointer up event (optional).
	 * 
	 * @example
	 * ```jsx
	 * <rect
	 *   onMouseUp={viewport.drag.end}
	 *   onTouchEnd={viewport.drag.end}
	 *   onMouseLeave={() => {
	 *     if (viewport.drag.isDragging) viewport.drag.end();
	 *   }}
	 * />
	 * ```
	 */
	const viewDragEnd = useCallback((event?: PointerEvent | React.MouseEvent | React.TouchEvent) => {
		if (event) {
			event.preventDefault();
		}
		
		dragState.current.isDragging = false;
		dragState.current.startPos = null;
		dragState.current.startViewport = null;
		dragState.current.dragAxis = null;
		dragState.current.invertDirection = false;
		
		// Remove global listeners to avoid memory leaks
		document.removeEventListener("pointermove", viewDragMove);
		document.removeEventListener("pointerup", viewDragEnd);
	}, [viewDragMove]);

	/**
	 * @function viewWheel
	 * 
	 * Handle mouse wheel events for zooming the viewport.
	 * 
	 * @param event - The wheel event containing delta information.
	 * @param axis - Optional. Which axis to zoom ('x', 'y', or 'both'). Defaults to 'both'.
	 * @param center - Optional. Data coordinates to center the zoom on. If not provided, uses mouse cursor position.
	 * 
	 * @example
	 * ```jsx
	 * <rect
	 *   onWheel={(e) => viewport.drag.wheel(e, 'both')}                    // Zoom both axes around mouse cursor
	 *   onWheel={(e) => viewport.drag.wheel(e, 'x')}                       // Zoom X-axis only around mouse cursor
	 *   onWheel={(e) => viewport.drag.wheel(e, 'y')}                       // Zoom Y-axis only around mouse cursor
	 *   onWheel={(e) => viewport.drag.wheel(e, 'both', {x: 50, y: 25})}   // Zoom both axes around specific point
	 * />
	 * ```
	 */
	const viewWheel = useCallback((event: React.WheelEvent, axis: 'x' | 'y' | 'both' = 'both', center?: { x: number; y: number }, invert: boolean = false) => {
		// Prevent default to avoid page scrolling
		event.preventDefault();
		event.stopPropagation();

		// Determine the zoom center
		let zoomCenterX: number;
		let zoomCenterY: number;

		if (center) {
			// Use the provided center point
			zoomCenterX = center.x;
			zoomCenterY = center.y;
		} else {
			// Use the mouse cursor position as the zoom center
			const rect = event.currentTarget.getBoundingClientRect();
			const mouseX = event.clientX - rect.left;
			const mouseY = event.clientY - rect.top;

			// Convert mouse position to data coordinates using current viewport scale
			// This ensures proper zoom centering relative to what the user is seeing
			zoomCenterX = xScaleView.invert(mouseX);
			zoomCenterY = yScaleView.invert(mouseY);
		}

		// Calculate zoom factor based on wheel delta
		// Negative delta = zoom in, positive delta = zoom out
		// Normalize the delta and apply a reasonable zoom factor
		const delta = event.deltaY;
		const baseZoomFactor = delta < 0 ? 1.1 : 0.9; // Zoom in by 10% or zoom out by 10%
		
		// Apply invert direction if specified
		const zoomFactor = invert ? (1 / baseZoomFactor) : baseZoomFactor;

		// Use the zoomViewport function with the determined center
		zoomViewport(zoomFactor, { x: zoomCenterX, y: zoomCenterY });
	}, [zoomViewport]);

	// Track SVG elements with wheel handlers for global prevention
	const svgElementsWithWheel = useRef<Set<Element>>(new Set());

	// Add global wheel event prevention for SVG elements with wheel handlers
	useEffect(() => {
		const handleWheel = (event: WheelEvent) => {
			// Check if the wheel event is over an SVG element with wheel handlers
			const target = event.target as Element;
			if (target) {
				// Look for SVG elements in the event path
				const svgElement = target.tagName === 'SVG' ? target : target.closest('svg');
				if (svgElement && svgElementsWithWheel.current.has(svgElement)) {
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

	// Create a wheel handler that automatically prevents default behavior and registers the SVG
	const disableScrollBehaviour = useCallback((axis: 'x' | 'y' | 'both' = 'both', center?: { x: number; y: number }, invert: boolean = false) => {
		return (event: React.WheelEvent) => {
			// Prevent default to avoid page scrolling
			event.preventDefault();
			event.stopPropagation();
			
			// Register the SVG element for global prevention
			const svgElement = event.currentTarget.closest('svg');
			if (svgElement) {
				svgElementsWithWheel.current.add(svgElement);
			}
			
			// Call the viewWheel function with the specified axis, center, and invert flag
			viewWheel(event, axis, center, invert);
		};
	}, [viewWheel]);

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
		view: {
			move: translateViewport,
			zoom: zoomViewport,
			reset: resetViewport,
			zoomToExtents,
		},
		drag: {
			start: viewDragStart,
			move: viewDragMove,
			end: viewDragEnd,
			wheel: viewWheel,
			disableScrollBehaviour,
			isDragging: dragState.current.isDragging,
		},
	}), [width, height, xScale, yScale, xScaleView, yScaleView, translateViewport, zoomViewport, resetViewport, zoomToExtents, viewDragStart, viewDragMove, viewDragEnd, viewWheel, disableScrollBehaviour, dragState.current.isDragging]);

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
 * @property {Object} view Viewport manipulation functions.
 *   - `move`: Pan the viewport by a given delta in data units. Positive values move right/up.
 *   - `zoom`: Zoom the viewport by a scale factor, optionally around a data-space center point.
 *   - `reset`: Reset the viewport to its initial state (as defined by initialViewport or data extents).
 *   - `zoomToExtents`: Zoom the viewport to fit the full data extents.
 * @property {Object} drag Drag and wheel interaction functions.
 *   - `start`: Start a drag operation. Call on mouseDown/touchStart to begin viewport panning.
 *   - `move`: Handle drag movement. Call on mouseMove/touchMove during a drag operation.
 *   - `end`: End a drag operation. Call on mouseUp/touchEnd to finish viewport panning.
 *   - `wheel`: Handle mouse wheel events for zooming the viewport.
 *   - `disableScrollBehaviour`: Create a wheel handler that prevents page scrolling and calls wheel.
 *   - `isDragging`: Whether a drag operation is currently in progress.
 */
export function useResponsiveChartViewport(): ResponsiveChartViewportType {
	const context = useContext(ResponsiveChartViewportContext);
	if (!context) {
		throw new Error('useResponsiveChartViewport must be used within a ResponsiveChartViewport component');
	}
	return context;
}
