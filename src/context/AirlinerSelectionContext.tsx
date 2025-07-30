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
 * @property {function} setSelectedAirliner - Function to set the selected airliner ID
 * @property {function} setHoveredAirliner - Function to set the hovered airliner ID
 * @property {function} clearSelection - Function to clear both selection and hover states
 */
interface AirlinerSelectionState {
	selectedAirlinerID: string | null;
	hoveredAirlinerID: string | null;
	setSelectedAirliner: (id: string | null) => void;
	setHoveredAirliner: (id: string | null) => void;
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

	// === Action Handlers ===
	// Set the selected airliner ID
	const setSelectedAirliner = useCallback((id: string | null) => {
		clearSelection();
		setTimeout(() => {
			setSelectedAirlinerID(id);
		}, 1);
	}, []);

	// Set the hovered airliner ID
	const setHoveredAirliner = useCallback((id: string | null) => {
		setHoveredAirlinerID(id);
	}, []);

	// Clear both selection and hover states
	const clearSelection = useCallback(() => {
		setSelectedAirlinerID(null);
		setHoveredAirlinerID(null);
	}, []);

	// === Context Value ===
	// Create the context value object with state and actions
	const contextValue: AirlinerSelectionState = {
		selectedAirlinerID,
		hoveredAirlinerID,
		setSelectedAirliner,
		setHoveredAirliner,
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