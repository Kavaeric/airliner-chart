/**
 * Represents a single airliner and its key attributes.
 * Used for type safety and IntelliSense when working with airliner datasets.
 *
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
export interface AirlinerDataRaw {
	idNumber: number;
	manufacturer: string;
	family: string;
	generation?: string;
	variant: string;
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

export interface Airliner extends AirlinerDataRaw {
	airlinerID: string;
	markerStylePax3Class: "diamond" | "line";
	markerStylePax2Class: "diamond" | "line";
	markerStylePax1Class: "diamond" | "line";
	markerStylePaxLimit: "diamond" | "line";
	markerStylePaxExit: "diamond" | "line";
} 