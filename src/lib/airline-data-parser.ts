// Import PapaParse for robust CSV parsing with TypeScript support
import Papa, { ParseResult } from "papaparse";
import { AirlinerData } from "../types/airliner";

// Helper function to find min and max values in an array
export const extent = (data: AirlinerData[], accessor: (d: AirlinerData) => number): [number, number] => {
	const values = data.map(accessor);
	return [Math.min(...values), Math.max(...values)];
};

// Function to load and parse airliner CSV data
export const loadAirlinerData = async (csvPath: string): Promise<AirlinerData[]> => {
	try {
		// Fetch the CSV file from the public directory
		// In Next.js, files in /public are served at the root URL
		const response = await fetch(csvPath);
		const csvText = await response.text();

		return new Promise((resolve, reject) => {
			// Use PapaParse to parse the CSV with configuration options
			Papa.parse(csvText, {
				header: true, // Treat first row as column headers
				skipEmptyLines: true, // Ignore empty lines in the CSV
				comments: "#", // Ignore lines starting with #

				// Transform function runs for each field during parsing
				// This converts string numbers to actual numbers
				transform: (value, field) => {
					// Check if the current field is one of our numeric fields
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

					resolve(transformedData);
				},

				// Error handling callback
				error: (error: any) => {
					console.error("PapaParse error:", error);
					reject(error);
				},
			});
		});
	} catch (error) {
		// Handle any network or other errors
		console.error("Error loading data:", error);
		throw error;
	}
}; 