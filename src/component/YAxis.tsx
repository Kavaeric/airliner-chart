"use client";

import { useEffect, useRef } from "react";
import { AxisLeft } from "@visx/axis";

interface YAxisProps {
	yScale: any; // visx has broken types, any is the only way to get it to work
	width: number;
	height: number;
	label?: string;
	tickCount?: number;
	className?: string;
	onDimensionsChange?: (dims: { width: number; height: number }) => void;
}

/**
 * YAxis Component
 *
 * Renders the left axis for the chart using visx.
 * - Measures its own rendered size using a ref and ResizeObserver
 * - Reports its dimensions up to the parent via onDimensionsChange
 * - Receives all layout and scale info as props
 *
 * This enables robust, race-condition-free axis measurement and layout.
 */
export default function YAxis({ yScale, width, height, label, tickCount, className, onDimensionsChange }: YAxisProps) {
	const ref = useRef<HTMLDivElement>(null);

	// Measure the axis size after mount and on resize, report up
	useEffect(() => {
		if (!ref.current) return;
		const measure = () => {
			const rect = ref.current!.getBoundingClientRect();
			if (onDimensionsChange) {
				onDimensionsChange({ width: rect.width, height: rect.height });
			}
		};
		measure();
		// Optionally, observe resize
		const ro = new window.ResizeObserver(measure);
		ro.observe(ref.current);
		return () => ro.disconnect();
	}, [width, height, onDimensionsChange]);

	// If not ready, render an empty div (prevents layout shift)
	if (width === 0 || height === 0) {
		return <div className={className} ref={ref} />;
	}

	return (
		<div className={className} style={{ width: width, height: height }} ref={ref}>
			<svg width={width} height={height} style={{ overflow: 'visible' }}>
				<AxisLeft
					scale={yScale}
					label={label}
					labelOffset={60}
					left={width}
					stroke="#fff"
					numTicks={tickCount}
					labelProps={{
						fill: "#fff",
						fontSize: 18,
						textAnchor: "middle",
					}}
					tickLabelProps={{
						fill: "#fff",
						fontSize: 18,
						textAnchor: "end",
					}}
					tickLineProps={{
						stroke: "#fff",
						strokeWidth: 1,
					}}
				/>
			</svg>
		</div>
	);
} 