import { BaseGenerator } from "./BaseGenerator";
import { GamePayload, ModuleType, AssessmentItem } from "../../types";
import { generateAssessmentImage } from "../imageService";
import pLimit from "p-limit";

export class DragDropGenerator extends BaseGenerator {

    canHandle(moduleType: ModuleType): boolean {
        return ['FEEDING', 'SENTENCE_TRAIN', 'MARKET', 'SEQUENCING', 'RECEPTIVE'].includes(moduleType);
    }

    getSystemPrompt(moduleType: ModuleType, interest: string, profileContext?: { age?: number }): string {
        const age = profileContext?.age || 7;
        
        switch (moduleType) {
            case 'FEEDING':
                return `Create a FEEDING GAME for a ${age}-year-old child.
                Context: Child must feed Buddy something they crave.
                TargetZone: Label should be "Buddy's Mouth".
                Items: 1 tasty food item (Correct) and 2 non-food items (Distractors).
                Instruction: "Buddy is hungry for [FOOD]!" (Use simple, clear food names).
                Interest: ${interest}
                
                IMPORTANT: Choose age-appropriate foods and distractors.`;
                
            case 'SENTENCE_TRAIN':
                return `Create a SENTENCE BUILDER GAME for a ${age}-year-old child.
                Context: Form a simple declarative sentence using 3 words.
                TargetZone: Label should be "Train Wagon".
                Items: Exactly 3 words that form a complete sentence (Subject + Verb + Object/Adjective).
                Instruction: "Build the sentence: [WORD1] [WORD2] [WORD3]" (Example: "THE CAT SLEEPS").
                Interest: ${interest}
                
                CRITICAL RULES:
                1. Use ONLY 3 words total
                2. NO "I WANT" sentences
                3. Words must be in CORRECT ORDER in the items array
                4. Use simple, concrete words appropriate for age ${age}
                5. Each word should be a separate item with its own image
                6. Images should clearly represent EACH INDIVIDUAL WORD (not the whole sentence)
                
                Example for "THE DOG RUNS":
                - Item 1: name="THE", image should show the word "THE" or an article symbol
                - Item 2: name="DOG", image should show a dog
                - Item 3: name="RUNS", image should show running action
                
                Choose sentences about: ${interest}`;
                
            case 'MARKET': {
                let budget: number;
                if (age <= 8) {
                    budget = 10;
                } else if (age <= 12) {
                    budget = 20;
                } else {
                    budget = 50;
                }
                
                const affordableMin = Math.floor(budget * 0.5);
                const affordableMax = budget;
                const expensiveMin = budget + 10;
                const expensiveMax = budget + 50;
                const examplePrice = Math.floor(budget * 0.7);
                const expensiveExample1 = budget + 20;
                const expensiveExample2 = budget + 40;
                
                return `Create a SHOPPING/BUDGETING GAME for a ${age}-year-old child.
                Context: Child has ${budget} coins/dollars and must choose what they can afford.
                TargetZone: Label "Shopping Cart".
                Items: 
                  - 1 affordable item (price: ${affordableMin}-${affordableMax} coins) - CORRECT
                  - 2 expensive items (price: ${expensiveMin}-${expensiveMax} coins each) - WRONG
                
                Instruction: "You have ${budget} coins. What can you buy?".
                Interest: ${interest}
                
                IMPORTANT RULES:
                1. Use realistic everyday items (toys, snacks, school supplies, books)
                2. Show CLEAR PRICE TAGS in the item names (e.g., "Toy Car - 15 coins")
                3. Make prices realistic and consistent
                4. Items should be things a ${age}-year-old would want to buy
                5. Affordable item should be CLEARLY within budget
                6. Expensive items should be CLEARLY over budget
                
                Example for ${budget} coins budget:
                - "Candy Bar - ${examplePrice} coins" (CORRECT - affordable)
                - "Video Game - ${expensiveExample1} coins" (WRONG - too expensive)
                - "Bicycle - ${expensiveExample2} coins" (WRONG - too expensive)`;
            }
            case 'SEQUENCING':
                return `Create a SEQUENCING GAME (Logic) for a ${age}-year-old child.
                Context: Order the steps of a daily routine or process.
                TargetZone: Label "Timeline".
                DropSlots: 3.
                Items: 3 items representing Step 1, Step 2, Step 3 (IN CORRECT ORDER).
                Instruction: "Put the steps in order!".
                Interest: ${interest}
                
                IMPORTANT: 
                1. Steps must be in CORRECT ORDER in the items array
                2. Use clear, sequential actions
                3. Choose age-appropriate activities
                4. Each step should have a distinct, clear image`;
                
            default:
                return `Create a DRAG AND DROP game about ${interest} for a ${age}-year-old child.`;
        }
    }

    async processResponse(
        data: Record<string, unknown>,
        moduleType: ModuleType,
        interest: string,
        profileContext?: { name?: string; buddyName?: string; age?: number; avoidances?: string[] }
    ): Promise<GamePayload> {
        // Parallel Image Generation
        const limit = pLimit(3); // Allow 3 concurrent image gens

        const items = (data.items as Array<{ id?: string; name: string; isCorrect: boolean; boundingBox?: number[] }>) || [];
        
        const itemsWithImages = await Promise.all(
            items.map((item) => limit(async () => {
                let img: string;
                
                // Special handling for SENTENCE_TRAIN - generate word-specific images
                if (moduleType === 'SENTENCE_TRAIN') {
                    // For articles/prepositions, use text-based image
                    const articles = ['THE', 'A', 'AN', 'IS', 'ARE', 'WAS', 'WERE'];
                    if (articles.includes(item.name.toUpperCase())) {
                        // Generate a simple text card for articles
                        img = await generateAssessmentImage(
                            `Large text card showing the word "${item.name}" in bold letters`,
                            { age: profileContext?.age || 7 }
                        );
                    } else {
                        // For nouns/verbs/adjectives, generate clear representative image
                        img = await generateAssessmentImage(
                            `Clear, simple illustration of: ${item.name}`,
                            { age: profileContext?.age || 7 }
                        );
                    }
                } else if (moduleType === 'MARKET') {
                    // For market items, include price in the image prompt
                    img = await generateAssessmentImage(
                        `${item.name} with a visible price tag`,
                        { age: profileContext?.age || 7 }
                    );
                } else {
                    // Standard image generation
                    img = await generateAssessmentImage(
                        item.name,
                        { age: profileContext?.age || 7 }
                    );
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

        // Shuffle logic (except for Sequencing/Sentence)
        let finalItems = itemsWithImages;
        if (!['SENTENCE_TRAIN', 'SEQUENCING'].includes(moduleType)) {
            // Simple shuffle - using sort with random is acceptable for game shuffling
            // eslint-disable-next-line sonarjs/pseudo-random
            finalItems = itemsWithImages.sort(() => Math.random() - 0.5);
        }

        return {
            // eslint-disable-next-line sonarjs/pseudo-random
            id: `dragdrop_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            template: 'DRAG_DROP',
            instruction: data.instruction as string,
            backgroundTheme: data.backgroundTheme as string,
            backgroundImage: undefined,
            spawnMode: 'STATIC',
            targetZone: data.targetZone as { label: string },
            dropSlots: (moduleType === 'SENTENCE_TRAIN' || moduleType === 'SEQUENCING') ? 3 : 1,
            isOrdered: (moduleType === 'SENTENCE_TRAIN' || moduleType === 'SEQUENCING'), // Add this flag
            items: finalItems
        };
    }
}
