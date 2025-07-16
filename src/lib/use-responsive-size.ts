import { useEffect, useRef } from "react";

/**
 * useResponsiveSize
 *
 * Custom React hook for measuring the size (width and height) of a DOM element.
 * - Returns a ref to attach to a <div> (or any HTML element).
 * - When the element's size changes (due to window resize, content change, flexbox, etc.),
 *   the hook calls the provided callback with the new dimensions.
 * - Uses ResizeObserver for accurate, content-driven updates (not just window resize).
 *
 * Typical use case: Attach the ref to a component that needs to report its size up to a parent.
 *
 * @param onDimensionsChange Optional callback to report { width, height } when the element resizes.
 * @returns ref to attach to the element you want to measure.
 */
export function useResponsiveSize(
	onDimensionsChange?: (dims: { width: number; height: number }) => void
) {
	// Create a ref to attach to the element we want to measure
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// If the ref is not attached to an element yet, do nothing
		if (!ref.current) return;

		// Function to measure the element's size and call the callback
		const measure = () => {
			const rect = ref.current!.getBoundingClientRect();
			if (onDimensionsChange) {
				onDimensionsChange({ width: rect.width, height: rect.height });
			}
		};

		// Measure once on mount
		measure();

		// Set up a ResizeObserver to watch for size changes
		const ro = new window.ResizeObserver(measure);
		ro.observe(ref.current);

		// Clean up the observer on unmount
		return () => ro.disconnect();
	}, [onDimensionsChange]);

	// Return the ref to be attached to the element you want to measure
	return ref;
} 