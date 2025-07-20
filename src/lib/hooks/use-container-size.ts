// [IMPORT] React and core libraries //
import { useState, useEffect, useRef } from "react";

/**
 * useContainerSize
 *
 * Custom React hook for measuring the size (width and height) of a container (div) element.
 * - Returns a stateful object with the current width and height of the container.
 * - Returns a ref to attach to the container element you want to measure.
 * - Updates the dimensions whenever the window is resized.
 *
 * Note: This hook only updates on window resize, so it may not catch all content-driven size changes
 * (e.g. flexbox, content changes that don't trigger a window resize). For more accurate, content-driven
 * updates, consider using ResizeObserver (see useResponsiveSize).
 *
 * Typical use case: Attach the ref to a container whose size you want to use for layout calculations.
 *
 * @returns [dimensions, ref] where dimensions = { width, height }
 */
export interface ResponsiveDimensions {
	width: number;
	height: number;
}

export const useContainerSize = (): [ResponsiveDimensions, React.RefObject<HTMLDivElement | null>] => {
	const [dimensions, setDimensions] = useState<ResponsiveDimensions>({ width: 0, height: 0 });
	
	// Create a ref to attach to the container element we want to measure
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Function to measure the container's size and update state
		const updateSize = () => {
			if (containerRef.current) {
				const { width, height } = containerRef.current.getBoundingClientRect();
				setDimensions({ width, height });
			}
		};

		// Measure once on mount
		updateSize();

		// Update size whenever the window is resized
		window.addEventListener('resize', updateSize);
		
		// Clean up the event listener on unmount
		return () => window.removeEventListener('resize', updateSize);
	}, []); // Empty dependency array means this effect runs only once on mount

	// Return the current dimensions and the ref to attach to the container
	return [dimensions, containerRef];
}; 