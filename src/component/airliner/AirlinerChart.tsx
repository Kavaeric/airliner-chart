// [IMPORT] React and core libraries //
import { useState, useEffect, useRef, useMemo } from "react";

// [IMPORT] Internal components //
import AirlinerScatterPlot from "./AirlinerScatterPlot";
import YAxis from "@/component/chart/ChartYAxis";
import XAxis from "@/component/chart/ChartXAxis";
import ChartBrush from "@/component/chart/ChartBrush";
import AirlinerScatterBrush from "./AirlinerScatterBrush";

// [IMPORT] Context providers/hooks //
import { ResponsiveChartViewport, useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";
import { createChartDataContext } from "@/context/ChartDataContext";
import { useDebugMode } from "@/context/DebugModeContext";
import { AirlinerSelectionProvider } from "@/context/AirlinerSelectionContext";

// [IMPORT] Types/interfaces //
import type { AirlinerData, AirlinerModel } from "@/lib/data/airliner-types";
import { ResponsiveSVG } from "@/context/ResponsiveSVG";
import type { ChartViewport } from "@/types/zoom";

// [IMPORT] CSS styling //
import "./AirlinerChart.css";

// [NEW] Custom ResizeObserver hook for measuring plot dimensions
function useResizeObserver(callback: (dims: { width: number; height: number }) => void) {
	const ref = useRef<HTMLDivElement>(null);
	
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				callback({ width, height });
			}
		});
		
		resizeObserver.observe(element);
		
		return () => {
			resizeObserver.disconnect();
		};
	}, [callback]);
	
	return ref;
}

// Create a typed ChartDataContext for AirlinerModel
export const { ChartDataContext, useChartData } = createChartDataContext<AirlinerModel>();

// Props for the airliner chart component
interface AirlinerChartProps {
	data: AirlinerData[];
	className?: string;
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

	// ResizeObserver for plot dimensions
	const [plotWidth, setPlotWidth] = useState(0);
	const [plotHeight, setPlotHeight] = useState(0);
	
	// ResizeObserver callback for measuring plot area
	const handlePlotResize = (dims: { width: number; height: number }) => {
		setPlotWidth(dims.width);
		setPlotHeight(dims.height);
	};

	// Store viewport object for button control
	const viewportRef = useRef<any>(null);

	// ResizeObserver ref for plot area
	const plotResizeRef = useResizeObserver(handlePlotResize);

	// Gather all passenger capacity values (across all configurations) into a single array
	// Filter out non-numeric values
	const xAxisData = chartData.flatMap(airliner => {
		const { pax1Class, pax2Class, pax3Class, paxLimit, paxExit } = airliner.airlinerData;
		return [pax1Class, pax2Class, pax3Class, paxLimit, paxExit].filter(val => typeof val === "number");
	});

	// Initialise initial viewport
	const initialChartViewport = useMemo<ChartViewport>(() => ({
		x: [
			Math.min(...xAxisData) - 50,
			Math.max(...xAxisData) - 250
		],
		y: [
			Math.min(...chartData.map(airliner => airliner.airlinerData.rangeKM ?? 0)) - 1000,
			Math.max(...chartData.map(airliner => airliner.airlinerData.rangeKM ?? 0)) + 800
		]
	}), [xAxisData, chartData]);

	// Set viewport constraints
	const viewportConstraints = useMemo(() => ({
		x: [0, 1000] as [number | null, number | null],		// X-axis constraints
		y: [0, 20000] as [number | null, number | null],		// Y-axis constraints
		extentX: [20, 1000] as [number | null, number | null],	// Zoom X constraints
		extentY: [1000, 20000] as [number | null, number | null],	// Zoom Y constraints
	}), [xAxisData, chartData]);


