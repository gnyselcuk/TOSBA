import { AssessmentQuestion, AssessmentItem } from "../../types";
import { ai, TEXT_MODEL, IMAGE_MODEL, parseJSON } from "../ai";
import { JudgeService } from "../judgeService";
import { getMockImage, sliceGridImage } from "../imageService";

// Helper: Generate text content with retry logic
async function generateTextContent(
    level: string,
    type: string,
    interest: string,
    avoidItems: string[]
): Promise<{ data: { question: string, correctItem: string, distractors: string[] } | null, attempts: number }> {
    let data = null;
    let attempts = 0;
    let feedback = "";

    while (attempts < 3) {
        attempts++;
        const basePrompt = `
            Create a ${level} (${type}) assessment question for a child using interest: ${interest}.
            Previous items to avoid: ${avoidItems.join(', ')}.
            
            If L1 (Matching): "Find the [Item]".
            If L2 (Reading): "Read: [Word]" (Visuals are objects).
            If L3 (Logic): "Why/What" question.

            Return JSON:
            {
            "question": "Question Text",
            "correctItem": "CorrectAnswerName",
            "distractors": ["Wrong1", "Wrong2", "Wrong3"]
            }
        `;

        const effectivePrompt = feedback
            ? `${basePrompt}\n\n⚠️ PREVIOUS ATTEMPT REJECTED. FIX THIS: ${feedback}`
            : basePrompt;

        try {
            const response = await ai.models.generateContent({
                model: TEXT_MODEL,
                contents: effectivePrompt,
                config: { responseMimeType: "application/json" }
            });

            const candidate = parseJSON<{ question: string, correctItem: string, distractors: string[] }>(response.text);
            if (!candidate || !candidate.correctItem) continue;

            // JUDGE TEXT
            const judgment = await JudgeService.validateContent(
                candidate,
                {
                    profile: interest,
                    task: `Level ${level} Assessment`
                }
            );

            if (JudgeService.isPass(judgment)) {
                data = candidate;
                break;
            } else {
                console.warn(`[Judge] Rejected Text (Attempt ${attempts}): ${judgment.reason}`);
                feedback = judgment.correctionInstruction || judgment.reason;
            }

        } catch (e) {
            console.error("Gen Attempt Failed", e);
        }
    }

    return { data, attempts };
}

// Helper: Generate and validate images
async function generateImages(
    displayNames: string[],
    profileStub?: { age: number }
): Promise<string[]> {
    try {
        const safeItems = displayNames.map(i => i || "Object");
        const gridPrompt = `Create a 2x2 grid of 4 isolated objects on white backgrounds: 
        Top Left: ${safeItems[0]}
        Top Right: ${safeItems[1]}
        Bottom Left: ${safeItems[2]}
        Bottom Right: ${safeItems[3]}
        Simple vector cartoon style, friendly, colorful, no text.`;

        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: gridPrompt,
            config: { imageConfig: { aspectRatio: "1:1" } }
        });

        let mainImage = "";
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                mainImage = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }

        if (mainImage) {
            // JUDGE IMAGE
            const visualJudgeProfile = profileStub ? { chronologicalAge: profileStub.age } : undefined;
            const visualJudgment = await JudgeService.validateImage(mainImage, displayNames.join(', '), visualJudgeProfile);
            if (!JudgeService.isPass(visualJudgment)) {
                console.warn(`[Judge] Visual Warning: ${visualJudgment.reason}. Using fallback icons.`);
                return displayNames.map(n => getMockImage(n));
            }
            return await sliceGridImage(mainImage);
        }
        return displayNames.map(n => getMockImage(n));
    } catch {
        return displayNames.map(n => getMockImage(n));
    }
}

export class AdaptiveQuestionGenerator {
    async generate(
        level: 'L1' | 'L2' | 'L3',
        interest: string,
        avoidItems: string[] = [],
        profileStub?: { avoidances: string[], age: number }
    ): Promise<AssessmentQuestion | null> {
        // Define types based on level
        let type: AssessmentQuestion['type'] = 'MATCHING';
        if (level === 'L2') type = 'READING';
        if (level === 'L3') type = 'COMPREHENSION';

        // 1. GENERATE TEXT (With Smart Agentic Retry)
        const { data } = await generateTextContent(level, type, interest, avoidItems);
        
        if (!data) throw new Error("Failed to generate safe content after 3 attempts");

        // 2. PREPARE VISUALS
        const itemsToGen = [data.correctItem, ...data.distractors];
        // Ensure 4 items
        while (itemsToGen.length < 4) itemsToGen.push("Mystery Item");

        // Randomize order (Math.random is acceptable for game shuffling)
        const displayItems = itemsToGen.map((name: string, idx: number) => ({
            id: `gen_${Date.now()}_${idx}`,
            name: name,
            isCorrect: idx === 0 // First one was correctItem
        // eslint-disable-next-line sonarjs/pseudo-random
        })).sort(() => Math.random() - 0.5);

        const displayNames = displayItems.map(i => i.name);

        // 3. GENERATE & JUDGE VISUALS
        const images = await generateImages(displayNames, profileStub);

        const finalItems: AssessmentItem[] = displayItems.map((item, idx) => ({
            ...item,
            imageUrl: images[idx] || getMockImage(item.name)
        }));

        return {
            id: `q_${Date.now()}`,
            type: type,
            difficulty: level,
            questionText: data.question,
            items: finalItems
        };
    }
}

export const adaptiveQuestionGenerator = new AdaptiveQuestionGenerator();
