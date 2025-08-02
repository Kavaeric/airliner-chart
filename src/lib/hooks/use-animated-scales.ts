"use client";

// [IMPORT] React //
import { useMemo, useRef, useEffect, useReducer } from "react";

// [IMPORT] Third-party libraries //
import { useSpring, animated, SpringValue } from "@react-spring/web";
import { scaleLinear } from "@visx/scale";
import type { AxisScale } from "@visx/axis";

/**
 * @interface AnimatedScalesInput
 * Input scales from viewport context
 */
interface AnimatedScalesInput {
	x: AxisScale;
	y: AxisScale;
}

/**
 * @interface AnimatedScalesOutput
 * Output scales with same interface as D3 scaleLinear
 */
interface AnimatedScalesOutput {
	x: AxisScale;
	y: AxisScale;
}

/**
 * @interface AnimationOptions
 * Configuration for animation behavior
 */
interface AnimationOptions {
	animate: boolean;
	duration?: number;
}

/**
 * @function useAnimatedScales
 * 
 * Custom hook that takes viewport scales and returns optionally animated scales.
 * When animate is false, returns scales immediately (pass-through).
 * When animate is true, interpolates between previous scale domains and new scale domains using react-spring.
 * 
 * The returned scales have exactly the same interface as D3 scaleLinear so existing components don't need to change.
 * 
 * @param scales - Input scales from viewport context
 * @param options - Animation configuration
 * @returns Animated scales with same interface as D3 scaleLinear
 * 
 * @example
 * ```typescript
 * const animatedScales = useAnimatedScales(
 *   { x: xScale, y: yScale }, 
 *   { animate: true, duration: 300 }
 * );
 * // Returns: { x: animatedXScale, y: animatedYScale }
 * ```
 */
export function useAnimatedScales(
	scales: AnimatedScalesInput,
	options: AnimationOptions
): AnimatedScalesOutput {
	const { animate, duration = 300 } = options;
	
	// Force re-renders during animation
	const [, forceUpdate] = useReducer(x => x + 1, 0);
	
	// Track previous domains to detect changes
	const prevDomainsRef = useRef<{ x: [number, number]; y: [number, number] } | null>(null);
	
	// Extract current domains from input scales
	const currentDomains = useMemo(() => ({
		x: scales.x.domain() as [number, number],
		y: scales.y.domain() as [number, number]
	}), [scales.x, scales.y]);
	
	// Initialize previous domains on first render
	useEffect(() => {
		if (prevDomainsRef.current === null) {
			prevDomainsRef.current = currentDomains;
		}
	}, [currentDomains]);
	
	// React Spring animation for domain interpolation with onChange callback
	const animatedDomains = useSpring({
		x: currentDomains.x,
		y: currentDomains.y,
		config: {
			duration: animate ? duration : 0,
			tension: 100,
			friction: 10
		},
		immediate: !animate,
		onChange: () => {
			// Force re-render on every animation frame
			forceUpdate();
		}
	});
	
	// Update previous domains when current domains change
	useEffect(() => {
		prevDomainsRef.current = currentDomains;
	}, [currentDomains]);
	
	// Create animated scales with interpolated domains
	const animatedScales = useMemo(() => {
		// If not animating, return input scales directly
		if (!animate) {
			return {
				x: scales.x,
				y: scales.y
			};
		}
		
		// Create new D3 scales with interpolated domains
		// These will be updated on each animation frame by react-spring
		const xScale = scaleLinear({
			domain: animatedDomains.x.get(),
			range: scales.x.range()
		});
		
		const yScale = scaleLinear({
			domain: animatedDomains.y.get(),
			range: scales.y.range()
		});
		
		return { x: xScale, y: yScale };
	}, [scales, animate, animatedDomains]);
	
	// Update scale domains on each animation frame
	useEffect(() => {
		if (!animate) return;
		
		// Update scales with current animated domain values
		animatedScales.x.domain(animatedDomains.x.get());
		animatedScales.y.domain(animatedDomains.y.get());
	}, [animate, animatedDomains.x, animatedDomains.y, animatedScales]);
	
	return animatedScales;
} 