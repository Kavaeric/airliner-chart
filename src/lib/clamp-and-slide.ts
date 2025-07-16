/**
 * clampAndSlide
 *
 * Utility function to clamp a [min, max] tuple to given [lower, upper] limits.
 * If the range exceeds a limit, the overflow is added to the other extent,
 * so the range 'slides' along the limit rather than compressing.
 *
 * If both extents are at the limits, the range is returned unchanged.
 *
 * @param range - The [min, max] tuple to clamp
 * @param limits - The [lower, upper] tuple of limits (null means no limit)
 * @returns The clamped and slid [min, max] tuple
 */
export function clampAndSlide(
	range: [number, number],
	limits: [number | null, number | null]
): [number, number] {
	// If no limits, return as is
	if (limits[0] === null && limits[1] === null) return range;
	let [min, max] = range;
	const [lower, upper] = limits;

	// Early return: if both extents are already at the limits, do nothing
	if (
		(lower !== null && min === lower) &&
		(upper !== null && max === upper)
	) {
		return [min, max];
	}

	// If max exceeds upper limit, slide both min and max down so max aligns with upper
	if (upper !== null && max > upper) {
		const diff = upper - max;
		min += diff;
		max += diff;
	}
	// If min is below lower limit, slide both min and max up so min aligns with lower
	if (lower !== null && min < lower) {
		const diff = lower - min;
		min += diff;
		max += diff;
	}

	// Final clamp: ensure min and max do not exceed the limits after sliding
	if (lower !== null && min < lower) min = lower;
	if (upper !== null && max > upper) max = upper;

	return [min, max];
} 