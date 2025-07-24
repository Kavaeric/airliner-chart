"use client";

// [IMPORT] React //
import { useState, useEffect } from "react";

// [IMPORT] Internal components //
import AirlinerChart from "@/component/airliner/AirlinerChart";
import { ChartDataContext } from "@/component/airliner/AirlinerChart";

// [IMPORT] Context providers/hooks //
import { DebugProvider } from "@/context/DebugContext";

// [IMPORT] Utilities //
import loadAirlinerData from "@/lib/data/airliner-data-processor";

// [IMPORT] Types/interfaces //
import { Airliner } from "@/lib/data/airliner-types";

// [IMPORT] CSS styling //
import styles from "./page.module.css";

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
	const [data, setData] = useState<Airliner[]>([]);
	
	// Track loading status for better user experience
	const [loading, setLoading] = useState(true);
	
	// Track any errors that occur during data loading
	const [error, setError] = useState<string | null>(null);

	// ===== DATA LOADING =====
	
	// Load CSV data when component mounts
	useEffect(() => {
		const loadData = async () => {
			try {
				// Fetch and parse the airliner CSV data
				const airlinerData = await loadAirlinerData("/data/airliners.csv");
				setData(airlinerData);
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

	// ===== RENDER STATES =====
	
	// Show loading state while data is being fetched
	if (loading) {
		return (
			<div className={styles.mainContainer}>
				<div className={styles.aboveCut}>
					<div className={styles.headerContainer}>
						<h1>Airliner Chart</h1>
						<p>Loading data...</p>
					</div>
					<div className={styles.chartContainer}>
						<p>Loading chart...</p>
					</div>
				</div>
			</div>
		);
	}

	// Show error state if data loading failed
	if (error) {
		return (
			<div className={styles.mainContainer}>
				<div className={styles.aboveCut}>
					<div className={styles.headerContainer}>
						<h1>Airliner Chart</h1>
						<p>Error: {error}</p>
					</div>
					<div className={styles.chartContainer}>
						<p>Error loading chart</p>
					</div>
				</div>
			</div>
		);
	}

	// ===== MAIN RENDER =====
	// ChartDataContext.Provider makes airliner data available to all child components via context.
	return (
		<ChartDataContext.Provider value={data}>
			<div className={styles.mainContainer}>
				<div className={styles.aboveCut}>
					{/* Header section with data info */}
					<div className={styles.headerContainer}>
						<h1>Airliner Chart</h1>
						<p><b>Work-in-progress.</b> Visualise the passenger capacity and range of passenger jet airliners.</p>
						<p>Use the janky debuggy viewport controls to zoom in and out, or grab the brushes to move the viewport.</p>
						<p><a href="https://www.youtube.com/watch?v=WBpLrVCRS84">🎵 Cheers Elephant &mdash; Airliner 🎵</a></p>
					</div>

					{/* Chart component handles all the complex visualization logic */}
					<DebugProvider initialDebugMode={false}>
						<AirlinerChart />
					</DebugProvider>
				</div>

				<div className={styles.belowCut}>
					<table className={styles.dataTable}>
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
							{data.map((airliner, i) => (
								<tr key={airliner.airlinerID}>
									<td>{airliner.manufacturer}</td>
									<td>{airliner.nameCommon}</td>
									<td>{airliner.pax3Class || '-'}</td>
									<td>{airliner.pax2Class || '-'}</td>
									<td>{airliner.pax1Class || '-'}</td>
									<td>{airliner.paxLimit || '-'}</td>
									<td>{airliner.paxExit || '-'}</td>
									<td>{airliner.rangeKM?.toLocaleString() || 'N/A'}</td>
									<td>{airliner.status}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</ChartDataContext.Provider>
	);
}