	// ChartLayoutContext provides layout and tick info to all chart children
	// ChartScalesContext provides D3 scales for axes and plotting
	// ChartDataContext provides the airliner data array
	// AirlinerSelectionProvider provides selection and hover state management
	return (
		<>
		<ChartDataContext.Provider value={chartData}>
		<AirlinerSelectionProvider>
		<ResponsiveChartViewport
			data={chartData}
			xAccessor={(d: AirlinerData) =>
				xAxisData.find(
					val =>
						val === d.airlinerData.pax1Class ||
						val === d.airlinerData.pax2Class ||
						val === d.airlinerData.pax3Class ||
						val === d.airlinerData.paxLimit ||
						val === d.airlinerData.paxExit
				) ?? 0
			}
			yAccessor={(d: AirlinerData) => d.airlinerData.rangeKM ?? 0}
			width={plotWidth}
			height={plotHeight}
			initialViewport={initialChartViewport}
			constraints={viewportConstraints}
			viewportRef={viewportRef}
		>
			<div className="chartControls frame-flex-horizontal">
				<hr className="frame-minor" />
				<button
					className="btn-diminished btn-icon-only"
					onClick={() => viewportRef.current.view.move(0, 1000)}
					aria-label="Pan up"
				>
					<span className="material-symbols-sharp" aria-hidden="true">keyboard_double_arrow_up</span>
				</button>
				<button
					className="btn-diminished btn-icon-only"
					onClick={() => viewportRef.current.view.move(0, -1000)}
					aria-label="Pan down"
				>
					<span className="material-symbols-sharp" aria-hidden="true">keyboard_double_arrow_down</span>
				</button>
				<button
					className="btn-diminished btn-icon-only"
					onClick={() => viewportRef.current.view.move(-50, 0)}
					aria-label="Pan left"
				>
					<span className="material-symbols-sharp" aria-hidden="true">keyboard_double_arrow_left</span>
				</button>
				<button
					className="btn-diminished btn-icon-only"
					onClick={() => viewportRef.current.view.move(50, 0)}
					aria-label="Pan right"
				>
					<span className="material-symbols-sharp" aria-hidden="true">keyboard_double_arrow_right</span>
				</button>
				<hr className="frame-minor" />
				<button
					className="btn-diminished btn-icon-only"
					onClick={() => viewportRef.current.view.zoom(1.1)}
					aria-label="Zoom in"
				>
					<span className="material-symbols-sharp" aria-hidden="true">zoom_in</span>
				</button>
				<button
					className="btn-diminished btn-icon-only"
					onClick={() => viewportRef.current.view.zoom(0.9)}
					aria-label="Zoom out"
				>
					<span className="material-symbols-sharp" aria-hidden="true">zoom_out</span>
				</button>
				<hr className="frame-minor" />
				<button
					className="btn-diminished"
					onClick={() => viewportRef.current.view.reset()}
					aria-label="Reset zoom"
				>
					<span className="material-symbols-sharp" aria-hidden="true">zoom_out_map</span>
					Reset zoom
				</button>
				<hr className="frame-minor" />
				<label className="input-switch">
					<input
						type="checkbox"
						checked={debugMode}
						onChange={() => setDebugMode(!debugMode)}
					/>
					Debug
				</label>
			</div>
			
			<hr className="frame-minor" />
			<div className="chartContainer">
				{/* Chart area (top-right) */}
				<ResponsiveSVG
					divProps={{
						className: "chartArea",
						ref: plotResizeRef, // This is the thing we want to measure as the plot area
					}}
					parentSizeProps={{ debounceTime: 1 }}
				>
					{viewportRef.current && data.length > 0
						? <AirlinerScatterPlot />
						: <p>Chart loading...</p>}
				</ResponsiveSVG>

				{/* Y-axis brush (top-left) */}
				<ResponsiveSVG
					parentSizeProps={{ debounceTime: 1 }}
					divProps={{ className: "yAxisBrush" }}
				>
					{/* Outer scatter plot (outside brush area) */}
					<AirlinerScatterBrush axisMode="y" className="airlinerBrush" />

					{/* Brush control wrapper */}
					<ChartBrush axisMode="y" className="airlinerBrushControl">
						<AirlinerScatterBrush axisMode="y" className="airlinerBrush" />
					</ChartBrush>
				</ResponsiveSVG>

				{/* Y-axis (top-middle) */}
				<ResponsiveSVG
					parentSizeProps={{ debounceTime: 1 }}
					divProps={{ className: "yAxis" }}
				>
					<YAxis label="Range (km × 1000)" />
				</ResponsiveSVG>

				{/* X-axis (middle-right) */}
				<ResponsiveSVG
					parentSizeProps={{ debounceTime: 1 }}
					divProps={{ className: "xAxis" }}
				>
					<XAxis label="Passenger Capacity" />
				</ResponsiveSVG>

				{/* X-axis brush (bottom-right) */}
				<ResponsiveSVG
					parentSizeProps={{ debounceTime: 1 }}
					divProps={{ className: "xAxisBrush" }}
				>
					{/* Outer scatter plot (outside brush area) */}
					<AirlinerScatterBrush axisMode="x" className="airlinerBrush" />

					{/* Brush control wrapper */}
					<ChartBrush axisMode="x" className="airlinerBrushControl">
						<AirlinerScatterBrush axisMode="x" className="airlinerBrush" />
					</ChartBrush>
				</ResponsiveSVG>

				{/* Empty grid areas */}
				<div className="empty1"></div>
				<div className="empty2"></div>
				<div className="empty3"></div>
				<div className="empty4"></div>
			</div>
		</ResponsiveChartViewport>
		</AirlinerSelectionProvider>
		</ChartDataContext.Provider>
		<hr className="frame-minor" style={{ margin: "0" }} />
		</>
	);
}