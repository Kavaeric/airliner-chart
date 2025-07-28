import { ParentSize } from "@visx/responsive";
import { createContext, useContext, ReactNode, useRef, RefObject } from "react";

/**
 * ParentSize Output Interface
 * 
 * The output from the ParentSize component.
 * 
 * @see {@link https://airbnb.io/visx/docs/responsive#ParentSize}
 * @var {number} width - The width of the parent container.
 * @var {number} height - The height of the parent container.
 * @var {number} top - The top position of the parent container.
 * @var {number} left - The left position of the parent container.
 * @var {function} resize - A function that can be called inside the wrapped SVG component to trigger a resize event.
 * @var {HTMLDivElement | null} ref - A reference to the ParentSize div wrapper element.
 */
interface ParentSizeOutput {
	width: number;
	height: number;
	top: number;
	left: number;
	resize: (state: any) => void;
	ref: HTMLDivElement | null;
}

/**
 * ResponsiveSVG Interface
 * 
 * The output from the ResponsiveSVG component.
 * 
 * @var {RefObject<SVGSVGElement>} svgRef - A reference to the SVG element.
 * @var {HTMLDivElement | null} ref - A reference to the ParentSize div wrapper element.
 */
interface ResponsiveSVGType extends ParentSizeOutput {
	svgRef?: RefObject<SVGSVGElement | null>;
}

/**
 * ResponsiveSVG Context
 * 
 * React context for sharing ParentSize output and SVG reference.
 */
const ResponsiveSVGContext = createContext<ResponsiveSVGType | null>(null);

/**
 * ResponsiveSVG Props
 * 
 * Props for the <ResponsiveSVG /> component.
 * Separated into logical groups for clarity.
 * 
 * @see {@link ResponsiveSVG}
 */
interface ResponsiveSVGProps {
	children: ReactNode;
	// Outer div props (for ResizeObserver, styling, etc.)
	divProps?: React.HTMLProps<HTMLDivElement>;
	// ParentSize props (from @visx/responsive)
	parentSizeProps?: {
		className?: string;
		debounceTime?: number;
		style?: React.CSSProperties;
		enableDebounceLeadingCall?: boolean;
		ignoreDimensions?: ("width" | "height" | "top" | "left") | ("width" | "height" | "top" | "left")[];
		initialSize?: { width: number; height: number };
	};
	// SVG element props
	svgProps?: React.SVGProps<SVGSVGElement>;
}

