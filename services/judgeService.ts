
import { ai, JUDGE_MODEL } from "./ai";
import { UserProfile } from "../types";

// JudgeService now uses the centralized AI instance and Model configuration from ./ai


export interface JudgeResult {
    isSafe: boolean;
    isRelevant: boolean;
    isEducationallySound: boolean;
    reason: string;
    correctionInstruction?: string; // Instruction for the worker to fix the issue
    severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
}

/**
 * The JudgeService responsibility is to act as a Quality Assurance Agent.
 * It does not generate content, it CRITIQUES content and provides actionable feedback.
 */
export class JudgeService {

    /**
     * Validates textual content (JSON payloads, Stories, Questions)
     * Returns actionable correction instructions if rejected.
     */
    static async validateContent(
        content: unknown,
        context: {
            profile: string | UserProfile,
            task: string,
            constraints?: string[]
        }
    ): Promise<JudgeResult> {
        let profileSummary = "";
        if (typeof context.profile === 'string') {
            profileSummary = context.profile;
        } else {
            // It's a UserProfile object
            const p = context.profile;
            profileSummary = `Age: ${p.chronologicalAge}, Interests: ${p.interests.join(', ')}`;
            // Add dignity check for adolescents
            if (p.chronologicalAge >= 13) {
                profileSummary += " [ADOLESCENT: Ensure content is dignified, realistic, and NOT childish.]";
            }
        }

        const prompt = `
        ROLE: Expert Educational Content Auditor & Child Safety Officer.
        
        CONTEXT:
        - Target Audience Profile: ${profileSummary}
        - Content Purpose: ${context.task}
        - Strict Constraints: ${(context.constraints || []).join(', ')}

        CONTENT TO AUDIT:
        ${JSON.stringify(content, null, 2)}

        YOUR TASK:
        Evaluate the content based on:
        1. SAFETY (Critical): No violence, scary themes, inappropriate language for children.
        2. RELEVANCE (High): Does it actually fulfill the task? Is the logic sound?
        3. EDUCATIONAL VALUE (Medium): Is it age-appropriate? Is the difficulty correct?
        4. DIGNITY (High): Respectful to the child (especially for special needs). For Adolescents (>13y), REJECT childish "baby talk" or overly simple cartoons if text implies it.

        OUTPUT JSON:
        {
            "isSafe": boolean,
            "isRelevant": boolean,
            "isEducationallySound": boolean,
            "reason": "Clear explanation of the verdict.",
            "correctionInstruction": "If rejected, write a specific instruction to the content generator on HOW to fix it. e.g. 'Remove the word X and replace with Y' or 'Simplify the sentence structure'. If approved, leave empty.",
            "severity": "LOW" | "MEDIUM" | "CRITICAL"
        }
        `;

        try {
            const response = await ai.models.generateContent({
                model: JUDGE_MODEL,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    temperature: 0.1 // Deterministic
                }
            });

            const text = response.text;
            if (!text) throw new Error("Empty response from Judge");

            // Basic JSON cleanup
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanText) as JudgeResult;

            // Failsafe for missing fields
            return {
                isSafe: result.isSafe ?? false,
                isRelevant: result.isRelevant ?? false,
                isEducationallySound: result.isEducationallySound ?? false,
                reason: result.reason || "Unknown reason",
                correctionInstruction: result.correctionInstruction,
                severity: result.severity || "MEDIUM"
            };

        } catch (error) {
            console.error("Judge Service Error:", error);
            // Default to safe if Judge fails, but log it. 
            // In a strict environment, we might want to fail-closed.
            return {
                isSafe: true,
                isRelevant: true,
                isEducationallySound: true,
                reason: "Judge Service Unavailable - Bypassed",
                severity: "LOW"
            };
        }
    }

    /**
     * Validates visual content (Images)
     * Ensures they match the prompt and are safe.
     * NOW SUPPORTS AGE-APPROPRIATE STYLE CHECKS.
     */
    static async validateImage(
        base64Image: string,
        expectedContentDescription: string,
        profile?: UserProfile | { chronologicalAge: number }
    ): Promise<JudgeResult> {

        let styleExpectation = "Safe for children, clear visibility.";
        let dignityContext = "";

        if (profile) {
            const age = profile.chronologicalAge;
            if (age >= 13) {
                styleExpectation = "REALISTIC PHOTOS or HIGH-FIDELITY ICONS. NOT childish cartoons.";
                dignityContext = "USER IS AN ADOLESCENT (13+). Realism is preferred for dignity. Do NOT reject realistic images unless they are explicitly unsafe.";
            } else if (age >= 6) {
                styleExpectation = "2D Game Art or Cartoon. Not too babyish.";
            } else {
                styleExpectation = "Bright, simple Cartoon or Illustration.";
            }
        }

        // SPECIAL HANDLING FOR SIGNS: Be more lenient with text visibility
        const isSign = /sign|label/i.test(expectedContentDescription);
        const relevanceRule = isSign
            ? "2. RELEVANCE: Does it match the Expected Content? For SIGNS, the shape/color/context is important. Text visibility is preferred but not mandatory if the sign is clearly recognizable by its design (e.g., red octagon = STOP sign)."
            : "2. RELEVANCE: Does it match the Expected Content?";

        const prompt = `
        ROLE: Child Safety & Visual Style QA.

        TASK: Audit this generated image.
        EXPECTED CONTENT: ${expectedContentDescription}
        
        USER CONTEXT:
        - Visual Style Rule: ${styleExpectation}
        - Dignity Check: ${dignityContext}

        CHECKLIST:
        1. SAFETY: Is it SAFE? (No scary faces, violence, blood, nudity, disturbing artifacts).
        ${relevanceRule}
        3. QUALITY: Is it not a glitch?
        4. STYLE: Does it match the Age Appropriateness? (e.g. If Adolescent, allow/prefer Realistic. If Toddler, prefer Cartoon).

        output JSON:
        {
            "isSafe": boolean,
            "isRelevant": boolean,
            "isEducationallySound": true,
            "reason": "Explanation",
            "correctionInstruction": "Instruction for regeneration if needed",
            "severity": "MEDIUM"
        }
        `;

        try {
            const response = await ai.models.generateContent({
                model: JUDGE_MODEL,
                contents: {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] || base64Image } }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    temperature: 0.1
                }
            });

            const text = response.text;
            if (!text) throw new Error("Empty response from Visual Judge");

            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText) as JudgeResult;

        } catch (error) {
            console.warn("Visual Judge Error:", error);
            // Default to safe on error to prevent blocking
            return {
                isSafe: true,
                isRelevant: true,
                isEducationallySound: true,
                reason: "Visual Judge Offline",
                severity: "LOW"
            };
        }
    }

    /**
     * Helper to determine if content should be rejected based on JudgeResult
     */
    static isPass(result: JudgeResult): boolean {
        return result.isSafe && result.isRelevant && result.isEducationallySound;
    }
}
