import { BaseGenerator } from "./BaseGenerator";
import { GamePayload, ModuleType, AssessmentItem } from "../../types";
import { generateAssessmentImage } from "../imageService";
import pLimit from "p-limit";

export class TileRevealGenerator extends BaseGenerator {

    canHandle(moduleType: ModuleType): boolean {
        return ['OFFLINE_TASK'].includes(moduleType);
    }

    getSystemPrompt(moduleType: ModuleType, interest: string, profileContext?: { age?: number }): string {
        const age = profileContext?.age || 7;


        let itemCount: number;
        let complexity: string;

        if (age <= 6) {
            itemCount = 3;
            complexity = 'very simple and clear';
        } else if (age <= 10) {
            itemCount = 4;
            complexity = 'simple';
        } else if (age <= 14) {
            itemCount = 5;
            complexity = 'moderately detailed';
        } else {
            itemCount = 6;
            complexity = 'detailed and challenging';
        }

        return `Create a TILE REVEAL GAME (Guess the Picture) for a ${age}-year-old child.
                Context: The user reveals a hidden image tile-by-tile and guesses what it is.
                Difficulty: Use ${complexity} images appropriate for age ${age}.
                Items (${itemCount} total): 
                   1. Target Object (The hidden image, Correct).
                   ${Array.from({ length: itemCount - 1 }, (_, i) => `${i + 2}. Distractor Object ${i + 1} (Wrong, but plausible).`).join('\n                   ')}
                Instruction: "Tap tiles to reveal and guess!"
                Interest: ${interest}
                
                IMPORTANT: Make distractors similar enough to be challenging but clearly different from the target.`;
    }

    async processResponse(
        data: { items?: Array<{ id?: string, name: string, isCorrect: boolean }>, instruction?: string, backgroundTheme?: string },
        moduleType: ModuleType,
        interest: string,
        profileContext?: { name?: string, buddyName?: string, age?: number, avoidances?: string[] }
    ): Promise<GamePayload> {
        const limit = pLimit(3);
        const items = data.items || [];
        const itemsWithImages = await Promise.all(
            items.map((item) => limit(async () => {
                const img = await generateAssessmentImage(item.name, profileContext ? { age: profileContext.age || 7 } : undefined);
                const randomId = crypto.randomUUID();
                return {
                    id: item.id || `item_${randomId}`,
                    name: item.name,
                    isCorrect: item.isCorrect,
                    imageUrl: img,
                } as AssessmentItem;
            }))
        );

        // For Tile Reveal, the 'Correct' item's image IS the background image (hidden image)
        const correctItem = itemsWithImages.find(i => i.isCorrect);
        const hiddenImage = correctItem ? correctItem.imageUrl : data.backgroundTheme;

        // Shuffle (Math.random is acceptable for game shuffling)
        const finalItems = [...itemsWithImages];
        for (let i = finalItems.length - 1; i > 0; i--) {
            // eslint-disable-next-line sonarjs/pseudo-random
            const j = Math.floor(Math.random() * (i + 1));
            [finalItems[i], finalItems[j]] = [finalItems[j], finalItems[i]];
        }

        const uniqueId = `camera_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

        return {
            id: uniqueId,
            template: 'CAMERA', // Maps to TileReveal in frontend
            instruction: data.instruction,
            backgroundTheme: hiddenImage, // Use the hidden image as "theme" which means background
            items: finalItems
        };
    }
}