/**
 * ResponsiveSVG Component
 *
 * A context provider that wraps @visx/responsive's <ParentSize /> and provides SVG dimensions
 * to all child components via the useResponsiveSVG hook.
 * 
 * **Architecture:**
 * ```
 * <div {...divProps}>                    // Outer div (for ResizeObserver, styling)
 *   <ParentSize {...parentSizeProps}>    // ParentSize div (measures container)
 *     <svg {...svgProps}>                // SVG element (renders content)
 *       <SVGContext.Provider>            // Context provider
 *         {children}                     // SVG content
 *       </SVGContext.Provider>
 *     </svg>
 *   </ParentSize>
 * </div>
 * ```
 * 
 * **Key Features:**
 * - **Responsive sizing** - Automatically measures and adapts to container size
 * - **ResizeObserver ready** - Pass refs to divProps for external measurement
 * - **CSS Grid friendly** - Handles sizing constraints to prevent SVG overflow
 * - **Flexible styling** - Each layer can be styled independently
 * - **Context sharing** - All child components can freely access sizing data
 * 
 * **Usage:**
 * - Place this inside a CSS Grid or Flexbox container
 * - Use divProps for ResizeObserver refs and outer styling
 * - Use parentSizeProps for ParentSize configuration
 * - Use svgProps for SVG element styling and refs
 * - In child components, use useResponsiveSVG() to access dimensions
 * 
 * @param {React.ReactNode} children - SVG-based React components that will receive sizing context.
 * 
 * **divProps (outer div wrapper):**
 * @param {React.HTMLProps<HTMLDivElement>} divProps - Props for the outermost div wrapper.
 *   Use this for ResizeObserver refs and outer styling. It will automatically be given a minWidth, maxWidth, minHeight, and maxHeight of 0 and 100% respectively to ensure proper sizing, but these can be overridden.
 *   Common use cases:
 *   - `ref: resizeObserverRef` - For external dimension measurement
 *   - `className: "plot-area"` - Custom styling classes
 * 
 * **parentSizeProps (ParentSize wrapper):**
 * @param {string} parentSizeProps.className - Optional className for the ParentSize div wrapper.
 * @param {number} parentSizeProps.debounceTime - Debounce time for resize events in milliseconds. Defaults to 300.
 * @param {React.CSSProperties} parentSizeProps.style - CSS styles for the ParentSize div wrapper.
 *   Note: width: '100%' and height: '100%' are automatically added to ensure proper sizing.
 * @param {boolean} parentSizeProps.enableDebounceLeadingCall - Enable immediate render on mount. Defaults to true.
 * @param {("width" | "height" | "top" | "left" | ("width" | "height" | "top" | "left")[])} parentSizeProps.ignoreDimensions - Dimensions to ignore for resize events.
 * @param {Partial<{width: number, height: number}>} parentSizeProps.initialSize - Initial size before measurement. Defaults to { width: 0, height: 0 }.
 * 
 * **svgProps (SVG element):**
 * @param {React.SVGProps<SVGSVGElement>} svgProps - Props for the SVG element.
 *   The SVG automatically gets these default styles:
 *   - `display: block` - Prevents inline spacing issues
 *   - `width: 100%` - Fills container width
 *   - `height: 100%` - Fills container height
 *   Common use cases:
 *   - `ref: zoom.containerRef` - For @visx/zoom integration
 *   - `style: { cursor: 'grab' }` - Interactive styling
 *   - `className: "chart-svg"` - Custom SVG styling
 * 
 * **Usage Examples:**
 * 
 * **Basic usage:**
 * ```jsx
 * <ResponsiveSVG>
 *   <MySVGComponent />
 * </ResponsiveSVG>
 * ```
 * 
 * **Set up with a ResizeObserver callback:**
 * ```jsx
 * <ResponsiveSVG 
 *   divProps={{
 *     ref: resizeObserverRef,
 *     style: { minWidth: 0, maxWidth: '100%', minHeight: 0, maxHeight: '100%' },
 *     className: "plot-area"
 *   }}
 *   parentSizeProps={{ debounceTime: 1 }}
 *   svgProps={{ 
 *     ref: zoom.containerRef,
 *     style: { cursor: 'grab' }
 *   }}
 * >
 *   <MySVGComponent />
 * </ResponsiveSVG>
 * ```
 * 
 * **CSS Grid integration:**
 * ```jsx
 * <div style={{
 *   display: "grid",
 *   gridTemplateColumns: "32px auto",
 *   gridTemplateRows: "minmax(0, 1fr) 32px"
 * }}>
 *   <ResponsiveSVG parentSizeProps={{ style: { background: "#ffe0e0" }}}>
 *     <YAxis />
 *   </ResponsiveSVG>
 *   
 *   <ResponsiveSVG divProps={{ ref: resizeObserverRef }}>
 *     <Plot />
 *   </ResponsiveSVG>
 *   
 *   <ResponsiveSVG parentSizeProps={{ style: { background: "#e0ffe0" }}}>
 *     <XAxis />
 *   </ResponsiveSVG>
 * </div>
 * ```
 * 
 * **Example with useResponsiveSVG:**
 * ```jsx
 * function MySVGComponent() {
 *   const { width, height, top, left, resize, ref, svgRef } = useResponsiveSVG();
 *   
 *   return (
 *     <g>
 *       <rect width={width} height={height} fill="red" />
 *       <text x={width / 2} y={height / 2} textAnchor="middle">
 *         {width} x {height}
 *       </text>
 *     </g>
 *   );
 * }
 * ```
 * 
 * @see {@link https://airbnb.io/visx/docs/responsive#ParentSize}
 * @see {@link useResponsiveSVG}
 */
