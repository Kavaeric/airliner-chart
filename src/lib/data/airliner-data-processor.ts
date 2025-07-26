// [IMPORT] Third-party libraries //
import Papa, { ParseResult } from "papaparse";
// [IMPORT] Types/interfaces //
import { AirlinerStats } from "@/lib/data/airliner-types";

export interface AirlinerData extends AirlinerStats {
	markerStylePax3Class: "diamond" | "line";
	markerStylePax2Class: "diamond" | "line";
	markerStylePax1Class: "diamond" | "line";
	markerStylePaxLimit: "diamond" | "line";
	markerStylePaxExit: "diamond" | "line";
	airlinerID: string;
}

/**
 * Loads and parses airliner CSV data into Airliner objects.
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
 * @returns Promise<Airliner[]> Array of parsed airliner objects
 */
export async function loadAirlinerData(csvPath: string): Promise<AirlinerStats[]> {

	// Fetch the CSV file asynchronously
	const response = await fetch(csvPath);
	const csvText = await response.text();

	// Parse the CSV asynchronously
	return new Promise((resolve, reject) => {
		Papa.parse(csvText, {
			header: true,
			skipEmptyLines: "greedy",
			comments: "#",
			transform: (value, field) => {
				if (value === "" && field === 0) {
					return null;
				}
				return value;
			},

			// When the CSV is fully parsed, process the data
			complete: (results: ParseResult<any>) => {
				// If the CSV is missing a row of type hints, reject the promise
				const typeRow = results.data[0];
				if (!typeRow) {
					reject(new Error("CSV missing type row"));
					return;
				}

				// Process the data
				const data: (AirlinerStats | null)[] = results.data.slice(1).map((row: any, idx: number) => {
					const obj: any = {};
					Object.keys(row).forEach(key => {
						const type = typeRow[key];
						let value = row[key];
						if (type === "number") {
							value = value === undefined || value === "" ? undefined : Number(value);
						} else if (type === "string") {
							value = value === "" ? undefined : value;
						}
						obj[key] = value;
					});

					// Return the validated data
					const validatedData = validateAirlinerData(obj);
					if (!validatedData) {
						return null;
					}
					return validatedData;
				});
				resolve(data as AirlinerStats[]);
			},
			error: (error: any) => {
				reject(error);
			},
		});
	});
}

/**
 * @function validateAirlinerData
 * @description Validates an airliner data object.
 * 
 * @param data - The airliner data to validate.
 * @returns The validated airliner data, or null if the data is invalid.
 */
function validateAirlinerData(data: AirlinerStats): AirlinerStats | null {

	function logValidationWarning(reason: string) {
		console.warn(`[AirlinerDataProcessor] Airliner data is not valid. ${reason}, data:`, data);
	}

	// A range must be defined
	if (!data.rangeKM) {
		logValidationWarning("rangeKM undefined");
		return null;
	}

	// A manufacturer must be defined
	if (!data.manufacturer) {
		logValidationWarning("manufacturer undefined");
		return null;
	}

	// A family must be defined
	if (!data.family) {
		logValidationWarning("family undefined");
		return null;
	}

	// An ICAO code must be defined
	if (!data.nameICAO) {
		logValidationWarning("nameICAO undefined");
		return null;
	}
	
	// At least one pax class must be defined
	if (!data.pax3Class && !data.pax2Class && !data.pax1Class) {
		logValidationWarning("No pax classes defined");
		return null;
	}

	// Return the validated data
	return data;
}