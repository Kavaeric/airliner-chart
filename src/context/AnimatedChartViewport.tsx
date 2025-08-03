// [IMPORT] React and core libraries //
import React, { createContext, useContext, ReactNode, useState, useMemo, useEffect, useRef, useImperativeHandle, forwardRef } from "react";

// [IMPORT] Third-party libraries //
import { AxisScale } from "@visx/axis";

// [IMPORT] Internal context //
import { useResponsiveChartViewport } from "@/context/ResponsiveChartViewport";

/**
 * @interface AnimatedChartViewportType
 * AnimatedChartViewport Context Type
 *
 * Provides animated/smoothed scales that interpolate between viewport changes.
 * This creates smooth transitions when the viewport is updated.
 *
 * @property {Object} animatedScale D3 scales that smoothly interpolate between viewport changes.
 *   - `x`: Animated scale for X axis with smooth transitions.
 *   - `y`: Animated scale for Y axis with smooth transitions.
 * @property {Function} setAnimationDuration Function to update the animation duration.
 */
interface AnimatedChartViewportType {
	animatedScale: {
		x: AxisScale;
		y: AxisScale;
	};
	setAnimationDuration: (duration: number) => void;
}

/**
 * @interface AnimatedChartViewportRefType
 * AnimatedChartViewport Ref Type
 *
 * Exposes imperative controls for animated viewport manipulation.
 * Provides access to animated scales and animation controls.
 *
 * @property {Object} animatedScale D3 scales that smoothly interpolate between viewport changes.
 *   - `x`: Animated scale for X axis with smooth transitions.
 *   - `y`: Animated scale for Y axis with smooth transitions.
 * @property {Function} setAnimationDuration Function to update the animation duration.
 * @property {boolean} isAnimating Whether an animation is currently in progress.
 */
interface AnimatedChartViewportRefType {
	animatedScale: {
		x: AxisScale;
		y: AxisScale;
	};
	setAnimationDuration: (duration: number) => void;
	isAnimating: boolean;
}

/**
 * AnimatedChartViewport Context
 */
const AnimatedChartViewportContext = createContext<AnimatedChartViewportType | null>(null);

/**
 * @interface AnimatedChartViewportProps
 * Props for AnimatedChartViewport
 *
 * @property {ReactNode} children React children to render within the animated viewport context.
 * @property {React.RefObject<AnimatedChartViewportRefType>} [animatedViewportRef] Optional. Ref to expose imperative animated viewport controls to parent components.
 */
interface AnimatedChartViewportProps {
	children: ReactNode;
	animatedViewportRef?: React.RefObject<AnimatedChartViewportRefType>;
}

/**
 * @function AnimatedChartViewport
 * AnimatedChartViewport Component
 * 
 * A viewport manager that provides animated/smoothed scales for smooth transitions.
 * Currently implemented as a passthrough - will be enhanced with animation logic later.
 * 
 * @param {Object} props - The component props.
 * @param {ReactNode} props.children - The children to render within the animated viewport context.
 * @param {React.RefObject<AnimatedChartViewportRefType>} [props.animatedViewportRef] - Optional. Ref to expose imperative animated viewport controls to parent components.
 *
 * @returns {React.ReactNode} The children to render within the animated viewport context.
 *
 * @example
 * ```jsx
 * <AnimatedChartViewport animatedViewportRef={animatedViewportRef}>
 * 	<Chart />
 * </AnimatedChartViewport>
 * ```
 */