export function ResponsiveSVG({
	children,
	divProps = {},
	parentSizeProps = {},
	svgProps = {},
}: ResponsiveSVGProps) {

	const defaultDivStyle: React.CSSProperties = {
		minWidth: 0,
		maxWidth: '100%',
		minHeight: 0,
		maxHeight: '100%',
		...divProps.style
	};

	// Default SVG styles for responsive behavior
	const defaultSvgStyle: React.CSSProperties = {
		display: 'block',
		width: '100%',
		height: '100%',
		...svgProps.style
	};

	return (
		<div style={defaultDivStyle} {...divProps}>
			<ParentSize
				// Pass through ParentSize props
				className={parentSizeProps.className}
				debounceTime={parentSizeProps.debounceTime}
				style={{...parentSizeProps.style, width: '100%', height: '100%'}}
				enableDebounceLeadingCall={parentSizeProps.enableDebounceLeadingCall}
				ignoreDimensions={parentSizeProps.ignoreDimensions}
				initialSize={parentSizeProps.initialSize}
			>
				{(parent) => (
					<svg
						{...svgProps}
						width={parent.width}
						height={parent.height}
						style={defaultSvgStyle}
					>
						<ResponsiveSVGContext.Provider value={{
							// Pass through all ParentSize output
							width: parent.width,
							height: parent.height,
							top: parent.top,
							left: parent.left,
							resize: parent.resize,
							ref: parent.ref,
							// Add our SVG-specific properties
							svgRef: svgProps.ref as RefObject<SVGSVGElement | null> | undefined
						}}>
							{children}
						</ResponsiveSVGContext.Provider>
					</svg>
				)}
			</ParentSize>
		</div>
	);
}

/**
 * useResponsiveSVG Hook
 * 
 * Hook to access ALL ParentSize output and SVG reference from <ResponsiveSVG />.
 * This hook provides access to the container dimensions, position, resize function, and
 * references to both the ParentSize div and SVG element.
 * 
 * **Returns:**
 * - **width, height** - Current container dimensions in pixels
 * - **top, left** - Container position relative to viewport
 * - **resize** - Function to programmatically trigger resize events
 * - **ref** - Reference to the ParentSize div wrapper element
 * - **svgRef** - Reference to the SVG element (if provided via svgProps.ref)
 * 
 * **Example:**
 * ```jsx
 * function MySVGComponent() {
 *   const { 
 *     width, height, top, left, 
 *     resize, ref, svgRef 
 *   } = useResponsiveSVG();
 *   
 *   // You can call resize() to trigger a resize event
 *   const handleResize = () => resize({ width: width * 2, height: height * 2 });
 *   
 *   return (
 *     <g>
 *       <rect width={width} height={height} fill="red" />
 *       <text x={width / 2} y={height / 2} textAnchor="middle">
 *         {width} x {height}
 *       </text>
 *       <button onClick={handleResize}>Resize</button>
 *     </g>
 *   );
 * }
 * ```
 * 
 * **Common Use Cases:**
 * - **Scaling content** - Use width/height to scale SVG elements proportionally
 * - **Positioning elements** - Use width/height to center or position elements
 * - **Responsive layouts** - Adjust layout based on container size
 * - **Programmatic resizing** - Call resize() to trigger measurement updates
 * - **Accessing DOM elements** - Use ref and svgRef for direct DOM manipulation
 * 
 * **Note:** This hook must be used within a ResponsiveSVG component.
 * 
 * @returns {ResponsiveSVGType} Object containing all ParentSize output plus svgRef
 * @throws {Error} If used outside of ResponsiveSVG
 * @see {@link ResponsiveSVG}
 */
export function useResponsiveSVG(): ResponsiveSVGType {
	const context = useContext(ResponsiveSVGContext);
	if (!context) {
		throw new Error('useResponsiveSVG must be used within ResponsiveSVG');
	}
	return context;
}