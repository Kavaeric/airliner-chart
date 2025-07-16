// Import PapaParse for robust CSV parsing with TypeScript support
import Papa, { ParseResult } from "papaparse";
import { AirlinerData } from "../types/airliner";

/**
 * Loads and parses airliner CSV data into AirlinerData objects.
 *
 * This parser expects the CSV to have:
 *   - The first row as headers (field names)
 *   - The second row as type hints (e.g., 'string', 'number')
 *   - Data rows after that
 *   - Comment lines (starting with #) and empty lines are ignored
 *
 * The parser dynamically maps headers and types, so you don't need to hardcode field names.
 * It uses PapaParse for robust CSV parsing.
 *
 * @param csvPath Path to the CSV file (relative to public/)
 * @returns Promise<AirlinerData[]> Array of parsed airliner objects
 */
export const loadAirlinerData = async (csvPath: string): Promise<AirlinerData[]> => {
	// Fetch the CSV file as text
	const response = await fetch(csvPath);
	const csvText = await response.text();

	// Use PapaParse to parse the CSV into objects
	return new Promise((resolve, reject) => {
		Papa.parse(csvText, {
			header: true, // Use the first row as object keys
			skipEmptyLines: "greedy", // Ignore blank lines including those that reduce to whitespace
			comments: "#", // Ignore lines starting with #

			transform: (value, field) => {
				// Skip rows that are just commas (empty data rows)
				if (value === "" && field === 0) {
					// Check if this is a row of empty cells
					return null; // This will cause PapaParse to skip the row
				}
				return value;
			},

			complete: (results: ParseResult<any>) => {
				// Get the type row (second row) for type information
				const typeRow = results.data[0]; // First data row after header
				if (!typeRow) {
					reject(new Error("CSV missing type row"));
					return;
				}

				// For each row after the type row, build an AirlinerData object
				const data: AirlinerData[] = results.data.slice(1).map((row: any) => {
					const obj: any = {};

					// Use the header keys from PapaParse
					Object.keys(row).forEach(key => {
						const type = typeRow[key];
						let value = row[key];
						
						// Convert value to the correct type based on the type row
						if (type === "number") {
							value = value === undefined || value === "" ? undefined : Number(value);
						} else if (type === "string") {
							value = value === "" ? undefined : value;
						}
						obj[key] = value;
					});
					
					return obj as AirlinerData;
				});
				resolve(data);
			},
			error: (error: any) => {
				reject(error);
			},
		});
	});
}; 