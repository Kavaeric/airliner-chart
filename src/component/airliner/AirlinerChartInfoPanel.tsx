// [IMPORT] React and core libraries //
import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./AirlinerChartInfoPanel.css";

// [IMPORT] Context providers/hooks //
import { useAirlinerSelection } from "@/context/AirlinerSelectionContext";
import { useChartData } from "./AirlinerChart";
import { useDebugMode } from "@/context/DebugModeContext";

// [IMPORT] Utilities //
import { loadAirlinerDescription } from "@/lib/utils/load-airliner-description";

/**
 * AirlinerChartInfoPanel Component
 * 
 * Expandable/collapsible info panel for displaying detailed information about selected airliners.
 * Always rendered but positioned off-screen when not visible.
 * 
 * @param {boolean} isVisible - Whether the panel should be visible
 * @returns {JSX.Element | null} The info panel component or null if no airliner is selected
 */
export default function AirlinerChartInfoPanel({ isVisible }: { isVisible: boolean }) {
	const { selectedAirlinerID } = useAirlinerSelection();
	const chartData = useChartData();
	const { debugMode, setDebugMode } = useDebugMode();
	
	// State for markdown description
	const [description, setDescription] = useState<string | null>(null);
	const [descriptionLoading, setDescriptionLoading] = useState(false);

	// Get selected airliner data
	const selectedAirliner = selectedAirlinerID ? chartData.find(airliner => airliner.airlinerID === selectedAirlinerID) : null;

	// Load description when selected airliner changes
	useEffect(() => {
		const loadDescription = async () => {
			if (!selectedAirliner?.airlinerID) {
				setDescription(null);
				return;
			}
			
			setDescriptionLoading(true);
			try {
				const markdownContent = await loadAirlinerDescription(selectedAirliner.airlinerID);
				setDescription(markdownContent);
			} catch (error) {
				console.warn(`[AirlinerChartInfoPanel] Failed to load description for ${selectedAirliner.airlinerID}:`, error);
				setDescription(null);
			} finally {
				setDescriptionLoading(false);
			}
		};
		
		loadDescription();
	}, [selectedAirliner?.airlinerID]);

	const getStatusText = (status: string | undefined): string => {
		if (!status) return "-";
		
		switch (status) {
			case "active":
				return "Active";
			case "discontinued":
				return "Discontinued";
			case "development":
				return "In development";
			case "retired":
				return "Retired";
			default:
				return status.charAt(0).toUpperCase() + status.slice(1);
		}
	};

	/**
	 * Returns a human-readable body type string for the airliner.
	 * Expands to "Widebody" or "Narrowbody" for known values, otherwise returns a capitalised fallback.
	 * @param {string | undefined} bodyType
	 * @returns {string}
	 */
	const getBodyTypeText = (bodyType: string | undefined): string => {
		if (!bodyType) return "-";
		switch (bodyType.toLowerCase()) {
			case "wide":
				return "Widebody";
			case "narrow":
				return "Narrowbody";
			default:
				return bodyType.charAt(0).toUpperCase() + bodyType.slice(1);
		}
	};
	
	const statusText = getStatusText(selectedAirliner?.airlinerData.status);
	
	return (
		<div className={`airlinerInfoPanel frame-flex-vertical frame-major ${isVisible ? 'airlinerInfoPanel--visible' : 'airlinerInfoPanel--hidden'}`}>
			{selectedAirliner ? (
				<>
					<div className="frame-flex-vertical frame-content">
						<span className="text-label-augmented">{selectedAirliner?.airlinerData.manufacturer ?? "-"}</span>
						<h2 className="text-h3 airlinerName">{selectedAirliner?.airlinerData.nameCommon ?? "-"}</h2>
					</div>

					<hr className="frame-minor" />
					
					<div className="frame-content airlinerStats">
						<span className="text-label-diminished airlinerStatLabel">ICAO code</span>
						<span className="text-body-minor airlinerStatValue">{selectedAirliner?.airlinerData.nameICAO ?? "-" }</span>
						
						<span className="text-label-diminished airlinerStatLabel">Status</span>
						<span className="text-body-minor airlinerStatValue" style={{ textTransform: 'capitalize' }}>{statusText}</span>
						
						<span className="text-label-diminished airlinerStatLabel">Introduced</span>
						<span className="text-body-minor airlinerStatValue">{selectedAirliner?.airlinerData.firstDelivery ?? "-" }</span>
						
						<span className="text-label-diminished airlinerStatLabel">Discontinued</span>
						<span className="text-body-minor airlinerStatValue">{selectedAirliner?.airlinerData.manufactureEnd ?? "-" }</span>
					</div>

					<hr className="frame-diminished" />

					<div className="frame-content airlinerStats">
						<span className="text-label-diminished airlinerStatLabel">Range</span>
						<span className="text-body-minor airlinerStatValue">{selectedAirliner?.airlinerData.rangeKM ?? "-" } km</span>

						<span className="text-label-diminished airlinerStatLabel">Body</span>
						<span className="text-body-minor airlinerStatValue">{getBodyTypeText(selectedAirliner?.airlinerData.bodyType) ?? "-" }</span>
					</div>

					<hr className="frame-minor" />

					<div className="frame-content">
						<span className="text-label-major">Passenger Capacity</span>
					</div>

					<hr className="frame-diminished" />

					<div className="frame-content airlinerStats">
						<span className="text-label-diminished airlinerStatLabel">3-class</span>
						<span className="text-body-minor airlinerStatValue">{selectedAirliner?.airlinerData.pax3Class ?? "-" }</span>
						<span className="text-label-diminished airlinerStatLabel">2-class</span>
						<span className="text-body-minor airlinerStatValue">{selectedAirliner?.airlinerData.pax2Class ?? "-" }</span>
						<span className="text-label-diminished airlinerStatLabel">1-class</span>
						<span className="text-body-minor airlinerStatValue">{selectedAirliner?.airlinerData.pax1Class ?? "-" }</span>
						<span className="text-label-diminished airlinerStatLabel">Space limit</span>
						<span className="text-body-minor airlinerStatValue">{selectedAirliner?.airlinerData.paxLimit ?? "-" }</span>
						<span className="text-label-diminished airlinerStatLabel">Exit limit</span>
						<span className="text-body-minor airlinerStatValue">{selectedAirliner?.airlinerData.paxExit ?? "-" }</span>
					</div>

					<hr className="frame-minor" />

					<div className="frame-content airlinerDescription">
						{descriptionLoading ? (
							<p className="text-body-diminished">Loading description...</p>
						) : description ? (
							<ReactMarkdown 
								remarkPlugins={[remarkGfm]}
								components={{
									h1: ({node, ...props}) => <h1 {...props} className="text-h3" />,
									h2: ({node, ...props}) => <h2 {...props} className="text-h4" />,
									h3: ({node, ...props}) => <h3 {...props} className="text-h5" />,
									p: ({node, ...props}) => <p {...props} className="article-body" />,
									ul: ({node, ...props}) => <ul {...props} className="article-body" />,
									ol: ({node, ...props}) => <ol {...props} className="article-body" />,
									li: ({node, ...props}) => <li {...props} className="article-body" />,
									strong: ({node, ...props}) => <strong {...props} className="article-body" />,
									em: ({node, ...props}) => <em {...props} className="article-body" />,
									code: ({node, ...props}) => <code {...props} className="article-body" style={{ backgroundColor: 'var(--surface-minor)', padding: '0.125em 0.25em', borderRadius: '0.25em' }} />,
									blockquote: ({node, ...props}) => <blockquote {...props} />
								}}
							>
								{description}
							</ReactMarkdown>
						) : (
							<>
								<p className="article-body">
									No description is available for this airliner.
								</p>
								<blockquote>
									<p>Not much is known about this thing. Board it at your own risk.</p>
								</blockquote>
							</>
						)}
					</div>

				</>
			) : (
				<div className="frame-content airlinerDescription">
					<p className="text-minor">Select an airliner to view its details.</p>
				</div>
			)}

			<hr className="frame-major" />

			<div className="frame-content">
				<span className="text-label-major">Options</span>
			</div>

			<hr className="frame-diminished" />
			<label className="input-switch">
				<input
					type="checkbox"
					checked={debugMode}
					onChange={() => setDebugMode(!debugMode)}
				/>
				Debug mode
			</label>

			{debugMode && (
				<>
					<hr className="frame-minor" />
					<div className="frame-content airlinerStats">
						<span className="text-label-diminished airlinerStatLabel">airlinerID</span>
						<span className="text-body-minor airlinerStatValue">{selectedAirliner?.airlinerID ?? "-"}</span>
					</div>
				</>
			)}
		</div>
	);
} 