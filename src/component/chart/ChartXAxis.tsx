"use client";

// [IMPORT] React //
import React, { useMemo, useState } from "react";

// [IMPORT] Third-party libraries //
import { AxisBottom } from "@visx/axis";
import { Text } from "@visx/text";

// [IMPORT] Context providers/hooks //
import { useResponsiveSVG } from "@/context/ResponsiveSVG";
import { useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";
import { useAnimatedChartViewport } from "@/context/AnimatedChartViewport";
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";
import { useChartData } from "@/component/airliner/AirlinerChart";
import { RectCentre } from "@/component/shape/RectCentre";

interface XAxisProps {
	label?: string;
}

/**
 * XAxis Component
 *
 * Renders the bottom axis for the chart using visx.
 * - Measures its own rendered size using a ref and ResizeObserver
 * - Reports its dimensions up to the parent via onDimensionsChange
 * - Receives all layout and scale info as props
 * - Renders ticks and gridlines
 * - Shows passenger figure that follows mouse cursor or snaps to airliner positions
 *
 * This enables robust, race-condition-free axis measurement and layout.
 */
export default function XAxis({ label }: XAxisProps) {
	const { viewportScale, mouse } = useResponsiveChartViewport();
	const { animatedScale } = useAnimatedChartViewport();
	const { width, height } = useResponsiveSVG();
	const { hoveredAirlinerID, selectedAirlinerID } = useAirlinerSelection();
	const data = useChartData();

	// === Position Caching ===
	// Cache the last valid passenger figure position to prevent jarring animations
	const [lastValidPosition, setLastValidPosition] = useState<number | null>(null);

	// === Passenger Figure Calculation ===
	// Calculate passenger figures for all passenger classes with priority: selected > hovered > mouse cursor > cached position
	const passengerFigures = useMemo(() => {
		const figures: Array<{
			x: number;
			passengerCount: number | undefined;
			state: 'hovered' | 'selected' | 'mouse' | 'cached';
			source: 'airliner' | 'mouse' | 'cached';
			hasData: boolean;
			passengerClass: 'pax3Class' | 'pax2Class' | 'pax1Class';
		}> = [];

		// Helper function to process airliner for a specific passenger class
		const processAirlinerForPassengerClass = (
			airlinerID: string, 
			state: 'hovered' | 'selected', 
			passengerClass: 'pax3Class' | 'pax2Class' | 'pax1Class'
		) => {
			const airliner = data?.find(d => d.airlinerID === airlinerID);
			if (airliner?.airlinerData[passengerClass]) {
				const x = viewportScale.x(airliner.airlinerData[passengerClass]!);
				if (x !== undefined && x !== null) {
					const position = Number(x);
					setLastValidPosition(position);
					return {
						x: position,
						passengerCount: airliner.airlinerData[passengerClass]!,
						state,
						source: 'airliner' as const,
						hasData: true,
						passengerClass,
					};
				}
			}
			// Airliner exists but has no data for this passenger class
			return {
				x: lastValidPosition || 0,
				passengerCount: undefined,
				state,
				source: 'airliner' as const,
				hasData: false,
				passengerClass,
			};
		};

		// Priority 1: Selected airliner
		if (selectedAirlinerID && data) {
			figures.push(
				processAirlinerForPassengerClass(selectedAirlinerID, 'selected', 'pax3Class'),
				processAirlinerForPassengerClass(selectedAirlinerID, 'selected', 'pax2Class'),
				processAirlinerForPassengerClass(selectedAirlinerID, 'selected', 'pax1Class')
			);
		}
		// Priority 2: Hovered airliner (if different from selected)
		else if (hoveredAirlinerID && data) {
			figures.push(
				processAirlinerForPassengerClass(hoveredAirlinerID, 'hovered', 'pax3Class'),
				processAirlinerForPassengerClass(hoveredAirlinerID, 'hovered', 'pax2Class'),
				processAirlinerForPassengerClass(hoveredAirlinerID, 'hovered', 'pax1Class')
			);
		}
		// Priority 3: Mouse cursor position
		else if (mouse.coordinates && mouse.isOverChart) {
			const position = mouse.coordinates.screen.x;
			setLastValidPosition(position);
			figures.push({
				x: position,
				passengerCount: undefined,
				state: 'mouse' as const,
				source: 'mouse' as const,
				hasData: true,
				passengerClass: 'pax3Class',
			});
		}
		// Priority 4: Cached position (prevents jarring animations)
		else if (lastValidPosition !== null) {
			figures.push({
				x: lastValidPosition,
				passengerCount: undefined,
				state: 'cached' as const,
				source: 'cached' as const,
				hasData: true,
				passengerClass: 'pax3Class',
			});
		}

		return figures.length > 0 ? figures : null;
	}, [hoveredAirlinerID, selectedAirlinerID, data, viewportScale.x, mouse.coordinates, mouse.isOverChart, lastValidPosition]);

	// === State-based CSS classes helper ===
	// Pre-compute state-specific CSS classes to avoid duplication
	const getStateClass = (passengerFigure: NonNullable<typeof passengerFigures>[0]) => {
		let baseClass = "";
		if (passengerFigure.state === 'hovered') {
			baseClass = "hoveredAirliner";
		} else if (passengerFigure.state === 'selected') {
			baseClass = "selectedAirliner";
		}
		// No special styling for cached or mouse state
		
		// Add "hidden" class if airliner is active but has no passenger data
		if (passengerFigure.source === 'airliner' && !passengerFigure.hasData) {
			baseClass += baseClass ? " hidden" : "hidden";
		}
		
		return baseClass;
	};

	// === Passenger class display names ===
	const getPassengerClassDisplayName = (passengerClass: 'pax3Class' | 'pax2Class' | 'pax1Class') => {
		switch (passengerClass) {
			case 'pax3Class': return '3-Class';
			case 'pax2Class': return '2-Class';
			case 'pax1Class': return '1-Class';
		}
	};

	return (
		<g>

			{/* Range figure line - always renders, follows mouse */}
			<line
				x1={mouse.isOverChart && mouse.coordinates ? mouse.coordinates.screen.x : 0}
				y1={height}
				x2={mouse.isOverChart && mouse.coordinates ? mouse.coordinates.screen.x : 0}
				y2={0}
				className="xAxisReadoutLine"
			/>

			
			{/* Render the axis */}
			<AxisBottom
				scale={animatedScale.x}
				numTicks={10}
				tickLength={4}
				axisClassName="axis"
				axisLineClassName="axisLine"
				tickClassName="tick"
			/>

			{/* Render the axis label */}
			<text
				x={width / 2}
				y={height}
				className="axisLabelX"
				textAnchor="middle"
			>
				{label}
			</text>

			{/* Passenger figure groups - render for each passenger class */}
			{passengerFigures && passengerFigures.map((passengerFigure, index) => (
				<g
					key={`${passengerFigure.passengerClass}-${index}`}
					className={`xAxisReadout ${getStateClass(passengerFigure)}`}
					transform={`translate(${passengerFigure.x}, 0)`}
				>
					{/* Passenger value text and background */}
					<RectCentre
						cx={0}
						cy={height / 4}
						width={40}
						height={height / 2}
						className={`xAxisReadoutBox ${getStateClass(passengerFigure)}`}
					/>
					<Text
						x={0}
						y={height / 4}
						className={`xAxisReadoutText ${getStateClass(passengerFigure)}`}
						textAnchor="middle"
						verticalAnchor="middle"
					>
						{passengerFigure.source === 'airliner' 
							? passengerFigure.passengerCount 
							: passengerFigure.source === 'mouse' && mouse.coordinates
								? Math.round((viewportScale.x as any).invert(mouse.coordinates.screen.x))
								: ""
						}
					</Text>
				</g>
			))}
		</g>
	);
} 