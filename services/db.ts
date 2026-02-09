import { createStore, get, set, del, keys, clear } from 'idb-keyval';
import { GamePayload } from '../types';

/**
 * DATABASE CONFIGURATION
 * 
 * Strategy:
 * 1. User State (Profile, Progress, Settings) -> Managed by Zustand (userStore) & persisted to localStorage/IndexedDB automatically.
 * 2. Content Cache (Game Payloads, Heavy Assets) -> Managed here. Ephemeral data that can be re-generated.
 */

// Game Content Cache (Heavy assets, temporary game payloads)
const cacheDB = createStore('tosba-cache-db', 'game-content-store');

/**
 * DB SERVICE
 * Specialized storage for heavy/binary data unrelated to UI state re-renders.
 */
export const db = {
    // --- GAME CONTENT CACHE (PREFETCHING SYSTEM) ---
    cache: {
        // Save generated game content (including base64 images)
        setGame: (moduleId: string, payload: GamePayload) => set(moduleId, payload, cacheDB),

        // Retrieve cached game
        getGame: (moduleId: string) => get<GamePayload>(moduleId, cacheDB),

        // Remove specific game (after played)
        removeGame: (moduleId: string) => del(moduleId, cacheDB),

        // Check if game exists in cache
        hasGame: async (moduleId: string) => {
            const allKeys = await keys(cacheDB);
            return allKeys.includes(moduleId);
        },

        // Clear entire cache (useful for creating fresh space)
        // Clear entire cache (useful for creating fresh space)
        clear: () => clear(cacheDB)
    },

    // --- FAVORITES (CONTEXT RETENTION) ---
    favorites: {
        saveItem: (itemName: string, imageUrl: string) => set(`fav_${itemName.toLowerCase()}`, imageUrl, cacheDB),
        getItem: (itemName: string) => get<string>(`fav_${itemName.toLowerCase()}`, cacheDB),
        removeItem: (itemName: string) => del(`fav_${itemName.toLowerCase()}`, cacheDB)
    }
};
