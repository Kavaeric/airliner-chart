// [IMPORT] React and core libraries //
import React, { useRef, useEffect } from "react";

// [IMPORT] Internal components //
import ChartBrushScatterMarker from "@/component/chart/ChartBrushScatterMarker";

// [IMPORT] CSS styling //
import brushStyles from "@/component/chart/ChartBrush.module.css";

interface BrushScatterProps {
	width: number;
	height: number;
	axisMode: "x" | "y" | "both";
	xScale: (value: number) => number;
	yScale: (value: number) => number;
	data: any[];
}

const ChartBrushScatter = React.memo(function ChartBrushScatter({ width, height, axisMode, xScale, yScale, data }: BrushScatterProps) {
	// For debugging: log the number of times the component is rendered
	// console.log("ChartBrushScatter render");

	const paxClassKeys = ["pax3Class", "pax2Class", "pax1Class"];
	const paxLimitKeys = ["paxLimit", "paxExit"];
	const pointSizeMajor = 8;
	const pointSizeMinor = 4;
	const noiseThreshold = 2; // For filtering out markers too close to each other

	return (
		<React.Fragment>
			{data.map((d: any, i: number) => {
				if (typeof d.rangeKM !== "number") {
					// console.warn(`Airliner ${d.nameICAO} has no rangeKM value`);
					return null;
				}

				// Track the positions of the markers that have already been rendered
				const seenPositions: Array<{ cx: number; cy: number }> = [];
				let debugRenderedMarkers = 0;

				// Render major markers
				const paxClassMarkers = paxClassKeys.map((key) => {
					const paxValue = d[key];

					// If the pax value doesn't exist, skip it
					if (typeof paxValue !== "number" || isNaN(paxValue)) return null; // Skip missing values

					// Set the position of the point markers
					const cx = axisMode === "y" ? width / 2 : xScale(paxValue);
					const cy = axisMode === "x" ? height / 2 : yScale(d.rangeKM);

					// If another marker with the same (cx, cy) position (within noiseThreshold) has already been rendered, skip it
					const isDuplicate = seenPositions.some(pos => Math.abs(pos.cx - cx) < noiseThreshold && Math.abs(pos.cy - cy) < noiseThreshold);
					if (isDuplicate) {
						// console.log(`Major marker skipped (too close to another marker): ${d.nameCommon || d.nameICAO}, ${key}`);
						return null;
					}
					
					// Add the position to the list of seen positions
					seenPositions.push({ cx, cy });
					debugRenderedMarkers++;

					return (
						<ChartBrushScatterMarker
							key={`${d.nameICAO}-${key}`}
							x={cx}
							y={cy}
							radius={pointSizeMajor}
							style="major"
						/>
					);
				});

				// Render minor markers (skip if too close to any major or previous minor marker)
				const paxLimitMarkers = paxLimitKeys.map((key) => {
					const paxValue = d[key];

					// If the pax value doesn't exist, skip it
					if (typeof paxValue !== "number" || isNaN(paxValue)) return null;

					// Set the position of the point markers
					const cx = axisMode === "y" ? width / 2 : xScale(paxValue);
					const cy = axisMode === "x" ? height / 2 : yScale(d.rangeKM);

					// If another marker with the same (cx, cy) position (within noiseThreshold) has already been rendered, skip it
					const isDuplicate = seenPositions.some(pos => Math.abs(pos.cx - cx) < noiseThreshold && Math.abs(pos.cy - cy) < noiseThreshold);
					if (isDuplicate) {
						// console.log(`Minor marker skipped (too close to another marker): ${d.nameCommon || d.nameICAO}, ${key}`);
						return null;
					}

					// Add the position to the list of seen positions
					seenPositions.push({ cx, cy });
					debugRenderedMarkers++;

					return (
						<ChartBrushScatterMarker
							key={`${d.nameICAO}-${key}`}
							x={cx}
							y={cy}
							radius={pointSizeMinor}
							style="minor"
						/>
					);
				});

				// For debugging: log the number of markers rendered
				// console.log(`Rendered ${debugRenderedMarkers} of ${paxClassKeys.length + paxLimitKeys.length} markers for ${d.nameCommon}`);
				return [...paxClassMarkers, ...paxLimitMarkers];
			})}
		</React.Fragment>
	);
});

export default ChartBrushScatter;
