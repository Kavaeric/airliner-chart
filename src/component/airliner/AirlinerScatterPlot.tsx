"use client";

// [IMPORT] React //
import { useMemo, useState, useEffect, useRef } from "react";

// [IMPORT] Third-party libraries //
import { GridRows, GridColumns } from "@visx/grid";

// [IMPORT] Internal components //
import AirlinerScatterMarker from './AirlinerScatterMarker';
import AirlinerScatterLine from './AirlinerScatterLine';
import AirlinerScatterLabel from './AirlinerScatterLabel';
import DrawVoronoi from '@/component/DrawVoronoi';
import DrawDelaunay from '@/component/DrawDelaunay';

// [IMPORT] Context providers/hooks //
import { useChartScales } from "@/context/ChartScalesContext";
import { useChartData } from "./AirlinerChart";
import { useChartLayout } from "@/context/ChartLayoutContext";
import { useDebugMode } from "@/context/DebugContext";

// [IMPORT] Utilities //
import { processAirlinerData } from "@/lib/data/airliner-data-processor";
import { processAirlinerMarkerCoordinates } from "@/lib/data/process-airliner-marker-coordinates";
import { measureSVGElementsBySelector } from "@/lib/utils/measure-svg-elements";

// [IMPORT] CSS styling //
import plotStyles from "./AirlinerScatterPlot.module.css";
import responsiveStyles from "@/component/ResponsiveSVG.module.css";
import { MarkerPlus } from "../shape/MarkerPlus";

/**
 * AirlinerScatterPlot Component
 *
 * Renders the main chart area:
 * - Draws gridlines for reference
 * - Plots each airliner with markers, connecting lines, and labels
 * - Renders elements in layers to control z-index ordering
 *
 * Receives all layout and scale info from parent.
 */
