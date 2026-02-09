import { ai, IMAGE_MODEL } from "../ai";
import { getMockImage } from "../imageService";

export class SketchEnhancerGenerator {
    async enhance(base64Sketch: string, userPrompt: string): Promise<string> {
        try {
            const prompt = `
        Turn this child's sketch into a high-quality, professional illustration.
        Subject: ${userPrompt}
        Style: Colorful, 3D Render style, friendly, cute.
        Keep the composition and layout of the sketch but make it look amazing.
        `;

            const response = await ai.models.generateContent({
                model: IMAGE_MODEL,
                contents: {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: 'image/png', data: base64Sketch.split(',')[1] || base64Sketch } }
                    ]
                },
                config: { imageConfig: { aspectRatio: "1:1" } }
            });

            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
            return getMockImage("Enhanced Sketch");

        } catch (e) {
            console.error("Sketch Enhance Error", e);
            return getMockImage("Error");
        }
    }
}

export const sketchEnhancerGenerator = new SketchEnhancerGenerator();
