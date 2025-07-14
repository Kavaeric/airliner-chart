"use client";

import { AxisLeft } from "@visx/axis";
import { useResponsiveSize } from "../lib/use-responsive-size";
import { scaleLinear } from "@visx/scale";
import type { ScaleLinear } from "d3-scale";
import { useEffect } from "react";

interface YAxisProps {
	yScale: ScaleLinear<number, number>;
	height: number;
	label?: string;
	className?: string;
	onDimensionsChange?: (dimensions: { width: number; height: number }) => void;
}

export default function YAxis({ yScale, height, label, className, onDimensionsChange }: YAxisProps) {
	const [dimensions, containerRef] = useResponsiveSize();

	// Use provided height if available, otherwise use measured height
	const axisHeight = height || dimensions.height;

	// Notify parent of dimension changes
	useEffect(() => {
		if (onDimensionsChange && dimensions.width > 0 && axisHeight > 0) {
			onDimensionsChange({ width: dimensions.width, height: axisHeight });
		}
	}, [dimensions, axisHeight, onDimensionsChange]);

	// If the axis height is 0, return an empty div
	if (axisHeight === 0) {
		return <div ref={containerRef} className={className} />;
	}

	return (
		<div ref={containerRef} className={className}>
			<svg width={dimensions.width} height={axisHeight} style={{ overflow: 'visible' }}>
				<AxisLeft
					scale={yScale}
					label={label}
					labelOffset={60}
					left={dimensions.width}
					stroke="#fff"
					labelProps={{
						fill: "#fff",
						fontSize: 18,
						textAnchor: "end",
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