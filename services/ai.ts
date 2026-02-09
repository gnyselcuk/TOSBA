import { GoogleGenAI } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("CRITICAL: process.env.API_KEY is missing. Application cannot start.");
}

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
export const TEXT_MODEL = 'gemini-3-flash-preview';
export const IMAGE_MODEL = 'gemini-3-pro-image-preview';
export const JUDGE_MODEL = 'gemini-3-pro-preview';
export const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
export const LIVE_MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025';

// Helper to handle Markdown code blocks in JSON responses
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseJSON = <T = any>(text: string | undefined): T | null => {
    if (!text) return null;
    let clean = text.trim();
    // Remove markdown code blocks if present (using simple string operations to avoid regex backtracking)
    if (clean.startsWith('```json')) {
        clean = clean.slice(7); // Remove '```json'
        const endIndex = clean.lastIndexOf('```');
        if (endIndex !== -1) {
            clean = clean.slice(0, endIndex);
        }
    } else if (clean.startsWith('```')) {
        clean = clean.slice(3); // Remove '```'
        const endIndex = clean.lastIndexOf('```');
        if (endIndex !== -1) {
            clean = clean.slice(0, endIndex);
        }
    }
    clean = clean.trim();
    try {
        return JSON.parse(clean) as T;
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return null;
    }
};
