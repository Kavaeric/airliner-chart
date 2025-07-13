"use client";

// Import React hooks for state management and side effects
import { useState, useEffect } from "react";
import styles from "./page.module.css";
// Import PapaParse for robust CSV parsing with TypeScript support
import Papa, { ParseResult } from "papaparse";

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

export default function Home() {
	// State to store the parsed airliner data
	const [data, setData] = useState<AirlinerData[]>([]);
	// State to track loading status for better UX
	const [loading, setLoading] = useState(true);

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

	// Show loading state while data is being fetched
	if (loading) {
		return (
			<div className={styles.container}>
				<h1>Airliner Chart</h1>
				<p>Loading data...</p>
			</div>
		);
	}

	// Main component render
	return (
		<div className={styles.container}>
			<h1>Airliner Chart</h1>
			<p>Data loaded: {data.length} airliners</p>

			{/* Visx scatter plot will go here */}
			<div className={styles.chartContainer}>
				<p>Scatter plot coming soon...</p>
				{/* Display first 3 records as JSON for debugging/verification */}
				<pre>{JSON.stringify(data.slice(0, 3), null, 2)}</pre>
			</div>
		</div>
	);
}
