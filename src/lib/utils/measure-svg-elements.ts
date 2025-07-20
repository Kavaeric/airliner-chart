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

/**
 * Measure SVG elements by CSS selectors
 * 
 * @param selectors - Array of CSS selectors to find elements
 * @returns Map of selector-index to measured dimensions
 * 
 * @example
 * ```typescript
 * const dimensions = measureSVGElementsBySelector(['.airliner-label']);
 * // Returns: Map { '.airliner-label-0' => { width: 120, height: 25 }, ... }
 * ```
 */
export function measureSVGElementsBySelector(selectors: string[]): Map<string, ElementDimensions> {
	const dimensions = new Map<string, ElementDimensions>();

	selectors.forEach(selector => {
		const elements = document.querySelectorAll(selector);
		elements.forEach((element, index) => {
			if (element instanceof SVGElement) {
				const measuredDimensions = measureSVGElement(element);
				if (measuredDimensions) {
					dimensions.set(`${selector}-${index}`, measuredDimensions);
				}
			}
		});
	});

	return dimensions;
} 