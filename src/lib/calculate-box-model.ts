// Interface for box model properties that affect layout calculations
export interface BoxModel {
	padding: {
		top: number;
		right: number;
		bottom: number;
		left: number;
		total: {
			horizontal: number;
			vertical: number;
		};
	};
	border: {
		top: number;
		right: number;
		bottom: number;
		left: number;
		total: {
			horizontal: number;
			vertical: number;
		};
	};
	margin: {
		top: number;
		right: number;
		bottom: number;
		left: number;
		total: {
			horizontal: number;
			vertical: number;
		};
	};
}

/**
 * calculateBoxModel
 *
 * Utility function to calculate all box model properties (padding, border, margin)
 * for a given DOM element. Returns both individual sides and total horizontal/vertical sums.
 *
 * This is used to ensure that chart layout calculations match the actual rendered CSS,
 * so that the chart area is always correct regardless of how the container is styled.
 *
 * @param element - The DOM element to measure
 * @returns Object containing all box model properties
 */
export const calculateBoxModel = (element: HTMLElement | null): BoxModel => {
	if (!element) {
		// If no element, return all zeros
		return {
			padding: { top: 0, right: 0, bottom: 0, left: 0, total: { horizontal: 0, vertical: 0 } },
			border: { top: 0, right: 0, bottom: 0, left: 0, total: { horizontal: 0, vertical: 0 } },
			margin: { top: 0, right: 0, bottom: 0, left: 0, total: { horizontal: 0, vertical: 0 } }
		};
	}
	
	const computedStyle = getComputedStyle(element);

	// Parse padding values from computed style
	const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
	const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
	const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
	const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;

	// Parse border values from computed style
	const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
	const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
	const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
	const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;

	// Parse margin values from computed style
	const marginTop = parseFloat(computedStyle.marginTop) || 0;
	const marginRight = parseFloat(computedStyle.marginRight) || 0;
	const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
	const marginLeft = parseFloat(computedStyle.marginLeft) || 0;

	return {
		padding: {
			top: paddingTop,
			right: paddingRight,
			bottom: paddingBottom,
			left: paddingLeft,
			total: {
				horizontal: paddingLeft + paddingRight,
				vertical: paddingTop + paddingBottom
			}
		},
		border: {
			top: borderTop,
			right: borderRight,
			bottom: borderBottom,
			left: borderLeft,
			total: {
				horizontal: borderLeft + borderRight,
				vertical: borderTop + borderBottom
			}
		},
		margin: {
			top: marginTop,
			right: marginRight,
			bottom: marginBottom,
			left: marginLeft,
			total: {
				horizontal: marginLeft + marginRight,
				vertical: marginTop + marginBottom
			}
		}
	};
}; 