// Define the structure of our airliner data with proper TypeScript typing
// This interface ensures type safety and provides IntelliSense in the editor
export interface AirlinerData {
	airliner: string; 			// Aircraft model name (e.g., "A320neo")
	category: string; 			// Aircraft category (e.g., "Narrow-body", "Wide-body")
	manufacturer: string; 		// Aircraft manufacturer (e.g., "Airbus", "Boeing")
	firstDelivery: number; 		// Year of first delivery
	rangeKM: number; 			// Flight range in kilometers
	paxCapacityMin: number; 	// Minimum passenger capacity
	paxCapacityMean: number; 	// Average passenger capacity
	paxCapacityMax: number; 	// Maximum passenger capacity
} 