/**
 * Represents a single airliner and its key attributes.
 * Used for type safety and IntelliSense when working with airliner datasets.
 *
 * @property idNumber       An ID number for the airliner. Composed into the airlinerID with the ICAO code.
 * @property manufacturer   The company that built the airliner
 * @property family         The family or series of the airliner
 * @property generation     The generation or subfamily (optional)
 * @property variant        The specific variant or model
 * @property nameCommon     Common or marketing name (optional)
 * @property nameICAO       ICAO aircraft type designator
 * @property firstDelivery  Year of first delivery (optional)
 * @property manufactureEnd Year production ended (optional)
 * @property status         Current status: `development` `active` `discontinued` `retired`
 * @property bodyType       Fuselage type: `widebody` `narrowbody`
 * @property rangeKM        Maximum range in kilometres
 * @property pax3Class      Typical 3-class seating capacity (optional)
 * @property pax2Class      Typical 2-class seating capacity (optional)
 * @property pax1Class      Typical 1-class seating capacity (optional)
 * @property paxLimit       Maximum passengers by seat limit (optional)
 * @property paxExit        Maximum passengers by exit limit (optional)
 */
export type AirlinerStats = {
	idNumber: number;
	manufacturer: string;
	family: string;
	generation?: string;
	variant?: string;
	nameCommon?: string;
	nameICAO: string;
	firstDelivery?: number;
	manufactureEnd?: number;
	status?: string;
	bodyType?: string;
	rangeKM: number;
	pax3Class?: number;
	pax2Class?: number;
	pax1Class?: number;
	paxLimit?: number;
	paxExit?: number;
}

/**
 * @type {AirlinerData}
 * @description A raw data object from the CSV file. Contains just the ID and stats.
 * 
 * @property {string} airlinerID - The unique identifier for the airliner. Composed of an ID number and its ICAO code.
 * @property {AirlinerStats} airlinerData - The raw data for the airliner as extracted from the CSV.
 */
export type AirlinerData = {
	airlinerID: string;
	airlinerData: AirlinerStats;
}

/**
 * @type {AirlinerModel}
 * @description A consolidated viewmodel object for an airliner, containing its data and all plotting elements.
 * 
 * @property {string} airlinerID - The unique identifier for the airliner. Composed of an ID number and its ICAO code.
 * @property {AirlinerStats} airlinerData - The raw data for the airliner as extracted from the CSV.
 * @property {AirlinerMarkerSeries[]} markerSeries - An array of marker series, each containing an array of markers and a bounding box for the series.
 * @property {AirlinerLabel} labels - A label, containing text, a bounding box for the label, and the coordinates of the label.
 * @property {string} description - Optional markdown description content for the airliner. Loaded from files named by airlinerID (e.g., "16-A359.md").
 */
export type AirlinerModel = AirlinerData & {
	// Markers
	markerSeries?: AirlinerMarkerSeries;

	// Labels
	labels?: AirlinerLabel;
	
	// Description
	description?: string;
}

/**
 * @type {AirlinerMarkerSeries}
 * @description Plot data for a series of markers for an airliner.
 * 
 * @property {AirlinerMarker[]} markers - An array of markers for the series.
 * @property {BBox} seriesBBox - A bounding box for the series.
 */
export type AirlinerMarkerSeries = {
	markers: AirlinerMarker[];
	lines: AirlinerLine;
	seriesBBox: {
		x: [number, number];
		y: [number, number];
	}
}

/**
 * @type {AirlinerLine}
 * @description Plot data for the connecting lines between markers for an airliner.
 * 
 * @property {string} lineClass - The class of the line.
 * @property {number} x1 - The x coordinate for the smallest pax class marker.
 * @property {number} x2 - The x coordinate for the largest pax class marker.
 * @property {number} x3 - The x coordinate for the largest marker.
 * @property {number} y - The y coordinate for the line.
 */
export type AirlinerLine = {
	x1: number;
	x2: number;
	x3: number;
	y: number;
}

/**
 * @type {AirlinerMarker}
 * @description Plot data for a single marker for an airliner.
 * 
 * @property {string} markerClass - The class of the marker.
 * @property {BBox} markerCoordinates - The coordinates of the marker.
 */
export type AirlinerMarker = {
	markerClass: "pax3Class" | "pax2Class" | "pax1Class" | "paxLimit" | "paxExit";
	markerCoordinates: { x: number; y: number };
}

/**
 * @type {AirlinerLabel}
 * @description Plot data for a single label for an airliner.
 * 
 * @property {string} labelText - The text of the label.
 * @property {object} labelDimensions - A bounding box for the label dimensions.
 * @property {object} labelAnchor - The anchor point of the label.
 * @property {object} labelCoordinates - The placed coordinates of the label. Can be null if the label is not placed.
 * @property {number | null} clusterID - The cluster index this label belongs to. Null for isolated labels.
 * @property {number | null} clusterSize - The number of labels in this cluster. Null for isolated labels.
 */
export type AirlinerLabel = {
	labelText: string;
	labelDimensions: {
		width: number;
		height: number;
	} | null
	labelAnchor: { x: number; y: number };
	labelCoordinates: { x: number; y: number } | null;
	clusterID?: number | null;
	clusterSize?: number | null;
}

