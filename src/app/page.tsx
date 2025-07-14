"use client";

// Import React hooks for state management and side effects
import { useState, useEffect } from "react";
import styles from "./page.module.css";

// Import our modular components and utilities
import { AirlinerData } from "../types/airliner";
import { loadAirlinerData } from "../lib/airline-data-parser";
import AirlinerChart from "../component/AirlinerChart";

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
	
	// Store the parsed airliner data from CSV
	const [data, setData] = useState<AirlinerData[]>([]);
	
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
				<div className={styles.headerContainer}>
					<h1>Airliner Chart</h1>
					<p>Loading data...</p>
				</div>
				<div className={styles.chartContainer}>
					<p>Loading chart...</p>
				</div>
			</div>
		);
	}

	// Show error state if data loading failed
	if (error) {
		return (
			<div className={styles.mainContainer}>
				<div className={styles.headerContainer}>
					<h1>Airliner Chart</h1>
					<p>Error: {error}</p>
				</div>
				<div className={styles.chartContainer}>
					<p>Error loading chart</p>
				</div>
			</div>
		);
	}

	// ===== MAIN RENDER =====
	
	/**
	 * Render the complete page with header and chart
	 * The AirlinerChart component handles all the complex chart logic
	 */
	return (
		<div className={styles.mainContainer}>
			{/* Header section with data info */}
			<div className={styles.headerContainer}>
				<h1>Airliner Chart</h1>
				<p><a href="https://www.youtube.com/watch?v=WBpLrVCRS84">🎵 Cheers Elephant &mdash; Airliner 🎵</a></p>
			</div>

			{/* Chart component handles all the complex visualization logic */}
			<AirlinerChart data={data} />
		</div>
	);
}
