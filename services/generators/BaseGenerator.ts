import { GameContentGenerator } from "./types";
import { GamePayload, ModuleType, UserPhoto } from "../../types";
import { ai, TEXT_MODEL, parseJSON } from "../ai";
import { GameContentSchema } from "./schema";

export abstract class BaseGenerator implements GameContentGenerator {
    abstract canHandle(moduleType: ModuleType): boolean;
    abstract getSystemPrompt(moduleType: ModuleType, interest: string): string;

    // Helper for delay
    protected delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async generate(
        moduleType: ModuleType,
        interest: string,
        context?: string,
        gallery?: UserPhoto[],
        avoidItems?: string[],
        profileContext?: { name?: string; buddyName?: string; age?: number; avoidances?: string[] }
    ): Promise<GamePayload | null> {
        const systemPrompt = this.getSystemPrompt(moduleType, interest);
        const avoidPrompt = avoidItems && avoidItems.length > 0 ? `DO NOT use these items: ${avoidItems.join(', ')}.` : '';

        // AGE-BASED DIGNITY RULES
        const userAge = profileContext?.age || 7;
        let dignityRules = '';

        if (userAge >= 13) {
            dignityRules = `
            * CRITICAL DIGNITY RULES FOR ADOLESCENT (Age ${userAge}):
            - NO childish items: teddy bears, toys, cartoons, baby items
            - USE age-appropriate items: vehicles, technology, sports equipment, real-world objects
            - Visual style: Realistic, modern, cool
            - Examples: Smartphone, Laptop, Skateboard, Headphones, Sports Car
            - AVOID: Teddy Bear, Toy Boat, Baby items, Cartoon characters
            `;
        } else if (userAge >= 7) {
            dignityRules = `
            AGE-APPROPRIATE RULES FOR SCHOOL AGE (Age ${userAge}):
            - Use school-related and hobby items
            - Avoid baby toys
            - Examples: Books, Sports equipment, Musical instruments, Science items
            `;
        } else {
            dignityRules = `
            AGE-APPROPRIATE RULES FOR YOUNG CHILD (Age ${userAge}):
            - Simple, colorful, friendly items
            - Examples: Toys, Animals, Food, Basic objects
            `;
        }

        const SAFETY_GUIDELINES = `
        IMPORTANT SAFETY RULES:
        - NO weapons (guns, lasers, swords, bombs).
        - NO violence or destruction (broken things, fighting).
        - NO scary themes (monsters, ghosts, dark places).
        - Use "Toy" versions of items if unsure (e.g. "Toy Robot" instead of "Robot").
        `;

        let attempts = 0;
        let lastError = "";

        while (attempts < 3) {
            attempts++;
            const prompt = `
                ${systemPrompt}
                ${avoidPrompt}
                ${dignityRules}
                ${SAFETY_GUIDELINES}
                ${lastError ? `PREVIOUS REJECTION REASON: ${lastError}. PLEASE FIX.` : ''}
                
                RETURN JSON matching this schema:
                {
                  "instruction": "Short instruction for the child (e.g. Feed the apple)",
                  "backgroundTheme": "Visual theme description",
                  "spawnMode": "FALLING" or "STATIC",
                  "scenarioText": "Chat message",
                  "targetWord": "Apple",
                  "targetZone": { "label": "Mouth/Train" },
                  "items": [
                     { 
                       "id": "1", 
                       "name": "Apple", 
                       "isCorrect": true,
                       "boundingBox": [100, 100, 200, 200]
                     }
                  ]
                }
            `;

            try {
                const response = await ai.models.generateContent({
                    model: TEXT_MODEL,
                    contents: prompt,
                    config: {
                        temperature: 0.3,
                        responseMimeType: "application/json"
                    }
                });

                const rawData = parseJSON(response.text);

                // Validate with Zod
                const validation = GameContentSchema.safeParse(rawData);

                if (!validation.success) {
                    console.warn("Validation Failed:", validation.error.format());
                    lastError = "JSON structure invalid: " + JSON.stringify(validation.error.flatten().fieldErrors);
                    continue;
                }

                return await this.processResponse(validation.data, moduleType, interest, profileContext);

            } catch (error) {
                console.error("Generator Attempt Failed", error);
                lastError = error instanceof Error ? error.message : String(error);
            }
        }
        return null; // Fallback handled by caller
    }

    abstract processResponse(
        data: Record<string, unknown>,
        moduleType: ModuleType,
        interest: string,
        profileContext?: { name?: string; buddyName?: string; age?: number; avoidances?: string[] }
    ): Promise<GamePayload>;
}
