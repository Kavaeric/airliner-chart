// [IMPORT] React and core libraries //
import { useMemo } from "react";

/**
 * Pseudo-hashes a string to a number
 */
function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash) + str.charCodeAt(i);
		hash |= 0; // Convert to 32bit integer
	}
	//console.log(`Hashed string ${str} to ${hash}`);
	return Math.abs(hash);
}

function randomString(): string {
	const str = Math.random().toString(36).substring(2, 15);	
	// console.log(`Random string: ${str}`);
	return str;
}

/**
 * useDebugBackground
 *
 * Returns a style object with a persistent random background colour.
 * Colour is pseudo-hashed from the key, so it will be the same for the same key
 * across multiple loads.
 * Useful for debugging layout and component boundaries.
 * 
 * @param key - The key to hash. If not provided, random colours are used,
 * which will change on every load.
 */
export function useDebugBackground(key?: string): React.CSSProperties {
	return useMemo(() => {
		const hash = hashString(key || randomString());
		const r = (hash & 0xFF0000) >> 16;
		const g = (hash & 0x00FF00) >> 8;
		const b = (hash & 0x0000FF);
		const newColour = `${r}, ${g}, ${b}`;
		const bgColour = `rgba(${newColour}, 0.5)`;
		const outlineColour = `rgba(${newColour}, 1)`;

		//console.log(`Setting random background colour: ${bgColour}`);

		return {
			backgroundColor: bgColour,
			outlineColor: outlineColour,
			outlineWidth: "2px",
			outlineStyle: "solid",
		};
	}, []);
} 