// [IMPORT] React and core libraries //
import { useMemo } from "react";

// [IMPORT] Context providers/hooks //
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";
import { useChartData } from "./AirlinerChart";

/**
 * AirlinerChartInfoBar Component
 * 
 * Displays either the selected airliner name or the default info text.
 * Uses the airliner selection context to determine what to show.
 * 
 * @returns {JSX.Element} The info bar component
 */
export default function AirlinerChartInfoBar() {
	const { selectedAirlinerID } = useAirlinerSelection();
	const chartData = useChartData();
	
	// Get selected airliner name if one is selected
	const selectedAirlinerName = useMemo(() => {
		if (!selectedAirlinerID) return null;
		
		const selectedAirliner = chartData.find(airliner => airliner.airlinerID === selectedAirlinerID);
		if (!selectedAirliner) return null;
		
		const { manufacturer, nameCommon } = selectedAirliner.airlinerData;
		
		// Construct name as manufacturer + common name
		if (nameCommon) {
			return `${manufacturer} ${nameCommon}`;
		}
		
		// Fallback to just manufacturer if no common name
		return manufacturer;
	}, [selectedAirlinerID, chartData]);
	
	// Display selected airliner name or default info
	if (selectedAirlinerName) {
		return (
			<p className="text-body-minor">
				{selectedAirlinerName}
			</p>
		);
	}
	
	// Default info text
	return (
		<p className="text-body-diminished">
			Airliner Chart by <a href="https://www.shojiushiyama.net/">Shoji Ushiyama</a> / <a href="https://www.kavaeric.com">Kavaeric</a>.
		</p>
	);
} 