"use client";

// Import React hooks for state management and side effects
import { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";
// Import PapaParse for robust CSV parsing with TypeScript support
import Papa, { ParseResult } from "papaparse";

// Import visx components for data visualization
import { Group } from "@visx/group";
import { Circle } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";

// Define the structure of our airliner data with proper TypeScript typing
// This interface ensures type safety and provides IntelliSense in the editor
interface AirlinerData {
	airliner: string; 			// Aircraft model name (e.g., "A320neo")
	category: string; 			// Aircraft category (e.g., "Narrow-body", "Wide-body")
	manufacturer: string; 		// Aircraft manufacturer (e.g., "Airbus", "Boeing")
	firstDelivery: number; 		// Year of first delivery
	rangeKm: number; 			// Flight range in kilometers
	paxCapacityMin: number; 	// Minimum passenger capacity
	paxCapacityMean: number; 	// Average passenger capacity
	paxCapacityMax: number; 	// Maximum passenger capacity
}

// Helper function to find min and max values in an array
const extent = (data: AirlinerData[], accessor: (d: AirlinerData) => number): [number, number] => {
	const values = data.map(accessor);
	return [Math.min(...values), Math.max(...values)];
};

export default function Home() {
	// State to store the parsed airliner data
	const [data, setData] = useState<AirlinerData[]>([]);
	// State to track loading status for better UX
	const [loading, setLoading] = useState(true);
	// State to track chart dimensions for responsive behavior
	const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
	// Ref to access the chart container DOM element
	const chartContainerRef = useRef<HTMLDivElement>(null);

	// useEffect runs when the component mounts (empty dependency array [])
	// This is where we fetch and parse the CSV data
	useEffect(() => {
		const loadData = async () => {
			try {
				// Fetch the CSV file from the public directory
				// In Next.js, files in /public are served at the root URL
				const response = await fetch("/data/airliners-sample.csv");
				const csvText = await response.text();

				// Use PapaParse to parse the CSV with configuration options
				Papa.parse(csvText, {
					header: true, // Treat first row as column headers
					skipEmptyLines: true, // Ignore empty lines in the CSV
					comments: "#", // Ignore lines starting with #

					// Transform function runs for each field during parsing
					// This converts string numbers to actual numbers
					transform: (value, field) => {
						// Check if the current field is one of our numeric fields
						// Probably a better way to write this but hey I'm new to this
						if (
							field === "First delivery" ||
							field === "Range (km)" ||
							field === "PAX capacity (min)" ||
							field === "PAX capacity (mean)" ||
							field === "PAX capacity (max)"
						) {
							const num = parseFloat(value);
							// Return 0 if parsing fails (NaN), otherwise return the number
							return isNaN(num) ? 0 : num;
						}
						// Return the original value for non-numeric fields
						return value;
					},

					// This runs when parsing is complete
					complete: (results: ParseResult<any>) => {
						// Maps data from CSV header strings into interface properties
						const transformedData: AirlinerData[] =
							results.data.map((row: any) => ({
								airliner: row.Airliner,
								category: row.Category,
								manufacturer: row.Manufacturer,
								firstDelivery: row["First delivery"], // Note: bracket notation for spaces
								rangeKm: row["Range (km)"],
								paxCapacityMin: row["PAX capacity (min)"],
								paxCapacityMean: row["PAX capacity (mean)"],
								paxCapacityMax: row["PAX capacity (max)"],
							}));

						// Update state with the transformed data
						setData(transformedData);
						setLoading(false);
					},

					// Error handling callback
					error: (error: any) => {
						console.error("PapaParse error:", error);
						setLoading(false);
					},
				});
			} catch (error) {
				// Handle any network or other errors
				console.error("Error loading data:", error);
				setLoading(false);
			}
		};

		// Call the async function
		loadData();
	}, []); // Empty dependency array means this effect runs only once on mount

	// Effect to handle responsive chart sizing
	useEffect(() => {
		const updateChartSize = () => {
			if (chartContainerRef.current) {
				const { width, height } = chartContainerRef.current.getBoundingClientRect();
				setChartDimensions({ width, height });
			}
		};

		// Update size immediately
		updateChartSize();

		// Add resize listener for responsive behavior
		window.addEventListener('resize', updateChartSize);
		
		// Cleanup: remove event listener when component unmounts
		return () => window.removeEventListener('resize', updateChartSize);
	}, []);

	// Show loading state while data is being fetched
	if (loading) {
		return (
			<div className={styles.mainContainer}>
				<div className={styles.headerContainer}>
					<h1>Airliner Chart</h1>
					<p>Loading data...</p>
				</div>
				<div className={styles.chartContainer} ref={chartContainerRef} />
			</div>
		);
	}

	// Chart margins (fixed padding around the chart area)
	const margin = { top: 20, right: 20, bottom: 60, left: 60 };

	// Calculate the actual chart area (subtract margins from container size)
	const chartWidth = chartDimensions.width - margin.left - margin.right;
	const chartHeight = chartDimensions.height - margin.top - margin.bottom;

	// Only render chart if we have dimensions and data
	if (chartDimensions.width === 0 || chartDimensions.height === 0 || data.length === 0) {
		return (
			<div className={styles.mainContainer}>
				<div className={styles.headerContainer}>
					<h1>Airliner Chart</h1>
					<p>Data loaded: {data.length} airliners</p>
				</div>
				<div className={styles.chartContainer} ref={chartContainerRef}>
					<p>Loading chart...</p>
				</div>
			</div>
		);
	}

	// Create scales for x and y axes
	// extent() finds the min and max values in the data
	const xScale = scaleLinear<number>({
		domain: extent(data, (d: AirlinerData) => d.rangeKm),
		range: [0, chartWidth],
		nice: true, // Round domain to nice round numbers
	});

	const yScale = scaleLinear<number>({
		domain: extent(data, (d: AirlinerData) => d.paxCapacityMean),
		range: [chartHeight, 0], // Note: y-axis is inverted (0 at top)
		nice: true,
	});

	// Main component render
	return (
		<div className={styles.mainContainer}>
			<div className={styles.headerContainer}>
				<h1>Airliner Chart</h1>
				<p>Data loaded: {data.length} airliners</p>
			</div>

			{/* Visx scatter plot - now responsive to container size */}
			<div className={styles.chartContainer} ref={chartContainerRef}>
				<svg width={chartDimensions.width} height={chartDimensions.height}>
					{/* Main chart group - positioned with margins */}
					<Group left={margin.left} top={margin.top}>
						{/* Render each data point as a circle */}
						{data.map((d: AirlinerData, i: number) => {
							const x = xScale(d.rangeKm);
							const y = yScale(d.paxCapacityMean);
							
							return (
								<Circle
									key={i}
									cx={x}
									cy={y}
									r={4}
									fill="#3182ce"
									opacity={0.8}
								/>
							);
						})}

						{/* Y-axis (left side) */}
						<AxisLeft
							scale={yScale}
							label="Passenger Capacity (mean)"
							labelOffset={40}
							labelProps={{
								fill: "#374151",
								fontSize: 12,
								textAnchor: "middle",
							}}
						/>

						{/* X-axis (bottom) */}
						<AxisBottom
							top={chartHeight}
							scale={xScale}
							label="Range (km)"
							labelOffset={40}
							labelProps={{
								fill: "#374151",
								fontSize: 12,
								textAnchor: "middle",
							}}
						/>
					</Group>
				</svg>
			</div>
		</div>
	);
}
