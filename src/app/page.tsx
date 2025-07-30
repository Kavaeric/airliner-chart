"use client";

// [IMPORT] React //
import { useState, useEffect } from "react";

// [IMPORT] Internal components //
import AirlinerChart from "@/component/airliner/AirlinerChart";

// [IMPORT] Context providers/hooks //
import { DebugProvider } from "@/context/DebugModeContext";

// [IMPORT] Utilities //
import { loadAirlinerData } from "@/lib/data/airliner-data-processor";

// [IMPORT] Types/interfaces //
import { AirlinerData } from "@/lib/data/airliner-types";

// [IMPORT] CSS styling //
import "./page.css";

/**
 * Main Home Component - Airliner Data Visualization
 * 
 * This component handles:
 * - Data loading from CSV
 * - Loading and error states
 * - Basic page layout
 * 
 * The actual chart rendering is delegated to the AirlinerChart component.
 */
export default function Home() {
	// ===== STATE MANAGEMENT =====
	
	// Store the processed airliner data from CSV
	// We can't use useMemo here since it's async
	const [data, setData] = useState<AirlinerData[]>([]);
	
	// Track loading status for better user experience
	const [loading, setLoading] = useState(true);
	
	// Track any errors that occur during data loading
	const [error, setError] = useState<string | null>(null);

	// State for theme selection
	const [theme, setTheme] = useState<"default" | "light" | "dark" | "system">("default");

	// ===== DATA LOADING =====
	
	// Load CSV data when component mounts
	useEffect(() => {
		const loadData = async () => {
			try {
				// Fetch and parse the airliner CSV data
				const airlinerData = await loadAirlinerData("/data/airliners.csv");

				// Map the raw data to the AirlinerData type
				setData(airlinerData.map(airliner => ({
					airlinerID: `${airliner.idNumber}-${airliner.nameICAO}`,
					airlinerData: airliner,
				})));
				
				// Set loading to false
				setLoading(false);

			} catch (error) {
				// Handle any errors from data loading
				console.error("Error loading data:", error);
				setError("Failed to load airliner data");
				setLoading(false);
			}
		};
		
		// Execute the data loading
		loadData();
	}, []); // Empty dependency array means this effect runs only once on mount


	// ===== MAIN RENDER =====
	// ChartDataContext.Provider makes airliner data available to all child components via context.
	return (
		<div className="mainContainer">
			<div className="aboveCut">
				<div className="frame-flex-horizontal">
					<div className="frame-content frame-flex-vertical headerTitle">
						<h1 className="text-h1">Airliner Chart</h1>
					</div>
					<hr className="frame-minor" />
					<div className="frame-content headerDescription">
						{error ? (
							<p>Error: {error}</p>
						) : (
							<>
								<p><b>Work in progress. </b>
								By <a href="https://www.shojiushiyama.net/" className="link-augmented">Shoji Ushiyama</a> / <a href="https://bsky.app/profile/kavaeric.net" className="link-augmented">Kavaeric</a>.</p>
								<p>Mobile support coming soon?</p>
							</>
						)}
					</div>
				</div>
				<hr className="frame-major" />

				{/* Chart component handles all the complex visualization logic */}
				<DebugProvider initialDebugMode={false}>
					{loading ? (
						<p>Loading chart...</p>
					) : (
						<AirlinerChart data={data} />
					)}
				</DebugProvider>
			</div>

			<div className="belowCut">

				<table className="dataTable">
					<thead>
						<tr>
							<th>Manufacturer</th>
							<th>Name</th>
							<th>3-Class capacity</th>
							<th>2-Class capacity</th>
							<th>1-Class capacity</th>
							<th>Max capacity</th>
							<th>Exit capacity</th>
							<th>Range (km)</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{data.map((airliner) => (
							<tr key={airliner.airlinerID}>
								<td>{airliner.airlinerData.manufacturer}</td>
								<td>{airliner.airlinerData.nameCommon}</td>
								<td>{airliner.airlinerData.pax3Class || '-'}</td>
								<td>{airliner.airlinerData.pax2Class || '-'}</td>
								<td>{airliner.airlinerData.pax1Class || '-'}</td>
								<td>{airliner.airlinerData.paxLimit || '-'}</td>
								<td>{airliner.airlinerData.paxExit || '-'}</td>
								<td>{airliner.airlinerData.rangeKM?.toLocaleString() || 'N/A'}</td>
								<td>{airliner.airlinerData.status}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="frame-content">
				<p><a href="/branding-demo.html" className="link-augmented">Secret link to DS demo</a></p>
			</div>
		</div>
	);
}
