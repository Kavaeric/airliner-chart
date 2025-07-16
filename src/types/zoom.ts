/**
 * ChartViewport specifies the visible data range for zooming and panning.
 * @property {[number, number]} x - Minimum and maximum values for the x-axis (in data units)
 * @property {[number, number]} y - Minimum and maximum values for the y-axis (in data units)
 */
export interface ChartViewport {
	x: [number, number]; // [min, max] for x axis
	y: [number, number]; // [min, max] for y axis
} 