export const AnimatedChartViewport = forwardRef<AnimatedChartViewportRefType, AnimatedChartViewportProps>(({
	children,
	animatedViewportRef,
}, ref) => {
	// Animation duration in milliseconds
	const [animationDuration, setAnimationDuration] = useState(0); // Default 300ms for smooth interpolation

	// Subscribe to ResponsiveChartViewport to get current viewport scales
	const { viewportScale } = useResponsiveChartViewport();

	// Cache/memoise viewport scales to prevent unnecessary re-renders
	// Only updates when viewportScale.x or viewportScale.y actually change
	const targetViewportScales = useMemo(() => ({
		x: viewportScale.x,
		y: viewportScale.y,
	}), [viewportScale.x, viewportScale.y]);

	// State for current animated scales (starts with target scales)
	const [currentAnimatedScales, setCurrentAnimatedScales] = useState(targetViewportScales);

	// Animation state
	const [isAnimating, setIsAnimating] = useState(false);
	const animationStartTime = useRef<number>(0);
	const animationStartScales = useRef(targetViewportScales);

	// Effect to handle interpolation when target scales change
	useEffect(() => {

		// If animation duration is 0, immediately update
		if (animationDuration === 0) {
			setCurrentAnimatedScales(targetViewportScales);
			return;
		}

		// Start new animation
		setIsAnimating(true);
		animationStartTime.current = Date.now();
		animationStartScales.current = currentAnimatedScales;

		// Animation frame function for smooth interpolation
		const animate = () => {
			const elapsed = Date.now() - animationStartTime.current;
			const progress = Math.min(elapsed / animationDuration, 1);

			// Easing function (ease-out cubic)
			const easedProgress = 1 - Math.pow(1 - progress, 3);

			// Interpolate between start and target scales
			const interpolatedScales = {
				x: interpolateScale(animationStartScales.current.x, targetViewportScales.x, easedProgress),
				y: interpolateScale(animationStartScales.current.y, targetViewportScales.y, easedProgress),
			};

			setCurrentAnimatedScales(interpolatedScales);

			// Continue animation if not complete
			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				setIsAnimating(false);
			}
		};

		// Start animation
		requestAnimationFrame(animate);
	}, [targetViewportScales, animationDuration]);

	// Helper function to interpolate between two scales
	const interpolateScale = (startScale: AxisScale, endScale: AxisScale, progress: number): AxisScale => {
		// Create a new scale with interpolated domain
		const startDomain = startScale.domain();
		const endDomain = endScale.domain();
		
		// Ensure we're working with numeric domains for interpolation
		if (typeof startDomain[0] === 'number' && typeof startDomain[1] === 'number' &&
			typeof endDomain[0] === 'number' && typeof endDomain[1] === 'number') {
			
			const interpolatedDomain = [
				startDomain[0] + (endDomain[0] - startDomain[0]) * progress,
				startDomain[1] + (endDomain[1] - startDomain[1]) * progress,
			] as [number, number];

			// Create new scale with interpolated domain but same range
			const newScale = startScale.copy();
			newScale.domain(interpolatedDomain);
			return newScale;
		}

		// Fallback: return end scale if domains are not numeric
		return endScale;
	};

	// Animated viewport manager with interpolated scales
	const animatedViewportManager: AnimatedChartViewportType = {
		animatedScale: {
			x: currentAnimatedScales.x,
			y: currentAnimatedScales.y,
		},
		setAnimationDuration: setAnimationDuration,
	};

	// Expose animated viewport functions via ref if provided
	useImperativeHandle(ref, () => ({
		animatedScale: {
			x: currentAnimatedScales.x,
			y: currentAnimatedScales.y,
		},
		setAnimationDuration: setAnimationDuration,
		isAnimating: isAnimating,
	}), [currentAnimatedScales.x, currentAnimatedScales.y, setAnimationDuration, isAnimating]);
	
	return (
		<AnimatedChartViewportContext.Provider value={animatedViewportManager}>	
			{children}
		</AnimatedChartViewportContext.Provider>
	);
});

/**
 * useAnimatedChartViewport Hook
 * 
 * Hook to access animated viewport state from AnimatedChartViewport context
 * 
 * @property {Object} animatedScale D3 scales that smoothly interpolate between viewport changes.
 *   - `x`: Animated scale for X axis with smooth transitions.
 *   - `y`: Animated scale for Y axis with smooth transitions.
 * @property {Function} setAnimationDuration Function to update the animation duration.
 */
export function useAnimatedChartViewport(): AnimatedChartViewportType {
	const context = useContext(AnimatedChartViewportContext);
	if (!context) {
		throw new Error('useAnimatedChartViewport must be used within an AnimatedChartViewport component');
	}
	return context;
}