export default function AirlinerScatterPlot({ 
	width, 
	height,
}: {
	width: number;
	height: number;
}) {
	const { xScaleView, yScaleView } = useChartScales();
	const { xTickGridCount, yTickGridCount } = useChartLayout();
	const data = useChartData();
	const { debugMode } = useDebugMode();
	// Constants for rendering
	const markerSize = 12;
	const markerLineMajorWidth = 4;
	const markerLineMinorWidth = 2;
	const labelOffset = {
		x: -32,
		y: -16
	}

	// If the chart dimensions are 0, or no data, show loading/empty state
	if (width === 0 || height === 0 || data.length === 0) {
		return (
			<div className={plotStyles.chartArea}>
				<p>Loading chart...</p>
			</div>
		);
	}

	// Process all airliner data - memoised to prevent unnecessary recalculations
	const airlinerData = useMemo(() => data.map(d => processAirlinerData(d)), [data]);

	// Calculate all marker coordinates - memoised to prevent unnecessary recalculations
	const markerCoordinates = useMemo(() => 
		airlinerData.map(d => processAirlinerMarkerCoordinates(d, xScaleView, yScaleView)), 
		[airlinerData, xScaleView, yScaleView]
	);

	// Calculate bounding boxes for each airliner (encapsulate all markers and the line)
	const markerBoundingBoxes = useMemo(() => {
		return markerCoordinates.map((coords, i) => {
			if (!coords) return null;
			const markerSize = 12; // Use the same marker size as in rendering
			const xPositions = [
				//coords.xPaxExit,
				//coords.xPaxLimit,
				coords.xPax1Class,
				coords.xPax2Class,
				coords.xPax3Class
			].filter(x => x !== undefined && x !== null) as number[];
			if (xPositions.length === 0) return null;
			const minX = Math.min(...xPositions);
			const maxX = Math.max(...xPositions);
			const y = coords.y;
			return {
				x: minX - markerSize / 2,
				y: y - markerSize / 2,
				width: (maxX - minX) + markerSize,
				height: markerSize
			};
		});
	}, [markerCoordinates]);

	// Get airliner IDs for measurement tracking (index + ICAO name)
	const airlinerIds = useMemo(() => airlinerData.map((d, index) => `${index}-${d.nameICAO}`), [airlinerData]);

	// Calculate label anchor coordinates - memoised to prevent unnecessary recalculations
	// Updates when airlinerData or markerCoordinates changes (usually on viewport change, resize, scroll)
	const labelAnchorCoordinates = useMemo(() => {
		const coordinates = new Map<string, { x: number; y: number }>();
		
		airlinerData.forEach((d, i) => {
			// Get the marker coordinates for the airliner
			const coords = markerCoordinates[i];
			if (!coords) return;

			const extents: { min: number | null, max: number | null } = {
				min: null,
				max: null
			};

			// Gather all defined marker x positions (same as AirlinerScatterLabel)
			const validMarkers = [
				{ value: d.paxExit, x: coords.xPaxExit },
				{ value: d.paxLimit, x: coords.xPaxLimit },
				{ value: d.pax1Class, x: coords.xPax1Class },
				{ value: d.pax2Class, x: coords.xPax2Class },
				{ value: d.pax3Class, x: coords.xPax3Class }
			].filter(marker => marker.value !== undefined && marker.x !== undefined);

			// Find leftmost marker (same logic as AirlinerScatterLabel)
			const leftmostMarker = Math.min(...validMarkers.map(marker => marker.x).filter((x): x is number => x !== undefined));

			// If no valid markers, skip this airliner
			if (leftmostMarker === undefined || leftmostMarker === null || isNaN(leftmostMarker)) {
				return;
			}

			// Store coordinate with airliner ID
			const airlinerId = airlinerIds[i];
			coordinates.set(airlinerId, {
				x: leftmostMarker,
				y: coords.y
			});
		});
		
		return coordinates;
	}, [airlinerData, markerCoordinates, airlinerIds]);

	// Measure label dimensions for force simulation
	const [labelMeasurements, setLabelMeasurements] = useState<Map<string, { width: number; height: number }>>(new Map());

	// Labels will measure on mount
	useEffect(() => {
		// Use CSS selector to measure all airliner labels after DOM is ready
		const measurements = measureSVGElementsBySelector(['.airliner-label']);
		
		// console.log('Elements found:', document.querySelectorAll('.airliner-label').length);
		
		// Map measurements to airliner IDs by index
		const mappedMeasurements = new Map<string, {width: number, height: number}>();
		
		airlinerIds.forEach((airlinerId, index) => {
			// Find the measurement that matches this label's index
			const measurementKey = `.airliner-label-${index}`;
			const measuredDimensions = measurements.get(measurementKey);
			
			if (measuredDimensions) {
				mappedMeasurements.set(airlinerId, measuredDimensions);
			} else {
				// Fallback to default dimensions
				mappedMeasurements.set(airlinerId, { width: 100, height: 20 });
			}
		});
		console.log('Label measurements:', mappedMeasurements);
		setLabelMeasurements(mappedMeasurements);
	}, [airlinerIds]); // Only update when airlinerIds change (which depends on airlinerData)

	/*
	
	At this point, I'm going to take a break from the coding and address something directly.

	I say this knowing that I'm not a software engineer, and I barely count myself as a developer.
	I am a product designer, though, so this may colour my perspective.

	That is to say, I've decided I really hate TypeScript.
	
	This is specifically directed at you, dear reader, who is reading through this and wondering,
	"gee, Kav, why the hell are you putting so many any[]s in your code? You should know better!"
	
	You know what? Fuck that.

	I understand its purposes on large teams, where the code bases are enormous and you have individual
	developers working on this fragment	of this file belonging to this class in a vast maze of
	architecture that hasn't been properly updated since 1999.

	I also appreciate its ability to type things within a given file, such as this one. Indeed, I like
	it when it's used in this way, because a file like this should stick to one purpose, domain,
	and concern, and the typing keeps me adhering to that.

	But I still hate it. I came in with an open mind and I hate it.

	Why, for instance, does everything have to be so strongly typed when passing data between components
	or utilities? Is not the purpose of clean architecture to ensure that we can keep elements of the
	codebase loosely coupled, and that we can change one thing without having to change everything?
	Or am I mistaken and indeed the point is so that once a type is set that it can never, ever, ever,
	ever be changed? I'm sure that's a great idea for everyone who complains about legacy systems.

	"Documentation as code" -- oh, excellent, because a type defs are such a great form	of documentation.
	Is that how you conduct the rest of your life?

	"Ah, yes, dear, I've sold all our living room furniture and have replaced it with an enormous
	taxidermic specimen of a giraffe. Why are you asking me all these questions? Can't you see the
	form of it,	with four legs and a long neck? You can see what shape it is. What don't you understand?"

	"Oh, so you just hate types." No, types are lovely. Hell, you know I've done stuff in Unity C#, right?
	It's not just "number", but "float", "int", "double", and probably a bunch of others I don't even
	remember. That's fine with me.

	You ever need to charge your phone and you ask your friend for a cable? And they only have that
	shitty Lightning one that breaks and doesn't even work with iPhones anymore? That's what typed
	interfaces are. Oh, sure, maybe it's "safer" so you KNOW that it's a Lightning cable, but deep
	down you know that the reason we all use USB-C is because it's universal and you don't have to
	ask "hey, is it the right shape?"

	Oh, but what of AI? Surely it can help us write better code nowadays, and help you with your miserable
	little type problem? Well, no, of course not, because it doesn't understand architecture, it doesn't
	understand the purpose of the code, and it doesn't understand the context of the code. Prompt it all
	you want, and pretty soon with anything more complex than a single page that just adds two numbers
	together, you'll find you've got crap architecture where everything is importing and exporting from
	every other file in the project along with files still undescribed by science, with all your precious
	type interfaces smeared in pieces across all of them like a fly hit by a windscreen wiper.

	In short, I don't get along with TypeScript.
	
	 */

	return (
		<div className={`${plotStyles.chartArea} ${responsiveStyles.responsiveContainer}`}>
			<svg className={responsiveStyles.responsiveSVG}>
				{/* Gridlines for visual reference */}
				<GridRows
					scale={yScaleView}
					width={width}
					numTicks={yTickGridCount}
					className={plotStyles.gridLine}
				/>
				<GridColumns
					scale={xScaleView}
					height={height}
					numTicks={xTickGridCount}
					className={plotStyles.gridLine}
				/>

				{/* Connecting lines */}
				{markerCoordinates.map((coords, i) => coords ? (
					<AirlinerScatterLine
						key={`lines-${i}`}
						airlinerData={airlinerData[i]}
						coords={coords}
						index={i}
						markerSize={markerSize}
						markerLineMajorWidth={markerLineMajorWidth}
						markerLineMinorWidth={markerLineMinorWidth}
					/>
				) : null)}

				{/* Markers */}
				{markerCoordinates.map((coords, i) => coords ? (
					<AirlinerScatterMarker
						key={`markers-${i}`}
						airlinerData={airlinerData[i]}
						coords={coords}
						markerSize={markerSize}
					/>
				) : null)}

				{/* Calculated label coordinates, for debugging */}
				{debugMode && Array.from(labelAnchorCoordinates.entries()).map(([airlinerId, coord], i) => (
					<MarkerPlus
						key={`debug-dot-${i}`}
						cx={coord.x}
						cy={coord.y}
						weight={2}
						r={12}
						fill="blue"
						stroke="none"
					/>
				))}

				{/* Labels */}
				{Array.from(labelAnchorCoordinates.entries()).map(([airlinerId, coord], i) => {
					return (
						<g key={`label-${i}-${airlinerData[i].nameICAO}`}>
							<AirlinerScatterLabel
								airlinerData={airlinerData[i]}
								coords={{
									x: coord.x + labelOffset.x,
									y: coord.y + labelOffset.y
								}}
								classNames="airliner-label"
							/>
						</g>
					);
				})}
			</svg>
		</div>
	);
} 