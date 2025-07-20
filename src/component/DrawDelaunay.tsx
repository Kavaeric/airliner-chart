import { Polygon } from '@visx/delaunay';
import React from 'react';

interface DrawDelaunayProps {
	triangles: number[][][];
	stroke?: string;
	strokeWidth?: number;
	strokeOpacity?: number;
	fill?: string;
}

/**
 * DrawDelaunay renders the Delaunay triangulation of a set of points as SVG polygons.
 * You can use the calculateDelaunay function from the use-voronoi.ts file to get the triangles,
 * and pass them to this component.
 * 
 * @param {Object} props
 * @param {number[][][]} props.triangles - Array of triangles, where each triangle is an array of three [x, y] coordinate pairs: [ [x1, y1], [x2, y2], [x3, y3] ].
 * @param {string} [props.stroke='#00f'] - Stroke colour for triangle edges.
 * @param {number} [props.strokeWidth=0.5] - Width of the triangle edges.
 * @param {number} [props.strokeOpacity=0.2] - Opacity of the triangle edges.
 * @param {string} [props.fill='none'] - Fill colour for triangles (usually 'none' for outlines only).
 *
 * Each triangle is defined by three points, each point as [x, y].
 */
const DrawDelaunay: React.FC<DrawDelaunayProps> = ({
	triangles,
	stroke = '#00f',
	strokeWidth = 0.5,
	strokeOpacity = 0.2,
	fill = 'none'
}) => (
	<g>
		{triangles.map((triangle, i) => (
			triangle && triangle.length > 0 ? (
				<Polygon
					key={`delaunay-${i}`}
					polygon={triangle as [number, number][]}
					fill={fill}
					stroke={stroke}
					strokeWidth={strokeWidth}
					strokeOpacity={strokeOpacity}
				/>
			) : null
		))}
	</g>
);

export default DrawDelaunay; 