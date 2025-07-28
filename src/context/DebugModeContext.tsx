import React, { createContext, useContext, useState, ReactNode } from 'react';

/**
 * Context for global debug mode flag.
 */
export const DebugContext = createContext<{ debugMode: boolean; setDebugMode: (v: boolean) => void }>({
	debugMode: false,
	setDebugMode: () => {
		console.warn('Debug mode setter called but no setter function provided');
	},
});

/**
 * Provider for DebugContext. Wrap your app with this to enable debug mode toggling.
 */
export function DebugProvider({ children, initialDebugMode }: { children: ReactNode, initialDebugMode: boolean }) {
	const [debugMode, setDebugMode] = useState(initialDebugMode);
	return (
		<DebugContext.Provider value={{ debugMode, setDebugMode }}>
			{children}
		</DebugContext.Provider>
	);
}

/**
 * Hook to access the debugMode boolean and setter.
 */
export function useDebugMode() {
	return useContext(DebugContext);
} 