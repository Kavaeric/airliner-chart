// [IMPORT] React and core libraries //
import { useState, useEffect, useRef, useMemo } from "react";

// [IMPORT] Internal components //
import ChartContainer from "@/component/chart/ChartContainer";
import AirlinerScatterPlot from "./AirlinerScatterPlot";
import YAxis from "@/component/chart/ChartYAxis";
import XAxis from "@/component/chart/ChartXAxis";
import ChartBrush from "@/component/chart/ChartBrush";

// [IMPORT] Context providers/hooks //
import { ChartLayoutContext } from "@/context/ChartLayoutContext";
import { ChartScalesContext } from "@/context/ChartScalesContext";
import { ChartFormatContext } from "@/context/ChartFormatContext";
import { createChartDataContext } from "@/context/ChartDataContext";
import { useDebugMode } from "@/context/DebugModeContext";

// [IMPORT] Utilities/helpers //
import { useChartDimensions } from "@/lib/hooks/use-chart-dimensions";
import { useChartScales } from "@/lib/hooks/use-chart-scales";
import { useChartViewport } from "@/lib/hooks/use-chart-viewport";

// [IMPORT] Types/interfaces //
import type { ChartViewport } from "@/types/zoom";
import type { AirlinerData, AirlinerModel } from "@/lib/data/airliner-types";

// Create a typed ChartDataContext for AirlinerModel
export const { ChartDataContext, useChartData } = createChartDataContext<AirlinerModel>();

// Props for the airliner chart component
interface AirlinerChartProps {
	data: AirlinerData[];
	className?: string;
}

// Type for chartViewportLimits supporting null for unbounded
interface ChartViewportLimits {
	x: [number | null, number | null];
	y: [number | null, number | null];
}

/**
 * AirlinerChart Component
 *
 * Top-level chart orchestrator. Handles:
 * - Container and padding measurement (via useChartDimensions)
 * - Axis measurement (child-to-parent via onDimensionsChange)
 * - Chart area calculation (subtracts axis sizes and padding)
 * - Scale creation (data-to-pixel mapping)
 * - Chart data transformation (into AirlinerModel)
 * - Passing all layout and scale info to child components
 *
 * This architecture ensures robust, race-condition-free measurement and
 * clear separation of layout, measurement, and rendering concerns.
 */
