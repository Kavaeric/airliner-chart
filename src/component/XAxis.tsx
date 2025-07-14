"use client";

import { AxisBottom } from "@visx/axis";
import { useResponsiveSize } from "../lib/use-responsive-size";
import { scaleLinear } from "@visx/scale";
import { useEffect } from "react";

interface XAxisProps {
	xScale: any; // visx has broken types, any is the only way to get it to work
	width: number;
	label?: string;
	className?: string;
	onDimensionsChange?: (dimensions: { width: number; height: number }) => void;
}

export default function XAxis({ xScale, width, label, className, onDimensionsChange }: XAxisProps) {
	const [dimensions, containerRef] = useResponsiveSize();

	// Use provided width if available, otherwise use measured width
	const axisWidth = width || dimensions.width;

	// Notify parent of dimension changes
	useEffect(() => {
		if (onDimensionsChange && axisWidth > 0 && dimensions.height > 0) {
			onDimensionsChange({ width: axisWidth, height: dimensions.height });
		}
	}, [dimensions, axisWidth, onDimensionsChange]);

	// If the axis width is 0, return an empty div
	if (axisWidth === 0) {
		return <div ref={containerRef} className={className} />;
	}

	return (
		<div ref={containerRef} className={className}>
			<svg width={axisWidth} height={dimensions.height} style={{ overflow: 'visible' }}>
				<AxisBottom
					scale={xScale}
					top={0}
					label={label}
					labelOffset={40}
					stroke="#fff"
					labelProps={{
						fill: "#fff",
						fontSize: 18,
						textAnchor: "middle",
					}}
					tickLabelProps={{
						fill: "#fff",
						fontSize: 18,
						textAnchor: "middle",
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