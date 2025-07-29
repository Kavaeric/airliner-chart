"use client";

// [IMPORT] React //
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// [IMPORT] External libraries //
import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { AxisLeft, AxisBottom } from '@visx/axis';
import { extent } from 'd3-array';
import { ResponsiveSVG } from "@/context/ResponsiveSVG";
import { ResponsiveChartViewport, useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";
import { Grid } from '@visx/grid';

/**
 * Custom hook to observe element size changes using ResizeObserver
 * 
 * @param callback - Function called whenever the element's size changes
 * @returns ref - React ref to attach to the element you want to measure
 */
function useResizeObserver(callback: (dimensions: { width: number; height: number }) => void) {
	const ref = useRef<HTMLDivElement>(null);
	
	const observerCallback = useCallback((entries: ResizeObserverEntry[]) => {
		for (const entry of entries) {
			const { width, height } = entry.contentRect;
			callback({ width, height });
		}
	}, [callback]);
	
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		
		const observer = new ResizeObserver(observerCallback);
		observer.observe(element);
		
		return () => {
			observer.disconnect();
		};
	}, [observerCallback]);
	
	return ref;
}

/**
 * ChartContent Component
 * Renders the chart content using the ResponsiveChartViewport context
 */
function ChartContent({ 
	data, 
	resizeObserverRef
}: { 
	data: number[][]; 
	resizeObserverRef: React.RefObject<HTMLDivElement>;
}) {
	const { plotArea, viewportScale, drag } = useResponsiveChartViewport();
	
	// Create wheel handler for both axes
	const wheelHandler = drag.wheelZoom('both');
	
	return (
		<div 
			style={{
				display: "grid",
				gridTemplateColumns: "32px 1fr",
				gridTemplateRows: "minmax(0, 1fr) 32px",
				width: "100%",
				height: "50vh",
				gap: 0,
			}}
		>
		{/* Y-axis (top-left) - uses zoomed scale */}
		<ResponsiveSVG 
			parentSizeProps={{ debounceTime: 1, style: { background: "#ffe0e0"}}}
		>
			<Group transform={`translate(${32}, ${0})`}>
				<AxisLeft
					scale={viewportScale.y}
					label="Y Value"
					labelOffset={40}
					tickLabelProps={() => ({
						fontSize: 12,
						textAnchor: 'end',
						fill: '#000',
						dy: '0.33em'
					})}
				/>
			</Group>
			<rect
				x={0}
				y={0}
				width="100%"
				height="100%"
				fill="transparent"
				onTouchStart={(e) => drag.start(e, 'y')}
				onTouchMove={drag.move}
				onTouchEnd={drag.end}
				onMouseDown={(e) => drag.start(e, 'y')}
				onMouseMove={drag.move}
				onMouseUp={drag.end}
				style={{ touchAction: 'none' }}
			/>
		</ResponsiveSVG>

		{/* Chart area (top-right) - uses zoomed scales */}
		<ResponsiveSVG 
			divProps={{
				ref: resizeObserverRef,
				style: {background: "#d0d0ff"}
			}}
			parentSizeProps={{
				debounceTime: 1
			}}
		>
			<rect
				x={0}
				y={0}
				width="100%"
				height="100%"
				fill="#fff"
				onTouchStart={drag.start}
				onTouchMove={drag.move}
				onTouchEnd={drag.end}
				onMouseDown={drag.start}
				onMouseMove={drag.move}
				onMouseUp={drag.end}
				onMouseLeave={() => {
					if (drag.isDragging) drag.end();
				}}
				onWheel={wheelHandler}
				style={{ cursor: 'grab', touchAction: 'none'  }}
			/>
			<Grid
				xScale={viewportScale.x}
				yScale={viewportScale.y}
				width={plotArea.width}
				height={plotArea.height}
				stroke="#e0e0e0"
				numTicksRows={10}
				numTicksColumns={10}
				style={{shapeRendering: 'geometricPrecision'}}
			/>
			<Group>
				{data.map((d, i) => (
					<circle
						key={i}
						cx={viewportScale.x(d[0]) as number}
						cy={viewportScale.y(d[1]) as number}
						r={2}
						fill="red"
					/>
				))}
			</Group>
		</ResponsiveSVG>

		{/* Empty bottom-left */}
		<div style={{ background: "#e0e0e0", width: "32px", height: "32px" }}>
		</div>

		{/* X-axis (bottom-right) - uses zoomed scale */}
		<ResponsiveSVG parentSizeProps={{ debounceTime: 1, style: { background: "#e0ffe0"} }}>
			<AxisBottom
				top={0}
				scale={viewportScale.x}
				label="X Value"
				labelOffset={30}
				tickLabelProps={() => ({
					fontSize: 12,
					textAnchor: 'middle',
					fill: '#000',
					dy: '-0.5em'
				})}
			/>
		</ResponsiveSVG>
		</div>
	);
}

