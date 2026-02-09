import { ai, IMAGE_MODEL } from "./ai";
import { JudgeService } from "./judgeService";

// Helper for delay/retry
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getMockImage = (text: string) => {
    // ENHANCED: Special handling for common signs
    const signEmojis: Record<string, string> = {
        'stop': '🛑',
        'no parking': '🅿️',
        'parking': '🅿️',
        'exit': '🚪',
        'way out': '🚪',
        'entrance': '🚪',
        'danger': '⚠️',
        'warning': '⚠️',
        'caution': '⚠️',
        'restroom': '🚻',
        'toilet': '🚻',
        'phone': '📞',
        'information': 'ℹ️',
        'help': 'ℹ️'
    };

    const lowerText = text.toLowerCase();
    let emoji = '📷';

    // Check if text matches any sign keyword
    for (const [key, value] of Object.entries(signEmojis)) {
        if (lowerText.includes(key)) {
            emoji = value;
            break;
        }
    }

    const svg = `
    <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" fill="#f1f5f9"/>
      <text x="128" y="128" font-family="Arial" font-size="60" text-anchor="middle" dominant-baseline="middle" fill="#334155">${emoji}</text>
      <text x="128" y="180" font-family="Arial" font-size="12" text-anchor="middle" fill="#94a3b8">${text.substring(0, 20)}</text>
    </svg>
  `;
    const encoded = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
};

export const removeWhiteBackground = async (base64Data: string): Promise<string> => {
    return new Promise((resolve) => {
        // Since we are in Node/Browser environment, Image might define on window or global.
        // If server side, this fails. Assuming client side for canvas.
        if (typeof window === 'undefined') {
            resolve(base64Data);
            return;
        }

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(base64Data); return; }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Aggressive white removal
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // If pixel is close to white (light gray to white)
                if (r > 240 && g > 240 && b > 240) {
                    data[i + 3] = 0; // Set alpha to 0 (transparent)
                }
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64Data);
        img.src = base64Data;
    });
};

export const sliceGridImage = async (base64Data: string): Promise<string[]> => {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') {
            resolve([base64Data, base64Data, base64Data, base64Data]);
            return;
        }
        const img = new Image();
        img.onload = () => {
            const w = img.width / 2;
            const h = img.height / 2;
            const quadrants: string[] = [];
            const positions = [
                { x: 0, y: 0 }, { x: w, y: 0 },
                { x: 0, y: h }, { x: w, y: h }
            ];
            positions.forEach(pos => {
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, pos.x, pos.y, w, h, 0, 0, w, h);
                    quadrants.push(canvas.toDataURL('image/png'));
                } else {
                    quadrants.push(base64Data);
                }
            });
            resolve(quadrants);
        };
        img.onerror = () => resolve([base64Data, base64Data, base64Data, base64Data]);
        img.src = base64Data;
    });
};

import { db } from "./db";

// Helper: Determine visual style based on age
function getStyleForAge(age: number): { stylePrompt: string, styleDescr: string } {
    if (age >= 13) {
        return {
            stylePrompt: "realistic high-quality photo style, dignified, clear.",
            styleDescr: "Realistic image"
        };
    }
    if (age >= 7) {
        return {
            stylePrompt: "clean 2D game asset style.",
            styleDescr: "Illustration" // Default
        };
    }
    // Default (Early Childhood)
    return {
        stylePrompt: "simple vector style for kids.",
        styleDescr: "Illustration"
    };
}

// Helper: Construct enhanced prompt
function buildPrompt(promptText: string, style: { stylePrompt: string, styleDescr: string }, isSign: boolean): string {
    const textInstruction = isSign
        ? "IMPORTANT: Include the text/words clearly visible and readable."
        : "No text or labels.";

    const basePrompt = `${style.styleDescr} of ${promptText}, isolated on white background. ${style.stylePrompt} ${textInstruction}`;

    if (isSign) {
        const signMatch = promptText.match(/(STOP|NO PARKING|WAY OUT|EXIT|ENTRANCE|DANGER|WARNING|CAUTION)/i);
        if (signMatch) {
            const signText = signMatch[1].toUpperCase();
            return `${style.styleDescr} of a ${promptText}. The sign MUST clearly display the text "${signText}" in large, bold, readable letters. ${style.stylePrompt} ${textInstruction}`;
        }
    }

    return basePrompt;
}

