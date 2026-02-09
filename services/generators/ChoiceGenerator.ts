import { BaseGenerator } from "./BaseGenerator";
import { GamePayload, ModuleType, AssessmentItem } from "../../types";
import { generateAssessmentImage } from "../imageService";
import pLimit from "p-limit";

export class ChoiceGenerator extends BaseGenerator {

    canHandle(moduleType: ModuleType): boolean {
        return ['MATCHING', 'SIGHT_WORDS', 'SOCIAL_SIM', 'SIGNS', 'SAFETY_SIGNS', 'COMPREHENSION', 'SOCIAL_STORY'].includes(moduleType);
    }

    getSystemPrompt(moduleType: ModuleType, interest: string): string {
        switch (moduleType) {
            case 'MATCHING':
                return `Create a MATCHING GAME.
                Context: Find the identical object.
                ScenarioText: "Look at the big picture on the left."
                Items: 1 Matching Item (Correct), 3 Distractor items.
                Instruction: "Find the matching ${interest}!".
                Interest: ${interest}`;
            case 'SIGHT_WORDS':
                return `Create a SIGHT WORD MATCHING GAME (Edmark Style).
                Context: Match the written word to the correct image.
                ScenarioText: "Word: ${interest.toUpperCase()}" (or a functional word like EXIT, STOP, APPLE).
                Items: 1 Image matching the word (Correct), 3 Distractor images.
                Instruction: "Touch the picture of the word!".
                Interest: ${interest}`;
            case 'SOCIAL_SIM':
                return `Create a SOCIAL CHAT SIMULATION.
                Structure: Buddy sends a message. User picks reply.
                ScenarioText: "Buddy: Let's go to the cinema tomorrow!" (Example)
                Items: 
                   1. Polite/Positive Reply (Correct)
                   2. Irrelevant Reply (Wrong)
                   3. Rude Reply (Wrong)
                   4. Another inappropriate reply (Wrong)
                Instruction: "How should you reply?".
                Interest: ${interest}`;
            case 'SIGNS':
            case 'SAFETY_SIGNS':
                return `Create a SIGN READING GAME.
                Context: Street or Metro navigation.
                ScenarioText: "You need to find the EXIT."
                Items: 1 'Exit' Sign (Correct), 3 other signs (Restroom, Stop, Do Not Enter).
                Instruction: "Tap the EXIT sign."
                Interest: ${interest}`;
            case 'COMPREHENSION':
                return `Create a READING COMPREHENSION GAME.
                Context: Read a short rich story.
                ScenarioText: "The robot went to the moon because he needed cheese." (Example story).
                Items: 1 Correct Answer, 2 Wrong Answers.
                Instruction: "WHY did the robot go to the moon?" (Focus on WHY/HOW).
                Interest: ${interest}`;
            case 'SOCIAL_STORY':
                return `Create a SOCIAL STORY GAME (Emotional Intelligence).
                Context: A social situation involving emotions.
                ScenarioText: "The robot dropped his ice cream."
                Items: 1 Correct Emotion (Sad), 2 Wrong Emotions (Happy, Angry).
                Instruction: "How does the robot feel?".
                Interest: ${interest}`;
            default:
                return `Create a CHOICE game about ${interest}`;
        }
    }

    async processResponse(
        data: Record<string, unknown>,
        moduleType: ModuleType,
        interest: string,
        profileContext?: { name?: string; buddyName?: string; age?: number; avoidances?: string[] }
    ): Promise<GamePayload> {
        const limit = pLimit(3);

        const items = (data.items as Array<{ id?: string; name: string; isCorrect: boolean }>) || [];

        const itemsWithImages = await Promise.all(
            items.map((item) => limit(async () => {
                const img = await generateAssessmentImage(item.name, profileContext ? { age: profileContext.age || 7 } : undefined);
                return {
                    // eslint-disable-next-line sonarjs/pseudo-random
                    id: item.id || `item_${Math.random()}`,
                    name: item.name,
                    isCorrect: item.isCorrect,
                    imageUrl: img,
                } as AssessmentItem;
            }))
        );

        // Reference Image Logic
        let finalBackgroundImage = data.backgroundTheme;
        // ONLY valid for visual matching games where we need to show what to match
        // For COMPREHENSION, SOCIAL_SIM, SOCIAL_STORY - no reference image needed (text-based scenarios)
        if (['MATCHING', 'SIGHT_WORDS', 'SIGNS', 'SAFETY_SIGNS'].includes(moduleType)) {
            const correctItem = itemsWithImages.find(i => i.isCorrect);
            if (correctItem && correctItem.imageUrl) {
                finalBackgroundImage = correctItem.imageUrl;
            }
        } else {
            // For text-based games, explicitly set to null to avoid showing reference image
            finalBackgroundImage = null;
        }

        // Shuffle - using sort with random is acceptable for game shuffling
        // eslint-disable-next-line sonarjs/pseudo-random
        const finalItems = itemsWithImages.sort(() => Math.random() - 0.5);

        return {
            // eslint-disable-next-line sonarjs/pseudo-random
            id: `choice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
            template: 'CHOICE',
            instruction: data.instruction as string,
            backgroundTheme: data.backgroundTheme as string,
            backgroundImage: finalBackgroundImage,
            scenarioText: data.scenarioText as string | undefined,
            items: finalItems
        };
    }
}