/**
 * ZoomTest Component
 * Displays a simple scatter plot of data using visx with viewport functionality
 * ResponsiveChartViewport wraps the entire chart to provide consistent viewport state to all components
 */
export default function ZoomDemo() {

	const data = [
		[0, 0],
		[0, 100],
		[100, 0],
		[100, 100],
		[45.1, 23.4],
		[67.8, 54.2],
		[29.5, 10.7],
		[83.2, 91.5],
		[56.4, 38.9],
		[14.7, 72.1],
		[98.3, 65.4],
		[33.2, 48.6],
		[77.7, 19.8],
		[21.9, 59.3],
		[62.5, 80.2],
		[5.6, 34.7],
		[88.1, 12.9],
		[41.3, 99.2],
	]

	// [STATE] Store viewport object for button control //
	const viewportRef = useRef<any>(null);
	
	// [STATE] Dynamic dimensions for Viewport //
	const [viewportWidth, setViewportWidth] = useState(1200);
	const [viewportHeight, setViewportHeight] = useState(800);

	// Viewport constraints in data space
	const viewportConstraints = useMemo(() => ({
		x: [-50, 200] as [number | null, number | null],		// X-axis constraints
		y: [-50, 200] as [number | null, number | null],		// Y-axis constraints
		extentX: [10, 1000] as [number | null, number | null],	// Zoom X constraints
		extentY: [10, 1000] as [number | null, number | null],	// Zoom Y constraints
	}), []);

	const initialViewport = useMemo(() => ({
		x: [0, 50] as [number, number],
		y: [0, 50] as [number, number],
	}), []);
	
	// [HOOK] ResizeObserver ref  //
	const resizeObserverRef = useResizeObserver((dims) => {
		setViewportWidth(dims.width);
		setViewportHeight(dims.height);
	}) as React.RefObject<HTMLDivElement>;
	
	// [ACCESSOR] Functions for data points //
	const x = (d: any) => d[0];
	const y = (d: any) => d[1];

	return (
		<div>
			<p>Testing ResponsiveChartViewport</p>

			<button onClick={() => {
				if (viewportRef.current) {
					viewportRef.current.translateViewport(-10, 0);
				}
			}}>
				Move left
			</button>

			<button onClick={() => {
				if (viewportRef.current) {
					viewportRef.current.translateViewport(10, 0);
				}
			}}>
				Move right
			</button>
			<button onClick={() => {
				if (viewportRef.current) {
					viewportRef.current.translateViewport(0, 10);
				}
			}}>
				Move up
			</button>

			<button onClick={() => {
				if (viewportRef.current) {
					viewportRef.current.translateViewport(0, -10);
				}
			}}>
				Move down
			</button>

			<button onClick={() => {
				if (viewportRef.current) {
					viewportRef.current.zoomViewport(1.2);
				}
			}}>
				Zoom in
			</button>

			<button onClick={() => {
				if (viewportRef.current) {
					viewportRef.current.zoomViewport(0.8);
				}
			}}>
				Zoom out
			</button>

			<button onClick={() => {
				if (viewportRef.current) {
					viewportRef.current.zoomToExtents();
				}
			}}>
				Extents
			</button>

			<button onClick={() => {
				if (viewportRef.current) {
					viewportRef.current.resetViewport();
				}
			}}>
				Reset
			</button>

			{/* ResponsiveChartViewport wraps the entire chart grid */}
			<ResponsiveChartViewport
				data={data}
				xAccessor={x}
				yAccessor={y}
				width={viewportWidth}
				height={viewportHeight}
				viewportRef={viewportRef}
				initialViewport={initialViewport}
				constraints={viewportConstraints}
			>
				<ChartContent 
					data={data} 
					resizeObserverRef={resizeObserverRef}
				/>
			</ResponsiveChartViewport>
		</div>
	);
}
