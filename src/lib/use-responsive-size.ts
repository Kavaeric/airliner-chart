import { useState, useEffect, useRef } from "react";

// Interface defining the dimensions returned by the useResponsiveSize hook
export interface ResponsiveDimensions {
	width: number;
	height: number;
}

/**
 * useResponsiveSize
 *
 * Custom React hook for responsive container measurement.
 * - Tracks the dimensions of a container element (width, height)
 * - Updates automatically on window resize
 * - Returns a ref to attach to the container div
 *
 * This is the foundation for all responsive chart layouts: it ensures
 * that the chart always knows its available pixel space, regardless of
 * parent layout or window size.
 *
 * Returns a tuple:
 *   [dimensions, containerRef]
 *
 * Usage:
 *   const [dimensions, ref] = useResponsiveSize();
 *   <div ref={ref}>...</div>
 */
export const useResponsiveSize = (): [ResponsiveDimensions, React.RefObject<HTMLDivElement | null>] => {
	// State to track container dimensions for responsive behavior
	// Initialized to 0 to indicate that dimensions haven't been measured yet
	const [dimensions, setDimensions] = useState<ResponsiveDimensions>({ width: 0, height: 0 });
	
	// Ref to access the container DOM element
	// This ref should be attached to the div that contains the SVG/chart
	const containerRef = useRef<HTMLDivElement>(null);

	// Effect to handle responsive sizing
	// Runs on component mount and sets up resize listener
	useEffect(() => {
		// Updates the dimensions state with the current container size
		// Called on initial mount and whenever the window is resized
		const updateSize = () => {
			if (containerRef.current) {
				// getBoundingClientRect() returns the element's size and position
				// relative to the viewport
				const { width, height } = containerRef.current.getBoundingClientRect();
				setDimensions({ width, height });
			}
		};

		// Update size immediately when the component mounts
		// This ensures we have dimensions as soon as the container is available
		updateSize();

		// Add resize listener for responsive behavior
		// The chart will automatically resize when the browser window changes
		window.addEventListener('resize', updateSize);
		
		// Cleanup: remove event listener when component unmounts
		// This prevents memory leaks and ensures proper cleanup
		return () => window.removeEventListener('resize', updateSize);
	}, []); // Empty dependency array means this effect runs only once on mount

	return [dimensions, containerRef];
}; 