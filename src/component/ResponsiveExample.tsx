"use client";

import { Group } from "@visx/group";
import { Line } from "@visx/shape";
import { scaleLinear } from "@visx/scale";
import { useResponsiveSize } from "../lib/use-responsive-size";

// Sample data for demonstration purposes
// This shows how to structure data for a simple line chart
const sampleData = [
	{ x: 0, y: 10 },
	{ x: 1, y: 20 },
	{ x: 2, y: 15 },
	{ x: 3, y: 25 },
	{ x: 4, y: 30 },
];

// Props interface for the example component
interface ResponsiveExampleProps {
	className?: string; // Optional CSS class for styling the container
}

/**
 * ResponsiveExample Component
 * 
 * This component demonstrates how to use the useResponsiveSize hook with visx
 * to create a responsive line chart. It serves as a practical example of how
 * to implement responsive sizing in any visx/SVG component.
 * 
 * Key features demonstrated:
 * - Using the useResponsiveSize hook for automatic container sizing
 * - Creating responsive scales that adapt to container dimensions
 * - Handling loading states while dimensions are being calculated
 * - Proper SVG setup with dynamic width and height
 * 
 * Usage:
 * <ResponsiveExample className="my-chart-container" />
 * 
 * The component will automatically resize when its parent container changes
 * or when the browser window is resized.
 */
export default function ResponsiveExample({ className }: ResponsiveExampleProps) {
	// Use our reusable responsive sizing hook
	// This automatically tracks the container's dimensions and updates on resize
	const [dimensions, containerRef] = useResponsiveSize();

	// Don't render the chart if we don't have dimensions yet
	// This prevents rendering with 0x0 dimensions which would cause layout issues
	if (dimensions.width === 0 || dimensions.height === 0) {
		return (
			<div ref={containerRef} className={className}>
				<p>Loading responsive example...</p>
			</div>
		);
	}

	// Create scales for the line chart
	// These scales map data values to pixel positions on the SVG
	const xScale = scaleLinear<number>({
		domain: [0, 4], // Data domain: x values from 0 to 4
		range: [0, dimensions.width], // Pixel range: from 0 to container width
	});

	const yScale = scaleLinear<number>({
		domain: [0, 30], // Data domain: y values from 0 to 30
		range: [dimensions.height, 0], // Pixel range: from container height to 0 (SVG y-axis is inverted)
	});

	// Create the line path string for the visx Line component
	// This converts our data points into SVG path commands
	const linePath = sampleData
		.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.x)} ${yScale(d.y)}`)
		.join(' ');

	return (
		<div ref={containerRef} className={className}>
			{/* SVG element with dynamic dimensions from the hook */}
			<svg width={dimensions.width} height={dimensions.height}>
				<Group>
					{/* Render the line using visx Line component */}
					<Line
						path={linePath}
						stroke="#3182ce" // Blue color for the line
						strokeWidth={2} // Line thickness
						fill="none" // No fill for a line
					/>
					
					{/* Render data points as circles */}
					{sampleData.map((d, i) => (
						<circle
							key={i}
							cx={xScale(d.x)} // X position from scale
							cy={yScale(d.y)} // Y position from scale
							r={4} // Circle radius
							fill="#3182ce" // Blue color matching the line
						/>
					))}
				</Group>
			</svg>
		</div>
	);
} 