import { BaseGenerator } from "./BaseGenerator";
import { GamePayload, ModuleType, AssessmentItem } from "../../types";
import { generateAssessmentImage } from "../imageService";
import { getGameItemImage } from "../letterAssets";
import pLimit from "p-limit";

export class TapTrackGenerator extends BaseGenerator {

    canHandle(moduleType: ModuleType): boolean {
        return ['POP_BALLOON', 'PHONICS', 'I_SPY', 'PECS', 'PHOTO_HUNT'].includes(moduleType);
    }

    getSystemPrompt(moduleType: ModuleType, interest: string): string {
        switch (moduleType) {
            case 'POP_BALLOON':
                return `Create a BALLOON POP GAME.
                SpawnMode: 'FALLING'.
                Items: 5 balloons. 3 are the Target (Correct), 2 are Distractors.
                Instruction: "Pop only the CAT balloons!".
                Interest: ${interest}`;
            case 'PHONICS':
                return `Create a LETTER CATCH GAME.
                SpawnMode: 'FALLING'.
                Items: Focus on a specific letter (e.g. 'A'). 4 'A's (Correct), 3 'B's (Distractors).
                Instruction: "Catch the letter A!".
                Interest: ${interest}`;
            case 'I_SPY':
                return `Create an I SPY GAME.
                SpawnMode: 'STATIC' (Hidden in scene).
                Items: 1 Hidden Object (Correct), 4 Decoys.
                Instruction: "Find the Red Hat".
                Interest: ${interest}`;
            case 'PHOTO_HUNT':
                return `Create a HOME PHOTO HUNT (AR-Lite simulation).
                Context: A photo of a messy room or kitchen.
                SpawnMode: 'STATIC'.
                Items:
                  - Define 3-4 items found in a typical home.
                  - IMPORTANT: Include "boundingBox" for each item: [ymin, xmin, ymax, xmax] (0-1000 scale).
                  - One item is Correct (Target), others are distractors.
                Instruction: "Find the Apple on the table!".
                Interest: ${interest}`;
            default:
                return `Create a TAP TRACK game about ${interest}`;
        }
    }

    async processResponse(
        data: { items?: Array<{ id?: string, name: string, isCorrect: boolean, boundingBox?: number[] }>, instruction?: string, backgroundTheme?: string, spawnMode?: string },
        moduleType: ModuleType,
        interest: string,
        profileContext?: { name?: string, buddyName?: string, age?: number, avoidances?: string[] }
    ): Promise<GamePayload> {
        const limit = pLimit(3);
        const useStaticAssets = moduleType === 'PHONICS';

        const itemsWithImages = await Promise.all(
            (data.items || []).map((item) => limit(async () => {
                let img: string;
                if (useStaticAssets) {
                    img = getGameItemImage(item.name);
                } else {
                    img = await generateAssessmentImage(item.name, profileContext ? { age: profileContext.age || 7 } : undefined);
                }

                return {
                    // eslint-disable-next-line sonarjs/pseudo-random
                    id: item.id || `item_${Math.random()}`,
                    name: item.name,
                    isCorrect: item.isCorrect,
                    imageUrl: img,
                    boundingBox: item.boundingBox
                } as AssessmentItem;
            }))
        );

        // Shuffle logic (Math.random is acceptable for game shuffling)
        // eslint-disable-next-line sonarjs/pseudo-random
        const finalItems = itemsWithImages.sort(() => Math.random() - 0.5);

        return {
            // eslint-disable-next-line sonarjs/pseudo-random
            id: `taptrack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            template: 'TAP_TRACK',
            instruction: data.instruction,
            backgroundTheme: data.backgroundTheme,
            spawnMode: (data.spawnMode as 'FALLING' | 'FLOATING' | 'STATIC') || 'STATIC',
            items: finalItems
        };
    }
}
