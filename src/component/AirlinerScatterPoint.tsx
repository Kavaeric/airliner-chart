// [IMPORT] Third-party libraries //
import { Group } from "@visx/group";
import { Text } from "@visx/text";

// [IMPORT] Internal components //
import AirlinerScatterPointMarker from "./AirlinerScatterPointMarker";

// [IMPORT] Context providers/hooks //
import { useChartScalesContext } from "../context/ChartScalesContext";

// [IMPORT] Types/interfaces //
import { AirlinerData } from "../types/airliner";

// [IMPORT] CSS styling //
import markerStyles from "./AirlinerScatterPoint.module.css";

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
	const markerLineMajorWidth = 4;
	const markerLineMinorWidth = 2;
	const labelOffset = 12;

	// Create a processed airliner data dictionary
	let airlinerData: Record<string, any> = { ...d };

	// Check if we have a valid range to rende
	// All airliners must have a listed range
	if (!airlinerData.rangeKM) {
		throw new Error(`Invalid range data for airliner: ${d.nameCommon}. Range must be defined.`);
	}

	// Check if we have at least one class capacity value
	const hasClassData = [airlinerData.pax1Class, airlinerData.pax2Class, airlinerData.pax3Class].some(v => v !== undefined);
	if (!hasClassData) {
		throw new Error(`Incomplete passenger capacity data for airliner: ${d.nameCommon}. At least one class capacity value must be defined.`);
	}

	// Clamp the three passenger capacity values to the paxLimit, if paxLimit is defined
	if (airlinerData.paxLimit) {
		airlinerData.pax3Class = Math.min(airlinerData.pax3Class, airlinerData.paxLimit);
		airlinerData.pax2Class = Math.min(airlinerData.pax2Class, airlinerData.paxLimit);
		airlinerData.pax1Class = Math.min(airlinerData.pax1Class, airlinerData.paxLimit);
	}
	
	// Clamp again but to the paxExit value, if paxExit is defined
	if (airlinerData.paxExit) {
		airlinerData.pax3Class = Math.min(airlinerData.pax3Class, airlinerData.paxExit);
		airlinerData.pax2Class = Math.min(airlinerData.pax2Class, airlinerData.paxExit);
		airlinerData.pax1Class = Math.min(airlinerData.pax1Class, airlinerData.paxExit);
	}

	// Add the y coordinate for the rated range
	airlinerData.markerYRangeKM = yScaleView(airlinerData.rangeKM);

	// Add the x coordinates for each passenger capacity value
	airlinerData.markerXPax3Class = xScaleView(airlinerData.pax3Class);
	airlinerData.markerXPax2Class = xScaleView(airlinerData.pax2Class);
	airlinerData.markerXPax1Class = xScaleView(airlinerData.pax1Class);
	airlinerData.markerXPaxLimit  = xScaleView(airlinerData.paxLimit);
	airlinerData.markerXPaxExit   = xScaleView(airlinerData.paxExit);

	// Define the marker styles for each passenger capacity value (solid, outline, line)
	airlinerData.markerStylePax3Class = "diamond";
	airlinerData.markerStylePax2Class = "diamond";
	airlinerData.markerStylePax1Class = "diamond";
	airlinerData.markerStylePaxLimit  = "line";
	airlinerData.markerStylePaxExit   = "line";

	// Helper function to get the min and max extents of the passenger capacity values
	function getPaxExtents(useClass: boolean = true, useLimit: boolean = true) {
		// Get the values for each passenger capacity value
		let values = [];

		// Add the class values if flagged
		if (useClass) {
			values.push(airlinerData.pax3Class, airlinerData.pax2Class, airlinerData.pax1Class);
		}
		
		// Add the limit and exit values if flagged
		if (useLimit) {
			values.push(airlinerData.paxLimit, airlinerData.paxExit);
		}

		// Filter out undefined, NaN, etc values
		values = values.filter(v => v !== undefined && !isNaN(v))

		// If there are no values, return undefined
		if (values.length === 0) {
			return {
				min: undefined,
				max: undefined
			};
		}

		return {
			min: Math.min(...values),
			max: Math.max(...values)
		};
	}

	// Calculate coordinates for line connnecting the largest class value to the largest limit value
	// Contains a flag for if the line is valid (both values are defined and different)
	const markerLimitLineXCoordinates = {
		validLine: getPaxExtents(true, false).max !== undefined && getPaxExtents(false, true).max !== undefined && getPaxExtents(true, false).max !== getPaxExtents(false, true).max,
		x1: xScaleView(getPaxExtents(true, false).max),
		x2: xScaleView(getPaxExtents(false, true).max)
	}

	// Ditto, class values
	const markerClassLineXCoordinates = {
		validLine: getPaxExtents(true, false).min !== undefined && getPaxExtents(true, false).max !== undefined && getPaxExtents(true, false).min !== getPaxExtents(true, false).max,
		x1: xScaleView(getPaxExtents(true, false).min),
		x2: xScaleView(getPaxExtents(true, false).max)
	}

	return (
		<Group className={markerStyles.airlinerScatterPoint}>
			{/* Render the lines connecting the passenger capacity points */}

			{/* Draw a line connecting the largest class value to the largest limit value */}
			{markerLimitLineXCoordinates.validLine && (
			<line
				x1={markerLimitLineXCoordinates.x1}
				x2={markerLimitLineXCoordinates.x2}
				y1={airlinerData.markerYRangeKM}
				y2={airlinerData.markerYRangeKM}
				className={markerStyles.pointMarkerConnectingLineMinor}
				strokeWidth={markerLineMinorWidth}
			/>
			)}

			{/* Draw a line connecting the class values */}
			{markerClassLineXCoordinates.validLine && (
				<line
					x1={markerClassLineXCoordinates.x1}
					x2={markerClassLineXCoordinates.x2}
					y1={airlinerData.markerYRangeKM}
					y2={airlinerData.markerYRangeKM}
					className={markerStyles.pointMarkerConnectingLineMajor}
					strokeWidth={markerLineMajorWidth}
				/>
			)}

			{/* Extra class value line for pizzaz */}
			{markerClassLineXCoordinates.validLine && (
				<line
					x1={markerClassLineXCoordinates.x1}
					x2={markerClassLineXCoordinates.x2}
					y1={airlinerData.markerYRangeKM}
					y2={airlinerData.markerYRangeKM}
					className={markerStyles.pointMarkerConnectingLineMajorHighlight}
					strokeWidth={markerSize + 2}
				/>
			)}

			{/* Draw a marker for each passenger capacity value, skipping over invalid values */}
			{[
				{
					// paxExit: exit limit
					value: airlinerData.paxExit,
					x: airlinerData.markerXPaxExit,
					style: airlinerData.markerStylePaxExit,
				},
				{
					// paxLimit: rated limit
					value: airlinerData.paxLimit,
					x: airlinerData.markerXPaxLimit,
					style: airlinerData.markerStylePaxLimit,
				},
				{
					// pax1Class: one-class configuration
					value: airlinerData.pax1Class,
					x: airlinerData.markerXPax1Class,
					style: airlinerData.markerStylePax1Class,
				},
				{
					// pax2Class: two-class configuration
					value: airlinerData.pax2Class,
					x: airlinerData.markerXPax2Class,
					style: airlinerData.markerStylePax2Class,
				},
				{
					// pax3Class: three-class configuration
					value: airlinerData.pax3Class,
					x: airlinerData.markerXPax3Class,
					style: airlinerData.markerStylePax3Class,
				}
			].map((marker, idx) => {
				// If the value is undefined, skip rendering the marker
				if (marker.value === undefined) return null;
				return (
					<AirlinerScatterPointMarker
						key={idx}
						x={marker.x}
						y={airlinerData.markerYRangeKM}
						radius={markerSize}
						markerStyle={marker.style}
					/>
				);
			})}
	
			{/* Render the label for the airliner */}
			<Text
				key={`${d.nameICAO}-label`}

				// Position the label based off of the smallest available passenger capacity value
				// Subtract the label offset
				x={
					(
						airlinerData.markerXPax3Class ??
						airlinerData.markerXPax2Class ??
						airlinerData.markerXPax1Class
					) - labelOffset
				}

				y={airlinerData.markerYRangeKM}
				className={markerStyles.pointLabel}
				verticalAnchor="middle"
				textAnchor="end"
			>
				{d.nameCommon}
			</Text>
		</Group>
	);
} 