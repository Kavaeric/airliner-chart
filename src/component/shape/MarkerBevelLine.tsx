/**
 * MarkerBevelLine
 * 
 * Renders a polygon that visually represents a thick, bevelled line between two points.
 * The polygon is constructed to simulate a line of given thickness, with bevelled ends,
 * by calculating six points: four corners and two extruded midpoints.
 * 
 * @param {number} x1 - X coordinate of the start point.
 * @param {number} y1 - Y coordinate of the start point.
 * @param {number} x2 - X coordinate of the end point.
 * @param {number} y2 - Y coordinate of the end point.
 * @param {number} [weight=1] - Thickness of the line.
 * @param {string} [ends="both"] - Which ends have bevelled points: "start", "end", "both", or "none".
 * @param {React.SVGProps<SVGPolygonElement>} props - Additional SVG polygon props.
 * @returns {JSX.Element} SVG polygon element representing the bevelled line.
 */
export default function MarkerBevelLine({
	x1,
	y1,
	x2,
	y2,
	weight = 1,
	ends = "both",
	...props
}: {
	x1: number
	y1: number
	x2: number
	y2: number
	weight?: number
	ends?: "start" | "end" | "both" | "none"
} & React.SVGProps<SVGPolygonElement>) {
	// Calculate the angle of the line
	const angle = Math.atan2(y2 - y1, x2 - x1)
	
	// Calculate perpendicular offset for thickness
	const halfWeight = weight / 2
	const perpX = Math.cos(angle + Math.PI / 2) * halfWeight
	const perpY = Math.sin(angle + Math.PI / 2) * halfWeight
	
	// Calculate parallel offset for midpoint extrusion
	const parallelX = Math.cos(angle) * halfWeight
	const parallelY = Math.sin(angle) * halfWeight
	
	// Create the six points of the thick line polygon
	const points = [
		// Top-left corner
		`${x1 - perpX},${y1 - perpY}`,
		// Top-right corner  
		`${x2 - perpX},${y2 - perpY}`,
		// Midpoint line at end (x2,y2) - extruded outwards (only if end is bevelled)
		...(ends === "both" || ends === "end" ? [`${x2 + parallelX},${y2 + parallelY}`] : []),
		// Bottom-right corner
		`${x2 + perpX},${y2 + perpY}`,
		// Bottom-left corner
		`${x1 + perpX},${y1 + perpY}`,
		// Midpoint line at start (x1,y1) - extruded outwards (only if start is bevelled)
		...(ends === "both" || ends === "start" ? [`${x1 - parallelX},${y1 - parallelY}`] : [])
	].join(' ')
	
	return (
		<polygon
			points={points}
			{...props}
		/>
	)
}
