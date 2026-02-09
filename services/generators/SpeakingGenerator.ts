import { BaseGenerator } from "./BaseGenerator";
import { GamePayload, ModuleType, AssessmentItem } from "../../types";
import { generateAssessmentImage } from "../imageService";

export class SpeakingGenerator extends BaseGenerator {

    canHandle(moduleType: ModuleType): boolean {
        return ['VERBAL'].includes(moduleType);
    }

    getSystemPrompt(moduleType: ModuleType, interest: string): string {
        return `Create a VERBAL IMITATION GAME.
            Context: Show an object and ask the child to say its name.
            Items: 1 Item (The target object).
            Instruction: "Say 'APPLE'!".
            Interest: ${interest}`;
    }

    async processResponse(
        data: { items?: Array<{ id?: string, name: string, isCorrect: boolean }>, instruction?: string, backgroundTheme?: string, targetWord?: string },
        moduleType: ModuleType,
        interest: string,
        profileContext?: { name?: string, buddyName?: string, age?: number, avoidances?: string[] }
    ): Promise<GamePayload> {
        // One item usually
        const item = data.items?.[0] || { name: 'Apple', isCorrect: true };
        const img = await generateAssessmentImage(item.name, profileContext ? { age: profileContext.age || 7 } : undefined);

        const finalItem: AssessmentItem = {
            id: item.id || '1',
            name: item.name,
            isCorrect: true,
            imageUrl: img
        };

        return {
            // eslint-disable-next-line sonarjs/pseudo-random
            id: `speaking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            template: 'SPEAKING',
            instruction: data.instruction,
            backgroundTheme: data.backgroundTheme,
            targetWord: data.targetWord,
            items: [finalItem]
        };
    }
}