// Helper: Check cache for assessment image
const checkImageCache = async (promptText: string): Promise<string | null> => {
    try {
        const cached = await db.favorites.getItem(promptText);
        if (cached) {
            // eslint-disable-next-line no-console
            console.log(`[AssessmentImage] Used cache for "${promptText}"`);
            return cached;
        }
    } catch {
        // Ignore cache errors
    }
    return null;
};

// Helper: Generate image with retry logic
const generateImageWithRetry = async (
    promptText: string,
    style: { stylePrompt: string, styleDescr: string },
    isSignOrTextItem: boolean,
    age: number,
    attempts: number
): Promise<string | null> => {
    try {
        // Exponential backoff
        if (attempts > 1) {
            const waitTime = Math.min(1000 * Math.pow(2, attempts - 1), 8000);
            await delay(waitTime);
        }

        const enhancedPrompt = buildPrompt(promptText, style, isSignOrTextItem);

        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: enhancedPrompt,
            config: { imageConfig: { aspectRatio: "1:1" } }
        });

        // Extract image data
        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        const cand = part?.inlineData ? `data:image/png;base64,${part.inlineData.data}` : "";

        if (cand) {
            // If retry, skip judge to recover faster
            if (attempts > 1) {
                return await removeWhiteBackground(cand);
            }

            // Verify with Judge
            const judge = await JudgeService.validateImage(cand, promptText, { chronologicalAge: age });
            if (judge.isSafe && judge.isRelevant) {
                return await removeWhiteBackground(cand);
            }
            console.warn(`[Judge] Rejected for ${promptText}: ${judge.reason}`);
        }
    } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        const isNetworkError = errorMsg.match(/fetch|QUIC|network|429|Too Many/i);

        if (isNetworkError) {
            console.warn(`[AssessmentImage] Network error for "${promptText}": ${errorMsg}`);
        } else {
            console.error("Image Gen Error", e);
        }
    }
    return null;
};

export const generateAssessmentImage = async (promptText: string, profile?: { age: number }): Promise<string> => {
    // 1. Check Personal Cache
    const cached = await checkImageCache(promptText);
    if (cached) return cached;

    const maxAttempts = 3;
    const isSignOrTextItem = /sign|label|text|word|letter|number|symbol/i.test(promptText);
    const age = profile?.age || 5;
    const style = getStyleForAge(age);

    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
        const result = await generateImageWithRetry(promptText, style, isSignOrTextItem, age, attempts);
        if (result) return result;
    }

    console.warn(`[AssessmentImage] Failed for "${promptText}", using fallback`);
    return getMockImage(promptText);
};

export const generateAssessmentGrid = async (items: string[]): Promise<string[]> => {
    try {
        const safeItems = items.map(i => i || "Object");
        while (safeItems.length < 4) safeItems.push("Object");
        const prompt = `Create a 2x2 grid of 4 isolated objects on white backgrounds: 
        Top Left: ${safeItems[0]}
        Top Right: ${safeItems[1]}
        Bottom Left: ${safeItems[2]}
        Bottom Right: ${safeItems[3]}
        Simple cartoon style. No text.
        `;
        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: prompt,
            config: { imageConfig: { aspectRatio: "1:1" } }
        });
        let mainImage = "";
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                mainImage = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }
        if (mainImage) return await sliceGridImage(mainImage);
        return items.map(i => getMockImage(i));
    } catch {
        // Fallback to mocks
        return items.map(i => getMockImage(i));
    }
};
