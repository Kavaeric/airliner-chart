"use client";

// [IMPORT] React //
import React from "react";

// [IMPORT] Third-party libraries //
import { AxisLeft } from "@visx/axis";

// [IMPORT] Context providers/hooks //
import { useResponsiveSVG } from "@/context/ResponsiveSVG";
import { useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";
import { useChartData } from "@/component/airliner/AirlinerChart";
import { Text } from "@visx/text";
import { RectCentre } from "@/component/shape/RectCentre";

interface YAxisProps {
	label?: string;
}

/**
 * YAxis Component
 *
 * Renders the left axis for the chart using visx.
 * - Measures its own rendered size using a ref and ResizeObserver
 * - Reports its dimensions up to the parent via onDimensionsChange
 * - Receives all layout and scale info as props
 * - Renders ticks and gridlines
 *
 * This enables robust, race-condition-free axis measurement and layout.
 */
export default function YAxis({ label }: YAxisProps) {
	const { viewportScale } = useResponsiveChartViewport();
	const { width, height } = useResponsiveSVG();
	const { hoveredAirlinerID, selectedAirlinerID } = useAirlinerSelection();
	const data = useChartData();

	// === Range Figure Calculation ===
	// Calculate range figure for hovered/selected airliner
	const rangeFigure = React.useMemo(() => {
		const activeAirlinerID = selectedAirlinerID || hoveredAirlinerID;
		if (!activeAirlinerID || !data) return null;

		const airliner = data.find(d => d.airlinerID === activeAirlinerID);
		if (!airliner) return null;

		const rangeKM = airliner.airlinerData.rangeKM;
		if (!rangeKM) return null;

		// Convert range to Y coordinate
		const y = viewportScale.y(rangeKM);
		if (y === undefined || y === null) return null;
		
		// Determine if this is hover or selection state
		const isSelected = selectedAirlinerID === activeAirlinerID;
		const isHovered = hoveredAirlinerID === activeAirlinerID && !isSelected;

		return {
			y: Number(y),
			rangeKM,
			state: isSelected ? 'selected' : 'hovered',
		};
	}, [hoveredAirlinerID, selectedAirlinerID, data, viewportScale.y]);

	return (
		<g style={{transform: `translateX(${width}px)`}}>
			<AxisLeft
				scale={viewportScale.y}
				numTicks={10}
				tickLength={4}
				tickFormat={d => {
					const n = Number(d);
					if (isNaN(n)) return "";
					if (Math.abs(n) >= 1000) {
						return (n / 1000).toFixed(1);
					}
					return n.toString();
				}} /* Format numbers in thousands, e.g. 2000 -> 2k */
				
				axisClassName="axis"
				axisLineClassName="axisLine"
				tickClassName="tick"
			/>

			{/* Render the axis label */}
			<text
				x={-width}
				y={height / 2}
				className="axisLabelY"
				textAnchor="middle"
			>
				{label}
			</text>

			{/* Always render range figure group, using placeholder/blank values if not hovered/selected */}
			<g className={`yAxisRangeFigure yAxisRangeFigure${rangeFigure ? (rangeFigure.state.charAt(0).toUpperCase() + rangeFigure.state.slice(1)) : "None"}`}>
				{/* Range line for hovered state, or invisible line if not hovered */}
				<line
					x1={-width}
					y1={rangeFigure && rangeFigure.y ? rangeFigure.y : 0}
					x2={0}
					y2={rangeFigure && rangeFigure.y ? rangeFigure.y : 0}
					className={`activeAirlinerYAxisLine ${rangeFigure && rangeFigure.state === 'hovered' ? "hoveredAirliner" : ""}`}
				/>

				{/* Range value text and background for selected state, or invisible/blank if not selected */}
				<g>
					<RectCentre
						cx={-width / 2}
						cy={rangeFigure && rangeFigure.y ? rangeFigure.y : 0}
						width={width}
						height={32}
						className={`activeAirlinerYAxisTextbox ${rangeFigure && rangeFigure.state === 'selected' ? "selectedAirliner" : ""}`}
					/>
					<Text
						x={0}
						y={(rangeFigure && rangeFigure.y ? rangeFigure.y : 0)}
						className={`activeAirlinerYAxisText ${rangeFigure && rangeFigure.state === 'selected' ? "selectedAirliner" : ""}`}
						textAnchor="end"
						verticalAnchor="middle"
					>
						{rangeFigure && rangeFigure.rangeKM ? rangeFigure.rangeKM : ""}
					</Text>
				</g>
			</g>
		</g>
	);
} 