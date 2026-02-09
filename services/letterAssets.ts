/**
 * Static Letter Assets Service
 * 
 * Önceden oluşturulmuş harf ve rakam görsellerini yönetir.
 * API çağrısı yapmadan anında görsel döndürür.
 */

// Available letters and numbers
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = '0123456789'.split('');
const VARIATIONS = 3;

// Base path for assets
const ASSET_BASE_PATH = '/assets/letters';

// Safe random variation helper using crypto
function getRandomVariation(max: number): number {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    // modulo can introduce bias but for small range [1-3] it's negligible for this use case
    return (array[0] % max) + 1;
}


/**
 * Get a random variation of a letter image
 */
export function getLetterImage(letter: string): string {
    const upperLetter = letter.toUpperCase();

    // Validate it's a valid letter or number
    if (!LETTERS.includes(upperLetter) && !NUMBERS.includes(upperLetter)) {
        console.warn(`Invalid letter/number: ${letter}, using fallback`);
        return getFallbackImage(letter);
    }

    // Random variation (1, 2, or 3)
    const variation = getRandomVariation(VARIATIONS);

    return `${ASSET_BASE_PATH}/${upperLetter}_${variation}.png`;
}

/**
 * Get a specific variation of a letter image
 */
export function getLetterImageVariation(letter: string, variation: number): string {
    const upperLetter = letter.toUpperCase();
    const safeVariation = Math.max(1, Math.min(VARIATIONS, variation));

    return `${ASSET_BASE_PATH}/${upperLetter}_${safeVariation}.png`;
}

/**
 * Get all variations of a letter
 */
export function getAllLetterVariations(letter: string): string[] {
    const upperLetter = letter.toUpperCase();
    return Array.from({ length: VARIATIONS }, (_, i) =>
        `${ASSET_BASE_PATH}/${upperLetter}_${i + 1}.png`
    );
}

/**
 * Generate fallback SVG for missing letters
 */
export function getFallbackImage(char: string): string {
    // Create inline SVG as data URL
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
            <circle cx="50" cy="50" r="45" fill="#E0E7FF" stroke="#6366F1" stroke-width="3"/>
            <text x="50" y="65" font-family="Arial Black, sans-serif" font-size="50" fill="#4F46E5" text-anchor="middle">${char.toUpperCase()}</text>
        </svg>
    `.trim();

    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Check if a letter asset exists (async check)
 */
export async function checkLetterAssetExists(letter: string, variation: number = 1): Promise<boolean> {
    const path = getLetterImageVariation(letter, variation);

    try {
        const response = await fetch(path, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get image for a game item - smart selection
 * Falls back to SVG if asset doesn't exist
 */
export function getGameItemImage(itemName: string): string {
    // Check if it's a single letter (Alphanumeric)
    if (itemName.length === 1 && /^[A-Z0-9]$/i.test(itemName)) {
        return getLetterImage(itemName);
    }

    // Check for "Letter X" format
    const letterMatch = itemName.match(/Letter\s+([A-Z])/i);
    if (letterMatch) {
        return getLetterImage(letterMatch[1]);
    }

    // Check for "Number X" format
    const numberMatch = itemName.match(/Number\s+(\d)/i);
    if (numberMatch) {
        return getLetterImage(numberMatch[1]);
    }

    // Default: use first character as fallback
    return getFallbackImage(itemName.charAt(0));
}

// Export list of available characters for reference
export const AVAILABLE_LETTERS = LETTERS;
export const AVAILABLE_NUMBERS = NUMBERS;
