import { ai, IMAGE_MODEL } from "../ai";
import { getMockImage } from "../imageService";

export class HiddenImageGenerator {
    async generate(interest: string): Promise<{ imageUrl: string, label: string }> {
        try {
            // Define specific subjects for each theme
            const themeSubjects: Record<string, string[]> = {
                "Space": ["a friendly astronaut floating in space", "a colorful rocket ship blasting off", "cute alien friends on a planet", "the solar system with smiling planets"],
                "Dinosaurs": ["a happy T-Rex playing", "a friendly Triceratops family", "baby dinosaurs hatching from eggs", "a Brontosaurus eating from tall trees"],
                "Under Water": ["a smiling dolphin pod", "a colorful coral reef with clownfish", "a friendly octopus waving", "a magical mermaid castle"],
                "Candy Land": ["a gingerbread house with candy decorations", "lollipop trees and candy flowers", "a chocolate river with candy boats", "ice cream mountains and cookie paths"],
                "Super Heroes": ["a kid superhero flying through clouds", "superhero friends saving the day", "a superhero training camp", "a colorful superhero team pose"],
                "Jungle": ["friendly jungle animals having a party", "a monkey family swinging on vines", "a colorful parrot in tropical trees", "a baby elephant playing with friends"],
                "Pirates": ["a cute pirate ship sailing on waves", "friendly pirates finding treasure", "a tropical treasure island", "a pirate parrot on a treasure chest"],
                "Robots": ["a friendly robot family", "cute robots building things together", "a colorful robot dance party", "a helpful robot in a workshop"]
            };

            // Pick a random specific subject for this theme (Math.random is acceptable for game content selection)
            const subjects = themeSubjects[interest] || [`a fun scene about ${interest}`];
            // eslint-disable-next-line sonarjs/pseudo-random
            const chosenSubject = subjects[Math.floor(Math.random() * subjects.length)];

            // Extract a simple label from the subject
            const labelMatch = chosenSubject.match(/an?\s+(.+)/);
            const label = labelMatch ? labelMatch[1].split(' ').slice(0, 3).join(' ') : interest;

            const promptText = `
        Create a beautiful, vibrant illustration for a children's scratch-and-reveal game.
        
        SUBJECT: ${chosenSubject}
        THEME: ${interest}
        
        STRICT ART DIRECTION:
        - Style: Modern children's book illustration, similar to "Explore Space" educational posters
        - Colors: VIBRANT and SATURATED - use rainbow colors, glowing effects, sparkles
        - Composition: FULL FRAME - fill the entire image, no empty borders
        - Characters: Cute, round, friendly faces with big eyes and smiles (kawaii style)
        - Background: Rich, detailed, swirling colorful patterns
        - Text: Include a SHORT catchy title like "EXPLORE SPACE!" or "ADVENTURE AWAITS!" in fun, bold letters
        - Details: Add stars, sparkles, small decorative elements scattered throughout
        - Mood: MAGICAL, EXCITING, WONDER-FILLED
        - Age appropriate: 100% child-friendly, no scary elements
        
        QUALITY REQUIREMENTS:
        - High detail and crisp edges
        - Professional poster quality
        - Balanced composition with a clear focal point
        - Harmonious color palette with good contrast
        
        DO NOT include: weapons, violence, scary faces, dark themes, realistic humans
        `;

            const response = await ai.models.generateContent({
                model: IMAGE_MODEL,
                contents: { parts: [{ text: promptText }] },
                config: { imageConfig: { aspectRatio: "1:1" } }
            });

            let imageUrl = "";
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                    break;
                }
            }

            return {
                imageUrl: imageUrl || getMockImage(interest),
                label: label.charAt(0).toUpperCase() + label.slice(1) // Capitalize
            };

        } catch (e) {
            console.error("Hidden Image Generation Error:", e);
            return { imageUrl: getMockImage(interest), label: interest };
        }
    }
}

export const hiddenImageGenerator = new HiddenImageGenerator();
