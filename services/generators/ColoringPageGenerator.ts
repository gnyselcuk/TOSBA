import { ai, IMAGE_MODEL } from "../ai";
import { getMockImage } from "../imageService";

export class ColoringPageGenerator {
    async generate(promptText: string): Promise<string> {
        try {
            // 1. Refine prompt for coloring book style
            const prompt = `
        Create a "Coloring Book Page" of: ${promptText}.
        Style: Thick black outlines, pure white background.
        Complexity: Simple, low detail, suitable for young children.
        IMPORTANT: NO shading, NO greyscale, NO colors. just black lines on white.
        `;

            const response = await ai.models.generateContent({
                model: IMAGE_MODEL,
                contents: prompt,
                config: { imageConfig: { aspectRatio: "1:1" } }
            });

            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    const rawImage = `data:image/png;base64,${part.inlineData.data}`;
                    // Optional: Post-process to ensure strict B&W if needed, but model usually obeys.
                    return rawImage;
                }
            }
            return getMockImage("Coloring Page");
        } catch (e) {
            console.error("Coloring Gen Error", e);
            return getMockImage("Error");
        }
    }
}

export const coloringPageGenerator = new ColoringPageGenerator();
