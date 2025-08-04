"use client";

// [IMPORT] React //
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

/**
 * AirlinerSelectionState
 * 
 * Defines the state and actions for managing airliner selection and hover interactions.
 * 
 * @property {string | null} selectedAirlinerID - The currently selected airliner ID, or null if none selected
 * @property {string | null} hoveredAirlinerID - The currently hovered airliner ID, or null if none hovered
 * @property {number | null} selectedClusterIndex - The currently selected cluster index, or null if none selected
 * @property {number | null} hoveredClusterIndex - The currently hovered cluster index, or null if none hovered
 * @property {function} setSelectedAirliner - Function to set the selected airliner ID
 * @property {function} setHoveredAirliner - Function to set the hovered airliner ID
 * @property {function} setSelectedCluster - Function to set the selected cluster index
 * @property {function} setHoveredCluster - Function to set the hovered cluster index
 * @property {function} clearSelection - Function to clear both selection and hover states
 */
interface AirlinerSelectionState {
	selectedAirlinerID: string | null;
	hoveredAirlinerID: string | null;
	selectedClusterIndex: number | null;
	hoveredClusterIndex: number | null;
	setSelectedAirliner: (id: string | null) => void;
	setHoveredAirliner: (id: string | null) => void;
	setSelectedCluster: (index: number | null) => void;
	setHoveredCluster: (index: number | null) => void;
	clearSelection: () => void;
}

/**
 * AirlinerSelectionContext
 * 
 * React context for managing airliner selection state across the chart components.
 */
const AirlinerSelectionContext = createContext<AirlinerSelectionState | undefined>(undefined);

/**
 * AirlinerSelectionProvider Props
 * 
 * @property {ReactNode} children - Child components that will have access to the selection context
 */
interface AirlinerSelectionProviderProps {
	children: ReactNode;
}

/**
 * AirlinerSelectionProvider
 * 
 * Context provider component that manages airliner selection and hover states.
 * Provides state management functions to child components.
 * 
 * @param {AirlinerSelectionProviderProps} props - Provider props containing children
 * @returns {JSX.Element} Context provider wrapping children
 */
export function AirlinerSelectionProvider({ children }: AirlinerSelectionProviderProps) {
	// === State Management ===
	// Track currently selected and hovered airliner IDs
	const [selectedAirlinerID, setSelectedAirlinerID] = useState<string | null>(null);
	const [hoveredAirlinerID, setHoveredAirlinerID] = useState<string | null>(null);
	
	// Track currently selected and hovered cluster indices
	const [selectedClusterIndex, setSelectedClusterIndex] = useState<number | null>(null);
	const [hoveredClusterIndex, setHoveredClusterIndex] = useState<number | null>(null);

	// === Action Handlers ===
	// Set the selected airliner ID
	const setSelectedAirliner = useCallback((id: string | null) => {
		clearSelection();
		setSelectedAirlinerID(id);
	}, []);

	// Set the hovered airliner ID
	const setHoveredAirliner = useCallback((id: string | null) => {
		setHoveredAirlinerID(id);
	}, []);

	// Set the selected cluster index
	const setSelectedCluster = useCallback((index: number | null) => {
		clearSelection();
		setSelectedClusterIndex(index);
	}, []);

	// Set the hovered cluster index
	const setHoveredCluster = useCallback((index: number | null) => {
		setHoveredClusterIndex(index);
	}, []);

	// Clear both selection and hover states
	const clearSelection = useCallback(() => {
		setSelectedAirlinerID(null);
		setHoveredAirlinerID(null);
		setSelectedClusterIndex(null);
		setHoveredClusterIndex(null);
	}, []);

	// === Context Value ===
	// Create the context value object with state and actions
	const contextValue: AirlinerSelectionState = {
		selectedAirlinerID,
		hoveredAirlinerID,
		selectedClusterIndex,
		hoveredClusterIndex,
		setSelectedAirliner,
		setHoveredAirliner,
		setSelectedCluster,
		setHoveredCluster,
		clearSelection
	};

	return (
		<AirlinerSelectionContext.Provider value={contextValue}>
			{children}
		</AirlinerSelectionContext.Provider>
	);
}

/**
 * useAirlinerSelection
 * 
 * Custom hook to access the airliner selection context.
 * Provides type-safe access to selection state and actions.
 * 
 * @returns {AirlinerSelectionState} The selection context state and actions
 * @throws {Error} If used outside of AirlinerSelectionProvider
 */
export function useAirlinerSelection(): AirlinerSelectionState {
	const context = useContext(AirlinerSelectionContext);
	
	if (context === undefined) {
		throw new Error("useAirlinerSelection must be used within an AirlinerSelectionProvider");
	}
	
	return context;
} 