export default function AirlinerChart({ data }: AirlinerChartProps) {
	// Debug mode state management
	const { debugMode, setDebugMode } = useDebugMode();
	
	 // Transform raw CSV into chart-ready Airliner data with IDs
	 const chartData: AirlinerData[] = useMemo(() => {
		return data.map(airliner => ({
			airlinerID: airliner.airlinerID,
			airlinerData: airliner.airlinerData,
		}))
	 }, [data]);

	// Measure container size and padding only (no axis logic here)
	const [layout, chartContainerRef] = useChartDimensions();

	// Axis dimensions are measured by the axis components and reported up
	const [yAxisDims, setYAxisDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
	const [xAxisDims, setXAxisDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
	
	// Brush dimensions (will be measured by brush components)
	const [yBrushDims, setYBrushDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
	const [xBrushDims, setXBrushDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

	// Calculate the available chart area (subtract axis sizes, brush sizes, and padding)
	const chartWidth = layout.chartDimensions.chartWidth;
	const chartHeight = layout.chartDimensions.chartHeight;
	const paddingHorizontal = layout.chartDimensions.paddingHorizontal;
	const paddingVertical = layout.chartDimensions.paddingVertical;
	
	// Chart area width: total width - y-axis width - y-brush width - padding
	const chartAreaWidth = Math.max(0, chartWidth - yAxisDims.width - yBrushDims.width - paddingHorizontal);
	
	// Chart area height: total height - x-axis height - x-brush height - padding
	const chartAreaHeight = Math.max(0, chartHeight - xAxisDims.height - xBrushDims.height - paddingVertical);

	// Chart viewport limits: sets the limits for the chart viewport on both axes.
	const [chartViewportLimits, setChartViewportLimits] = useState<ChartViewportLimits>({
		x: [null, null],
		y: [null, null]
	});

	// Create scales for mapping data to pixel space
	const scaleConfig = {
		// Combine all relevant passenger capacity fields into a single array for yValues
		xValues: [
			...data.map(d => d.airlinerData.pax1Class),
			...data.map(d => d.airlinerData.pax2Class),
			...data.map(d => d.airlinerData.pax3Class),
			...data.map(d => d.airlinerData.paxLimit),
			...data.map(d => d.airlinerData.paxExit)
		].filter((v): v is number => typeof v === 'number' && !isNaN(v)),

		yValues: data.map(d => d.airlinerData.rangeKM).filter((v): v is number => typeof v === 'number' && !isNaN(v)),
		xLabel: "Passenger Capacity",
		yLabel: "Range (km)",
		xPadding: 25,
		yPadding: 200,
		xNiceRounding: 25,
		yNiceRounding: 500,
		chartViewportLimits: {
			x: [null, null] as [number | null, number | null],
			y: [null, null] as [number | null, number | null]
		}
	};

	// Zoom state management with limits enforcement
	const initialViewport: ChartViewport = { x: [0, 0], y: [0, 0] };
	const { 
		chartViewport, 
		setChartViewportWithLimits, 
		resetChartViewport, 
		moveChartViewport, 
		zoomChartViewport 
	} = useChartViewport(initialViewport, chartViewportLimits);

	// Generate D3 scales that map data values to pixel coordinates
	const { xScale, yScale, xScaleView, yScaleView, brushBounds, getBrushBounds } = useChartScales({ width: chartAreaWidth, height: chartAreaHeight }, scaleConfig, chartViewport);

	// After scales are created, set the viewport limits to the scale domains
	const didSetViewportLimits = useRef(false);
	useEffect(() => {
		if (!didSetViewportLimits.current) {
			setChartViewportLimits({
				x: [xScale.domain()[0], xScale.domain()[1]],
				y: [yScale.domain()[0], yScale.domain()[1]],
			});
			didSetViewportLimits.current = true;
		}
		// No dependencies needed, this will only run once
	}, []);

	// Set the initial chart viewport
	// If this is smaller than viewportLimits, the chart will start and reset to this viewport
	// but the user will still be able to zoom out past this initial view
	const initialChartViewport = () => {
		// TypeScript note: xScale.domain() returns number[], but ZoomViewport expects a tuple [number, number].
		// We know D3 linear scales always return exactly two numbers, so this cast is safe and required for type compatibility.
		return {
			x: [xScale.domain()[0], xScale.domain()[1] -350] as [number, number],
			y: [yScale.domain()[0], yScale.domain()[1]] as [number, number]
		};
	};

	// Reset zoom viewport to full dataset bounds
	const handleResetChartViewport = () => {
		resetChartViewport(initialChartViewport());
	};

	// ==== DEBUG NONSENSE ==== //
	// Debugging function to move the X axis
	const debugHandleMoveX = (offset: number) => {
		moveChartViewport(offset, 0);
	};

	// Debugging function to zoom in on the X axis
	const debugHandleZoomX = (offset: number) => {
		zoomChartViewport(offset, 0);
	};

	// Debugging function to move the Y axis
	const debugHandleMoveY = (offset: number) => {
		moveChartViewport(0, offset);
	};

	// Debugging function to zoom in on the Y axis
	const debugHandleZoomY = (offset: number) => {
		zoomChartViewport(0, offset);
	};

	// Initialize zoom viewport to full dataset bounds on mount
	const didSetInitialViewport = useRef(false);
	useEffect(() => {
		if (!didSetInitialViewport.current) {
			setChartViewportWithLimits(initialChartViewport());
			didSetInitialViewport.current = true;
		}
	}, []); // No dependencies needed, runs only once

	// Adapt tick count to rendered chart size
	const xTickCount = Math.max(2, Math.floor(chartAreaWidth / 100));
	const yTickCount = Math.max(2, Math.floor(chartAreaHeight / 100));
	const yTickGridCount = Math.max(2, Math.floor(chartAreaHeight / 50));
	const xTickGridCount = Math.max(2, Math.floor(chartAreaWidth / 100));

	// Wait for container measurement before rendering chart
	if (!layout.isChartLoaded) {
		return (
			<ChartContainer ref={chartContainerRef}>
				<p>Loading chart...</p>
			</ChartContainer>
		);
	}

	// Prepare context values for chart components
	// These objects contain all the layout, scale, and formatting information
	// that child components need to render properly
	
	// ChartLayoutContext: Provides layout dimensions and tick configuration
	// Used by axes and other components that need to know chart size and positioning
	const layoutValue = {
		chartWidth,        			// Total chart container width
		chartHeight,       			// Total chart container height  
		paddingHorizontal,          // Total horizontal padding
		paddingVertical,           	// Total vertical padding
		xAxisDims,         			// X-axis dimensions (width/height) for positioning
		yAxisDims,         			// Y-axis dimensions (width/height) for positioning
		xBrushDims,        			// X-brush dimensions (width/height) for positioning
		yBrushDims,        			// Y-brush dimensions (width/height) for positioning
		xTickCount,        			// Number of ticks to show on X-axis (responsive to width)
		yTickCount,        			// Number of ticks to show on Y-axis (responsive to height)
		yTickGridCount,				// Number of ticks to show on Y-axis (responsive to height)
		xTickGridCount,				// Number of ticks to show on X-axis (responsive to width)
		isChartLoaded: layout.isChartLoaded,  	// Whether container measurement is complete
	};
	
	// ChartScalesContext: Provides D3 scales for data-to-pixel mapping
	// Used by scatter plot and axes to convert data values to screen coordinates
	const scalesValue = { 
		xScale,      // Full dataset scale (for brushes)
		yScale,      // Full dataset scale (for brushes)
		xScaleView,  // Zoomed viewport scale (for axes and plot)
		yScaleView,  // Zoomed viewport scale (for axes and plot)
		brushBounds, // Computed brush bounds for both axes
		getBrushBounds, // Utility function for custom brush bounds
	};
	
	// ChartFormatContext: Provides axis labels and margin configuration
	// Used by axes for labeling and by scales for domain padding
	const formatValue = {
		xLabel: scaleConfig.xLabel,    // Label displayed on X-axis
		yLabel: scaleConfig.yLabel,    // Label displayed on Y-axis
		xPadding: scaleConfig.xPadding,  // Padding added to X-axis domain
		yPadding: scaleConfig.yPadding,  // Padding added to Y-axis domain
	};

	/**
	 * Handles brush movement from ChartBrush components.
	 *
	 * This function receives the new brush bounds in pixel space (SVG coordinates) from the child ChartBrush.
	 * It calculates the pixel delta for each axis, then converts these to data-space deltas using the current chart scales.
	 * The resulting data deltas are passed to moveChartViewport, which updates the chart's visible data region.
	 *
	 * This ensures that brush movement is always 1:1 with the user's mouse, regardless of zoom or scale.
	 *
	 * @param bounds - An object containing the new brush bounds for x and/or y axes as tuples: { x?: [number, number], y?: [number, number] }
	 */
	function handleBrushMove(bounds: { x?: [number, number]; y?: [number, number] }) {
		const deltaX = bounds.x ? bounds.x[0] - brushBounds.x[0] : 0;
		const deltaY = bounds.y ? bounds.y[0] - brushBounds.y[0] : 0;

		let dataDeltaX = 0;
		let dataDeltaY = 0;		
		// Convert pixel deltas to data-space deltas using the current scales
		if (deltaX !== 0) {
			dataDeltaX = xScale.invert(brushBounds.x[0] + deltaX) - xScale.invert(brushBounds.x[0]);
		}
		if (deltaY !== 0) {
			dataDeltaY = yScale.invert(brushBounds.y[0] + deltaY) - yScale.invert(brushBounds.y[0]);
		}

		// Returns deltas as whole numbers, ensuring the viewport moves by at least 1 unit
		// This prevents jittering when the user is dragging the brush slowly or past the end
		dataDeltaX = Math.round(dataDeltaX);
		dataDeltaY = Math.round(dataDeltaY);

		moveChartViewport(dataDeltaX, dataDeltaY);
	}

	// ChartLayoutContext provides layout and tick info to all chart children
	// ChartScalesContext provides D3 scales for axes and plotting
	// ChartFormatContext provides axis labels and margins
	// ChartDataContext provides the airliner data array
	return (
		<ChartDataContext.Provider value={chartData}>
		<ChartLayoutContext.Provider value={layoutValue}>
			<ChartScalesContext.Provider value={scalesValue}>
				<ChartFormatContext.Provider value={formatValue}>
					<ChartContainer ref={chartContainerRef}>
						{/* Chart area (top-right) - uses zoomed scales */}
						<AirlinerScatterPlot
							width={chartAreaWidth}
							height={chartAreaHeight}
						/>

						{/* Y-axis brush (top-left) - uses full scales */}
						<ChartBrush
							width={yBrushDims.width}
							height={chartAreaHeight}
							onDimensionsChange={setYBrushDims}
							axisMode="y"
							onBrushMove={handleBrushMove}
						/>

						{/* Y-axis (top-middle) - uses zoomed scales */}
						<YAxis
							width={yAxisDims.width}
							height={chartAreaHeight}
							onDimensionsChange={setYAxisDims}
						/>
						
						{/* X-axis (middle-right) - uses zoomed scales */}
						<XAxis
							width={chartAreaWidth}
							height={xAxisDims.height}
							onDimensionsChange={setXAxisDims}
						/>
						
						{/* X-axis brush (bottom-right) - uses full scales */}
						<ChartBrush
							width={chartAreaWidth}
							height={xBrushDims.height}
							onDimensionsChange={setXBrushDims}
							axisMode="x"
							onBrushMove={handleBrushMove}
						/>

						{/* janky debuggy zoom controls */}
						<div style={{position: 'absolute', textAlign: 'right', top: 40, right: 40, zIndex: 1000}}>
							<p>janky debuggy viewport controls</p>
							<button onClick={handleResetChartViewport}>reset zoom</button>
							<br />
							<button onClick={() => debugHandleMoveY(-1000)}>Y--</button>
							<button onClick={() => debugHandleZoomY(-1000)}>-zoom Y</button>
							<button onClick={() => debugHandleZoomY(1000)}>+zoom Y</button>
							<button onClick={() => debugHandleMoveY(1000)}>Y++</button>
							<br />
							<button onClick={() => debugHandleMoveX(-20)}>X--</button>
							<button onClick={() => debugHandleZoomX(-20)}>-zoom X</button>
							<button onClick={() => debugHandleZoomX(20)}>+zoom X</button>
							<button onClick={() => debugHandleMoveX(20)}>X++</button>
							<br />
							<input
								type="checkbox"
								id="debugMode"
								checked={debugMode}
								onChange={() => setDebugMode(!debugMode)}
							/>
							<label htmlFor="debugMode">Debug Mode</label>
						</div>
					</ChartContainer>
				</ChartFormatContext.Provider>
			</ChartScalesContext.Provider>
		</ChartLayoutContext.Provider>
		</ChartDataContext.Provider>
	);
}