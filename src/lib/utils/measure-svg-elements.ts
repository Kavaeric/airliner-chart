/**
 * Pure SVG Element Measurement Utility
 * 
 * Provides pure functions to measure SVG element dimensions.
 * No hooks, no state - just direct measurement of DOM elements.
 */

/**
 * Measured dimensions of an SVG element
 */
interface ElementDimensions {
	width: number;
	height: number;
}

/**
 * Measure a single SVG element
 * 
 * @param element - SVG element to measure
 * @returns Measured dimensions or null if element is invalid
 */
export function measureSVGElement(element: SVGElement | null): ElementDimensions | null {
	if (!element) return null;
	
	const bbox = element.getBoundingClientRect();
	
	return {
		width: bbox.width,
		height: bbox.height
	};
}