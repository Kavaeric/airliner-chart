"use client";

// [IMPORT] React //
import React, { useMemo, useState, useCallback } from "react";

// [IMPORT] Third-party libraries //
import { AxisLeft } from "@visx/axis";

// [IMPORT] Context providers/hooks //
import { useResponsiveSVG } from "@/context/ResponsiveSVG";
import { useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";
import { useChartData } from "@/component/airliner/AirlinerChart";
import { Text } from "@visx/text";
import { RectCentre } from "@/component/shape/RectCentre";
import { useAnimatedChartViewport } from "@/context/AnimatedChartViewport";

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
 * - Shows range figure that follows mouse cursor or snaps to airliner positions
 *
 * This enables robust, race-condition-free axis measurement and layout.
 */
export default function YAxis({ label }: YAxisProps) {
	const { viewportScale, mouse } = useResponsiveChartViewport();
	const { animatedScale } = useAnimatedChartViewport();
	const { width, height } = useResponsiveSVG();
	const { hoveredAirlinerID, selectedAirlinerID } = useAirlinerSelection();
	const data = useChartData();

	// === Position Caching ===
	// Cache the last valid range figure position to prevent jarring animations
	const [lastValidPosition, setLastValidPosition] = useState<number | null>(null);

	// === Range Figure Calculation ===
	// Calculate range figure with priority: selected > hovered > mouse cursor > cached position
	const rangeFigure = React.useMemo(() => {
		// Priority 1: Selected airliner
		if (selectedAirlinerID && data) {
			const airliner = data.find(d => d.airlinerID === selectedAirlinerID);
			if (airliner?.airlinerData.rangeKM) {
				const y = viewportScale.y(airliner.airlinerData.rangeKM);
				if (y !== undefined && y !== null) {
					const position = Number(y);
					setLastValidPosition(position);
					return {
						y: position,
						rangeKM: airliner.airlinerData.rangeKM,
						state: 'selected' as const,
						source: 'airliner' as const,
					};
				}
			}
		}

		// Priority 2: Hovered airliner
		if (hoveredAirlinerID && data) {
			const airliner = data.find(d => d.airlinerID === hoveredAirlinerID);
			if (airliner?.airlinerData.rangeKM) {
				const y = viewportScale.y(airliner.airlinerData.rangeKM);
				if (y !== undefined && y !== null) {
					const position = Number(y);
					setLastValidPosition(position);
					return {
						y: position,
						rangeKM: airliner.airlinerData.rangeKM,
						state: 'hovered' as const,
						source: 'airliner' as const,
					};
				}
			}
		}

		// Priority 3: Mouse cursor position
		if (mouse.coordinates && mouse.isOverChart) {
			const position = mouse.coordinates.screen.y;
			setLastValidPosition(position);
			return {
				y: position,
				rangeKM: null,
				state: 'mouse' as const,
				source: 'mouse' as const,
			};
		}

		// Priority 4: Cached position (prevents jarring animations)
		if (lastValidPosition !== null) {
			return {
				y: lastValidPosition,
				rangeKM: null,
				state: 'cached' as const,
				source: 'cached' as const,
			};
		}

		// No active position and no cached position
		return null;
	}, [hoveredAirlinerID, selectedAirlinerID, data, viewportScale.y, mouse.coordinates, mouse.isOverChart, lastValidPosition]);

	// === State-based CSS classes helper ===
	// Pre-compute state-specific CSS classes to avoid duplication
	const stateClass = useMemo(() => {
		if (!rangeFigure) return "";
		
		return rangeFigure.state === 'hovered' ? "hoveredAirliner" : 
			   rangeFigure.state === 'selected' ? "selectedAirliner" : 
			   rangeFigure.state === 'cached' ? "" : ""; // No special styling for cached state
	}, [rangeFigure]);

	return (
		<g style={{transform: `translateX(${width}px)`}}>

			{/* Range figure line - always renders, follows mouse */}
			<line
				x1={-width}
				y1={mouse.isOverChart && mouse.coordinates ? mouse.coordinates.screen.y : 0}
				x2={0}
				y2={mouse.isOverChart && mouse.coordinates ? mouse.coordinates.screen.y : 0}
				className="yAxisReadoutLine"
			/>

			{/* Render the axis */}
			<AxisLeft
				scale={animatedScale.y}
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

			{/* Range figure group - always renders, follows mouse or snaps to airliners */}
			<g
				className={`yAxisReadout ${stateClass}`}
				transform={`translate(0, ${rangeFigure ? rangeFigure.y : 0})`}
			>
				{/* Range value text and background - shows for selected airliners or when following mouse */}
				<RectCentre
					cx={-width / 2}
					cy={0}
					width={width}
					height={32}
					className={`yAxisReadoutBox ${stateClass}`}
				/>
				<Text
					x={0}
					y={0}
					className={`yAxisReadoutText ${stateClass}`}
					textAnchor="end"
					verticalAnchor="middle"
				>
					{rangeFigure && rangeFigure.source === 'airliner' 
						? rangeFigure.rangeKM 
						: rangeFigure && rangeFigure.source === 'mouse' && mouse.coordinates
							? Math.round((viewportScale.y as any).invert(mouse.coordinates.screen.y))
							: ""
					}
				</Text>
			</g>
		</g>
	);
} 