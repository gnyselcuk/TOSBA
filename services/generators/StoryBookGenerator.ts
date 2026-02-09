import { StoryBook, StoryPage } from "../../types";
import { ai, TEXT_MODEL, IMAGE_MODEL, parseJSON } from "../ai";
import { JudgeService } from "../judgeService";
import { delay } from "../imageService";
import pLimit from "p-limit";

// Better placeholder for story pages with gradient and icon
const getStoryPlaceholder = (pageNum: number, theme: string) => {
    const colors = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];
    const color = colors[(pageNum - 1) % colors.length];
    const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:#1E1B4B;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#grad)"/>
      <text x="256" y="200" font-family="Arial" font-size="80" text-anchor="middle" fill="white" opacity="0.9">✨</text>
      <text x="256" y="290" font-family="Arial" font-size="24" text-anchor="middle" fill="white" opacity="0.8">Page ${pageNum}</text>
      <text x="256" y="330" font-family="Arial" font-size="16" text-anchor="middle" fill="white" opacity="0.6">${theme.substring(0, 20)}</text>
    </svg>
  `;
    const encoded = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
};

export class StoryBookGenerator {
    // eslint-disable-next-line sonarjs/cognitive-complexity
    async generate(
        childName: string,
        buddyName: string,
        interest: string,
        lesson: string,
        age: number,
        profileContext?: { avoidances: string[]; inventoryItems?: string[] }
    ): Promise<StoryBook | null> {
        // Determine age group and interaction mode
        let ageGroup: 'EarlyChildhood' | 'SchoolAge' | 'Adolescent' = 'EarlyChildhood';
        let interactionMode: 'READ_ALONG' | 'QUIZ' | 'DECISION_MAKING' = 'READ_ALONG';

        if (age >= 13) {
            ageGroup = 'Adolescent';
            interactionMode = 'DECISION_MAKING';
        } else if (age >= 7) {
            ageGroup = 'SchoolAge';
            interactionMode = 'QUIZ';
        }

        // Build inventory context for the story
        const hasInventory = profileContext?.inventoryItems && profileContext.inventoryItems.length > 0;
        const inventoryContext = hasInventory
            ? `\n      IMPORTANT: The child has these items from their shop (include them naturally in the story): ${profileContext.inventoryItems!.slice(0, 3).join(', ')}`
            : '';

        // Age-specific prompt instructions
        let ageInstructions: string;
        if (ageGroup === 'EarlyChildhood') {
            ageInstructions = `AUDIENCE: Young child (${age} years). Use VERY simple sentences (max 2-3 per page). Warm, gentle tone. Classic story arc.`;
        } else if (ageGroup === 'SchoolAge') {
            ageInstructions = `AUDIENCE: School-age child (${age} years). Clear sentences. IMPORTANT: Each page MUST include a "question" object with comprehension quiz.`;
        } else {
            ageInstructions = `AUDIENCE: Teenager (${age} years). Respectful, mature tone. Pages 2-3 MUST include "decisionPoint" objects for social choices.`;
        }

        // Age-specific JSON schema
        let jsonSchema: string;
        if (ageGroup === 'EarlyChildhood') {
            jsonSchema = `{
         "title": "Title",
         "pages": [
            { "text": "Simple page text", "imagePrompt": "Scene description" }
         ]
       }`;
        } else if (ageGroup === 'SchoolAge') {
            jsonSchema = `{
         "title": "Title",
         "pages": [
            { 
              "text": "Page text", 
              "imagePrompt": "Scene description",
              "question": {
                "text": "Comprehension question?",
                "options": [
                  { "label": "Correct answer", "isCorrect": true },
                  { "label": "Wrong answer", "isCorrect": false }
                ]
              }
            }
         ]
       }`;
        } else {
            jsonSchema = `{
         "title": "Title",
         "pages": [
            { "text": "Page 1: Setup", "imagePrompt": "Scene" },
            { 
              "text": "Page 2: Challenge", 
              "imagePrompt": "Scene",
              "decisionPoint": {
                "prompt": "What would you do?",
                "choices": [
                  { "label": "Good choice", "consequence": "Positive outcome", "isOptimal": true },
                  { "label": "Other choice", "consequence": "Other outcome", "isOptimal": false }
                ]
              }
            }
         ]
       }`;
        }

        const prompt = `
      Write a ${ageGroup === 'Adolescent' ? 'social scenario' : '4-page story'} about ${childName} and their robot friend ${buddyName}.
      Theme: ${interest}
      Social Skill Lesson: ${lesson}
      ${ageInstructions}
      ${inventoryContext}

      Return JSON matching this schema:
      ${jsonSchema}
    `;

        try {
            // 1. Generate Script (With Smart Agentic Retry)
            interface ScriptCandidate {
                title: string;
                pages: Array<{
                    text: string;
                    imagePrompt: string;
                    question?: {
                        text: string;
                        options: Array<{ label: string; isCorrect: boolean }>;
                    };
                    decisionPoint?: {
                        prompt: string;
                        choices: Array<{ label: string; consequence: string; isOptimal: boolean }>;
                    };
                }>;
            }

            let script: ScriptCandidate | null = null;
            let attempts = 0;
            let feedback = "";
            const safeProfileStr = `Age: ${age}, Interest: ${interest}, Avoid: ${(profileContext?.avoidances || []).join(', ')}`;

            while (attempts < 3) {
                attempts++;
                // Inject feedback into prompt if retrying
                const effectivePrompt = feedback
                    ? `${prompt}\n\n⚠️ PREVIOUS ATTEMPT REJECTED. CRITICAL CORRECTION REQUIRED: ${feedback}`
                    : prompt;

                try {
                    const response = await ai.models.generateContent({
                        model: TEXT_MODEL,
                        contents: effectivePrompt,
                        config: { responseMimeType: "application/json" }
                    });
                    const candidate = parseJSON(response.text);

                    if (candidate && candidate.pages) {
                        // JUDGE TEXT via Central Agent
                        const judgment = await JudgeService.validateContent(
                            candidate,
                            {
                                profile: safeProfileStr,
                                task: "Leveled Social Story Content",
                                constraints: [`Age Group: ${ageGroup}`, `Lesson: ${lesson}`]
                            }
                        );

                        if (JudgeService.isPass(judgment)) {
                            script = candidate;
                            break;
                        } else {
                            feedback = judgment.correctionInstruction || judgment.reason;
                        }
                    }
                } catch (error) {
                    console.error("Story Script Gen Attempt Failed", error);
                }
            }

            if (!script || !script.pages) throw new Error("Failed to generate safe story script after 3 attempts");

            // 2. Process Pages IN PARALLEL with Concurrency Limit
            const limit = pLimit(2);

            // eslint-disable-next-line sonarjs/cognitive-complexity
            const processedPages = await Promise.all(script.pages.map((page, index: number) => limit(async () => {
                // Image Generation - Art style based on age group
                let artStyle = "Colorful, warm, soft watercolor storybook illustration"; // EarlyChildhood
                if (ageGroup === 'SchoolAge') artStyle = "Vibrant, detailed cartoon style, generic animation look";
                if (ageGroup === 'Adolescent') artStyle = "Comic book style, dynamic angles, digital art, slightly more mature and cool";

                const imagePrompt = `Illustration for a children's book. 
            Scene: ${page.imagePrompt}. 
            Characters: Child (${childName}) and robot (${buddyName}). 
            Style: ${artStyle}. 
            Background: ${interest} related.`;

                // Use beautiful placeholder as default fallback
                let imageUrl = getStoryPlaceholder(index + 1, interest);

                // Image Gen with Retry and Exponential Backoff
                let imgAttempts = 0;
                const maxAttempts = 3;

                while (imgAttempts < maxAttempts) {
                    imgAttempts++;
                    try {
                        // Add delay between attempts (exponential backoff)
                        if (imgAttempts > 1) {
                            const waitTime = Math.min(1000 * Math.pow(2, imgAttempts - 1), 8000);
                            await delay(waitTime);
                        }

                        const imgResp = await ai.models.generateContent({
                            model: IMAGE_MODEL,
                            contents: { parts: [{ text: imagePrompt }] },
                            config: { imageConfig: { aspectRatio: "1:1" } }
                        });

                        let candidateUrl = "";
                        for (const part of imgResp.candidates?.[0]?.content?.parts || []) {
                            if (part.inlineData) {
                                candidateUrl = `data:image/png;base64,${part.inlineData.data}`;
                                break;
                            }
                        }

                        if (candidateUrl) {
                            // VISUAL JUDGE - skip on retries to speed up
                            if (imgAttempts === 1) {
                                const visualJudge = await JudgeService.validateImage(candidateUrl, imagePrompt, { chronologicalAge: age });
                                if (JudgeService.isPass(visualJudge)) {
                                    imageUrl = candidateUrl;
                                    break;
                                }
                            } else {
                                // On retries, accept the image without judging
                                imageUrl = candidateUrl;
                                break;
                            }
                        }
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        // Check if it's a network/QUIC error
                        if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('QUIC')) {
                            console.warn(`[Story] Network error on page ${index + 1}, attempt ${imgAttempts}/${maxAttempts}: ${errorMsg}`);
                        } else {
                            console.error("Story Image Gen Failed", error);
                        }
                    }
                }

                // Build processed page with age-specific elements
                const processedPage: StoryPage = {
                    text: page.text,
                    imageUrl: imageUrl,
                    audioBase64: undefined
                };

                // Add question for SchoolAge
                if (page.question && ageGroup === 'SchoolAge') {
                    processedPage.question = {
                        text: page.question.text,
                        options: page.question.options || []
                    };
                }

                // Add decision point for Adolescent
                if (page.decisionPoint && ageGroup === 'Adolescent') {
                    processedPage.decisionPoint = {
                        prompt: page.decisionPoint.prompt,
                        choices: page.decisionPoint.choices || []
                    };
                }

                return processedPage;
            })));

            return {
                id: `story_${Date.now()}`,
                title: script.title,
                pages: processedPages,
                date: new Date().toISOString(),
                // Adaptive properties
                interactionMode: interactionMode,
                targetAgeGroup: ageGroup,
                socialLesson: lesson
            };

        } catch (error) {
            console.error("Story Generation Failed", error);
            return null;
        }
    }
}

export const storyBookGenerator = new StoryBookGenerator();
