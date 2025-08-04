/**
 * Loads markdown description for an airliner by its full airlinerID.
 * 
 * @param airlinerID - The full airliner ID (format: "idNumber-nameICAO", e.g., "16-A359")
 * @returns Promise<string | null> - The markdown content or null if not found
 */
export async function loadAirlinerDescription(airlinerID: string): Promise<string | null> {
	if (!airlinerID) return null;
	
	try {
		const response = await fetch(`/data/descriptions/${airlinerID}.md`);
		
		if (!response.ok) {
			// File doesn't exist or other error
			return null;
		}
		
		const markdownContent = await response.text();
		return markdownContent;
		
	} catch (error) {
		console.warn(`[loadAirlinerDescription] Failed to load description for ${airlinerID}:`, error);
		return null;
	}
}

/**
 * Preloads descriptions for multiple airliners.
 * Useful for caching descriptions to avoid repeated fetch requests.
 * 
 * @param airlinerIDs - Array of full airliner IDs to preload
 * @returns Promise<Map<string, string>> - Map of airliner IDs to markdown content
 */
export async function preloadAirlinerDescriptions(airlinerIDs: string[]): Promise<Map<string, string>> {
	const descriptions = new Map<string, string>();
	
	const loadPromises = airlinerIDs.map(async (airlinerID) => {
		const description = await loadAirlinerDescription(airlinerID);
		if (description) {
			descriptions.set(airlinerID, description);
		}
	});
	
	await Promise.all(loadPromises);
	return descriptions;
} 