import { VoronoiPolygon } from '@visx/voronoi';
import React from 'react';

interface DrawVoronoiProps {
	polygons: number[][][];
	stroke?: string;
	strokeWidth?: number;
	strokeOpacity?: number;
	fill?: string;
}


/**
 * The DrawVoronoi component renders the Voronoi diagram of a set of points as SVG polygons.
 * You can use the calculateVoronoi function from the use-voronoi.ts file to get the polygons,
 * and pass them to this component.
 * 
 * @param {Object} props
 * @param {number[][][]} props.polygons - Array of polygons, where each polygon is an array of [x, y] coordinate pairs.
 * @param {string} [props.stroke='#f00'] - Stroke colour for polygon edges.
 * @param {number} [props.strokeWidth=1] - Width of the polygon edges.
 * @param {number} [props.strokeOpacity=0.1] - Opacity of the polygon edges.
 * @param {string} [props.fill='none'] - Fill colour for polygons (usually 'none' for outlines only).
 *
 * Each polygon is defined by a set of points, each point as [x, y].
 */
const DrawVoronoi: React.FC<DrawVoronoiProps> = ({ polygons, stroke = '#f00', strokeWidth = 1, strokeOpacity = 0.1, fill = 'none' }) => (
	<g>
		{polygons.map((polygon, i) => (
			polygon && polygon.length > 0 ? (
				<VoronoiPolygon
					key={`voronoi-${i}`}
					polygon={polygon as [number, number][]}
					fill={fill}
					stroke={stroke}
					strokeWidth={strokeWidth}
					strokeOpacity={strokeOpacity}
				/>
			) : null
		))}
	</g>
);

export default DrawVoronoi; 