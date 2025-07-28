// [IMPORT] React and core libraries //
import React from "react";

// [IMPORT] Context providers/hooks //
import { ResponsiveSVG } from "@/context/ResponsiveSVG";
import { ParentSize } from "@visx/responsive";

/**
 * ResponsiveSVGDemo Component
 *
 * A demonstration of ResponsiveSVG showing why it's needed and how it solves
 * common responsive SVG sizing issues in CSS Grid layouts.
 *
 * **Demo Scenarios:**
 * 1. **HTML/CSS Benchmark** - Pure HTML/CSS works perfectly
 * 2. **ParentSize Alone** - @visx/responsive without proper wrapper setup (PROBLEMATIC)
 * 3. **Manual Wrapper** - Proper wrapper div with minmax constraints (WORKS)
 * 4. **ResponsiveSVG** - The component that handles this automatically (WORKS)
 *
 * **Key Learning:**
 * SVG elements in CSS Grid require explicit min/max constraints to shrink properly.
 * ResponsiveSVG provides a clean API that handles this complexity for you.
 */
export default function ResponsiveSVGDemo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "2rem" }}>

			<div>
				<h2>ResponsiveSVG Demo</h2>
				<p>
					This demo shows the evolution from basic responsive SVG to the ResponsiveSVG solution.
					Resize your browser window vertically to see how each approach handles responsive sizing.
				</p>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr 1fr 1fr",
					gap: "1rem",
				}}
			>
				<div>
					<h3>✅ Scenario 1: HTML/CSS</h3>
					<p>Pure HTML/CSS - works perfectly as expected.</p>
				</div>
				<div>
					<h3>❌ Scenario 2: ParentSize alone</h3>
					<p>@visx/responsive ParentSize without proper wrapper setup - grows but won't shrink.</p>
				</div>
				<div>
					<h3>✅ Scenario 3: Manual wrapper</h3>
					<p>Proper wrapper div with minmax constraints - works but requires manual setup.</p>
				</div>
				<div>
					<h3>✅ Scenario 4: ResponsiveSVG</h3>
					<p>The ResponsiveSVG component. Clean API that handles everything automatically.</p>
				</div>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr 1fr 1fr",
					gap: "1rem",
				}}
			>
				{/* Scenario 1: HTML/CSS Benchmark */}
				<div>
					<div
						style={{
							height: "10vh",
							display: "grid",
							gridTemplateRows: "1fr 1fr",
							gap: "0.5rem",
							outline: '2px solid #4CAF50',
							backgroundColor: '#E8F5E8'
						}}
					>
						<div style={{ width: '100%', height: '100%', backgroundColor: 'lightgrey', outline: '1px solid black'}}>
							<div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'grey', margin: 'auto', position: 'relative', top: '50%', transform: 'translateY(-50%)' }} />
						</div>
						<div style={{ width: '100%', height: '100%', backgroundColor: 'grey', outline: '1px solid black'}}>
							<div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'lightgrey', margin: 'auto', position: 'relative', top: '50%', transform: 'translateY(-50%)' }} />
						</div>
					</div>
				</div>

				{/* Scenario 2: ParentSize Alone (Problematic) */}
				<div>
					<div
						style={{
							height: "10vh",
							display: "grid",
							gridTemplateRows: "1fr 1fr",
							gap: "0.5rem",
							outline: '2px solid #f44336',
							backgroundColor: '#FFEBEE'
						}}
					>
						<div style={{ width: '100%', height: '100%'}}>
							<ParentSize>
								{(parent) => (
									<svg width={parent.width} height={parent.height} style={{ display: 'block', width: '100%', height: '100%', outline: '1px solid black'}}>
										<rect width="100%" height="100%" fill="lightgrey" />
										<circle cx="50%" cy="50%" r="20px" fill="grey" />
									</svg>
								)}
							</ParentSize>
						</div>
						<div style={{ width: '100%', height: '100%'}}>
							<ParentSize>
								{(parent) => (
									<svg width={parent.width} height={parent.height} style={{ display: 'block', width: '100%', height: '100%', outline: '1px solid black'}}>
										<rect width="100%" height="100%" fill="grey" />
										<circle cx="50%" cy="50%" r="20px" fill="lightgrey" />
									</svg>
								)}
							</ParentSize>
						</div>
					</div>
				</div>

				{/* Scenario 3: Manual Wrapper (Works) */}
				<div>
					<div
						style={{
							height: "10vh",
							display: "grid",
							gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)",
							gap: "0.5rem",
							outline: '2px solid #2196F3',
							backgroundColor: '#E3F2FD'
						}}
					>
						<div style={{ minWidth: 0, maxWidth: '100%', minHeight: 0, maxHeight: '100%'}}>
							<ParentSize>
								{(parent) => (
									<svg width={parent.width} height={parent.height} style={{ display: 'block', width: '100%', height: '100%', outline: '1px solid black'}}>
										<rect width="100%" height="100%" fill="lightgrey" />
										<circle cx="50%" cy="50%" r="20px" fill="grey" />
									</svg>
								)}
							</ParentSize>
						</div>
						<div style={{ minWidth: 0, maxWidth: '100%', minHeight: 0, maxHeight: '100%'}}>
							<ParentSize>
								{(parent) => (
									<svg width={parent.width} height={parent.height} style={{ display: 'block', width: '100%', height: '100%', outline: '1px solid black'}}>
										<rect width="100%" height="100%" fill="grey" />
										<circle cx="50%" cy="50%" r="20px" fill="lightgrey" />
									</svg>
								)}
							</ParentSize>
						</div>
					</div>
				</div>

				{/* Scenario 4: ResponsiveSVG (Works) */}
				<div>
					<div
						style={{
							height: "10vh",
							display: "grid",
							gridTemplateRows: "1fr 1fr",
							gap: "0.5rem",
							outline: '2px solid #4CAF50',
							backgroundColor: '#E8F5E8'
						}}
					>
						<ResponsiveSVG parentSizeProps={{ debounceTime: 1 }} svgProps={{ style: { outline: '1px solid black' }}}>
							<rect width="100%" height="100%" fill="lightgrey" />
							<circle cx="50%" cy="50%" r="20px" fill="grey" />
						</ResponsiveSVG>
						<ResponsiveSVG parentSizeProps={{ debounceTime: 1 }} svgProps={{ style: { outline: '1px solid black' }}}>
							<rect width="100%" height="100%" fill="grey" />
							<circle cx="50%" cy="50%" r="20px" fill="lightgrey" />
						</ResponsiveSVG>
					</div>
				</div>
			</div>

			{/* Documentation Section */}
			<div style={{ marginTop: "2rem", padding: "2rem", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
				<h3>📚 What ResponsiveSVG Solves</h3>
				
				<h4>🔍 The Problem</h4>
				<p>
					SVG elements in CSS Grid can have sizing issues where they grow to fit available space 
					but don't shrink when the grid area shrinks. This causes overflow and layout problems.
				</p>

				<h4>✅ The Solution</h4>
				<p>
					ResponsiveSVG provides a clean, three-layer architecture that handles:
				</p>
				<ul>
					<li><strong>Outer div</strong> - For ResizeObserver refs and CSS Grid constraints</li>
					<li><strong>ParentSize div</strong> - Measures container dimensions</li>
					<li><strong>SVG element</strong> - Renders content with proper sizing</li>
				</ul>

				<h4>🎯 Key Benefits</h4>
				<ul>
					<li><strong>Clean API</strong> - No need to manually set up wrapper divs</li>
					<li><strong>CSS Grid friendly</strong> - Handles sizing constraints automatically</li>
					<li><strong>ResizeObserver ready</strong> - Easy integration with external measurement</li>
					<li><strong>Context sharing</strong> - All child components get consistent sizing data</li>
					<li><strong>Flexible styling</strong> - Each layer can be styled independently</li>
				</ul>

				<h4>💡 Usage Pattern</h4>
				<pre style={{ backgroundColor: "#fff", padding: "1rem", borderRadius: "4px", overflow: "auto" }}>
{`// Simple usage
<ResponsiveSVG>
  <MySVGComponent />
</ResponsiveSVG>

// With ResizeObserver for Zoom integration
<ResponsiveSVG 
  divProps={{ ref: resizeObserverRef }}
  svgProps={{ ref: zoom.containerRef }}
>
  <MySVGComponent />
</ResponsiveSVG>`}
				</pre>
			</div>
		</div>
	);
} 