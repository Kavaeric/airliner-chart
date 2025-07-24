// [IMPORT] Third-party libraries //
import Papa, { ParseResult } from "papaparse";
// [IMPORT] Types/interfaces //
import { AirlinerDataRaw, Airliner } from "@/lib/data/airliner-types";

export interface AirlinerData extends AirlinerDataRaw {
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
export default async function loadAirlinerData(csvPath: string): Promise<Airliner[]> {

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
				const data: Airliner[] = results.data.slice(1).map((row: any, idx: number) => {
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
					return processAirlinerData(obj, idx);
				});
				resolve(data);
			},
			error: (error: any) => {
				reject(error);
			},
		});
	});
}

function processAirlinerData(d: AirlinerDataRaw, index: number): Airliner {
	let airlinerData: any = { ...d };

	// Assign unique airlinerID in the format idNumber-nameICAO
	airlinerData.airlinerID = `${d.idNumber}-${d.nameICAO}`;

	// Check if we have a valid range to render
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
	// If the passenger capacity value is undefined, leave it as-is
	// Gotta be careful here because if either value is undefined, Math.min/max will return NaN
	if (airlinerData.paxLimit) {
		airlinerData.pax3Class = airlinerData.pax3Class ? Math.min(airlinerData.pax3Class, airlinerData.paxLimit) : airlinerData.pax3Class;
		airlinerData.pax2Class = airlinerData.pax2Class ? Math.min(airlinerData.pax2Class, airlinerData.paxLimit) : airlinerData.pax2Class;
		airlinerData.pax1Class = airlinerData.pax1Class ? Math.min(airlinerData.pax1Class, airlinerData.paxLimit) : airlinerData.pax1Class;
	}
	
	// Clamp again but to the paxExit value, if paxExit is defined
	// If the passenger capacity value is undefined, leave it as-is
	if (airlinerData.paxExit) {
		airlinerData.pax3Class = airlinerData.pax3Class ? Math.min(airlinerData.pax3Class, airlinerData.paxExit) : airlinerData.pax3Class;
		airlinerData.pax2Class = airlinerData.pax2Class ? Math.min(airlinerData.pax2Class, airlinerData.paxExit) : airlinerData.pax2Class;
		airlinerData.pax1Class = airlinerData.pax1Class ? Math.min(airlinerData.pax1Class, airlinerData.paxExit) : airlinerData.pax1Class;
	}

	// Define the marker styles for each passenger capacity value (solid, outline, line)
	airlinerData.markerStylePax3Class = "diamond";
	airlinerData.markerStylePax2Class = "diamond";
	airlinerData.markerStylePax1Class = "diamond";
	airlinerData.markerStylePaxLimit  = "line";
	airlinerData.markerStylePaxExit   = "line";

	return airlinerData as Airliner;
}