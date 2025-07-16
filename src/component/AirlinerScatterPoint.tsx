// Third-party libraries
import { Group } from "@visx/group";
import { Text } from "@visx/text";

// CSS
import markerStyles from "./AirlinerScatterPoint.module.css";

// Types/interfaces
import { AirlinerData } from "../types/airliner";
import { Diamond } from "./Diamond";
import { useChartScalesContext } from "../context/ChartScalesContext";

interface AirlinerScatterPointProps {
	d: AirlinerData;
	className?: string;
}

/* AirlinerScatterPoint Component
 * 
 * Renders a single data point with a data point marker and a label.
 * Receives all layout and scale info from parent.
 */
export default function AirlinerScatterPoint({ d, className }: AirlinerScatterPointProps) {
	const { xScaleView, yScaleView } = useChartScalesContext()
	const markerSize = 12;
	const labelOffset = 8;

	// Get all class passenger capacity values
	// General order of count from largest to smallest: exit limit, rated limit, 1-class, 2-class, 3-class
	const paxValues = [d.pax1Class, d.pax2Class, d.pax3Class];

	// If no class capacity data is available, throw an error
	// Don't render a data point if there is only limit or exit data (or neither)
	if (paxValues.every(v => typeof v !== "number")) {
		throw new Error(`Incomplete passenger capacity data for airliner: ${d.nameCommon}`);
	}

	// Map range in km to x-axis position
	const x = xScaleView(d.rangeKM);

	// Compute the clamp maximum for class values
	const clampMax = Math.max(
		typeof d.paxLimit === "number" && !isNaN(d.paxLimit) ? d.paxLimit : -Infinity,
		typeof d.paxExit === "number" && !isNaN(d.paxExit) ? d.paxExit : -Infinity
	);

	// Clamp class values to either the rated limit or exit limit, whichever is smaller
	const pax1Clamped = (typeof d.pax1Class === 'number' && isFinite(clampMax)) ? Math.min(d.pax1Class, clampMax) : d.pax1Class;
	const pax2Clamped = (typeof d.pax2Class === 'number' && isFinite(clampMax)) ? Math.min(d.pax2Class, clampMax) : d.pax2Class;
	const pax3Clamped = (typeof d.pax3Class === 'number' && isFinite(clampMax)) ? Math.min(d.pax3Class, clampMax) : d.pax3Class;

	// Map available passenger capacity values to y-axis positions, skipping missing values
	const paxYPoints = [
		{ key: "paxExit",   value: d.paxExit, markerSize: markerSize, markerStyle: "line" },
		{ key: "paxLimit",  value: d.paxLimit, markerSize: markerSize, markerStyle: "line" },
		{ key: "pax1Class", value: pax1Clamped, markerSize: markerSize, markerStyle: "solid" },
		{ key: "pax2Class", value: pax2Clamped, markerSize: markerSize, markerStyle: "solid" },
		{ key: "pax3Class", value: pax3Clamped, markerSize: markerSize, markerStyle: "solid" }
	]
		.filter(p => typeof p.value === "number" && !isNaN(p.value))
		.map(p => ({
			key: p.key,
			y: yScaleView(p.value as number),
			markerSize: p.markerSize,
			markerStyle: p.markerStyle
		}));

	console.log(d.manufacturer, d.nameCommon, `pax3Class: ${d.pax3Class}`, `pax2Class: ${d.pax2Class}`, `pax1Class: ${d.pax1Class}`, `paxLimit: ${d.paxLimit}`, `paxExit: ${d.paxExit}`	);

	// Find the minimum and maximum y-axis positions
	// Y-axis is inverted, hence why Math.max and Math.min are swapped
	const yValues = paxYPoints.map(p => p.y);
	const minY = yValues.length > 0 ? Math.max(...yValues) : undefined;
	const maxY = yValues.length > 0 ? Math.min(...yValues) : undefined;

	// Find the largest available (clamped) class value for label placement
	const classValues = [pax3Clamped, pax2Clamped, pax1Clamped].filter(v => typeof v === "number" && !isNaN(v));
	const maxClassValue = classValues.length > 0 ? Math.max(...classValues as number[]) : undefined;
	const labelY = typeof maxClassValue === "number" ? yScaleView(maxClassValue) : maxY;

	return (
		<Group>
			{/* Render the lines connecting the passenger capacity points */}
			{yValues.length > 1 && (
				<line
					key={`${d.nameCommon}-connecting-line`}
					x1={x}
					y1={minY}
					x2={x}
					y2={maxY}
					strokeWidth={1}
					className={markerStyles.pointMarkerConnectingLineMinor}
				/>
			)}

			{/* Render a line connecting only the class values (pax3/pax2/pax1Class) */}
			{classValues.length > 1 && (
				<line
					key={`${d.nameCommon}-class-connecting-line-a`}
					x1={x}
					y1={Math.max(...classValues.map(v => yScaleView(v as number)))}
					x2={x}
					y2={Math.min(...classValues.map(v => yScaleView(v as number)))}
					strokeWidth={2}
					className={markerStyles.pointMarkerConnectingLine}
				/>
			)}
			{classValues.length > 1 && (
				<line
					key={`${d.nameCommon}-class-connecting-line-b`}
					x1={x}
					y1={Math.max(...classValues.map(v => yScaleView(v as number)))}
					x2={x}
					y2={Math.min(...classValues.map(v => yScaleView(v as number)))}
					opacity={0.4}
					strokeWidth={6}
					className={markerStyles.pointMarkerConnectingLine}
				/>
			)}

			{/* Render the passenger capacity points */}
			{paxYPoints.map((p) => {
				if (p.markerStyle === "solid" || p.markerStyle === "outline") {
					return (
						<Diamond
							key={p.key}
							x={x}
							y={p.y}
							r={p.markerSize}
							className={p.markerStyle === "solid" ? markerStyles.pointMarkerSolid : markerStyles.pointMarkerOutline}
						/>
					);
				}
				if (p.markerStyle === "line") {
					// Render a short horizontal line as a marker
					return (
						<line
							key={p.key}
							x1={x - p.markerSize / 2}
							x2={x + p.markerSize / 2}
							y1={p.y}
							y2={p.y}
							className={markerStyles.pointMarkerLine}
						/>
					);
				}
				return null;
			})}

			{/* Render the label for the airliner */}
			<Text
				key={`${d.nameICAO}-label`}
				x={x + labelOffset}
				y={labelY - labelOffset}
				className={markerStyles.pointLabel}
			>
				{d.nameICAO}
			</Text>
		</Group>
	);
} 