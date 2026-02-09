import { ai, TEXT_MODEL, parseJSON } from "../ai";

export interface FusionBlueprint {
    id: string;
    name: string;
    interest: string;
    starsPerFusion: number;
    completionReward: string;
    slots: Array<{
        id: string;
        label: string;
        requiredItems: number;
        filledItems: string[];
        emoji: string;
    }>;
}

export class FusionBlueprintGenerator {
    async generate(interest: string): Promise<FusionBlueprint | null> {
        const prompt = `
    Create a Fusion Workshop blueprint for a child interested in: "${interest}"
    
    The blueprint should be a creative building project that the child can assemble by collecting parts.
    
    RULES:
    1. Create a COMPLETE project related to "${interest}" (e.g., Dream Race Car, Super Piano, etc.)
    2. Break it down into 4 MAIN PARTS (head/body/legs OR engine/body/wheels, etc.)
    3. Each part needs 2-4 sub-items to complete
    4. Total items should be 12 pieces
    5. Use appropriate emojis for each part
    6. Make it FUN and MOTIVATING for kids!
    
    Return JSON ONLY:
    {
      "id": "unique-id",
      "name": "Project Name (e.g., Dream Race Car)",
      "interest": "${interest}",
      "starsPerFusion": 5,
      "completionReward": "What they get when finished",
      "slots": [
        {
          "id": "part1",
          "label": "Part Name",
          "requiredItems": 3,
          "filledItems": [],
          "emoji": "🎯"
        }
      ]
    }
    
    EXAMPLES:
    - Sports Cars → "Dream Race Car" (Engine, Body, Wheels, Wings)
    - Music → "Super Piano" (Keys, Hammers, Strings, Pedals)
    - Animals → "Pet Care Center" (Home, Food Station, Toys, Medical Kit)
    `;

        try {
            const response = await ai.models.generateContent({
                model: TEXT_MODEL,
                contents: prompt,
                config: { responseMimeType: "application/json", temperature: 0.8 }
            });

            const blueprint = parseJSON(response.text);

            if (blueprint && blueprint.slots && blueprint.slots.length === 4) {
                return blueprint;
            }

            throw new Error("Invalid blueprint structure");
        } catch (e) {
            console.error("Blueprint Generation Failed", e);
            return null;
        }
    }
}

export const fusionBlueprintGenerator = new FusionBlueprintGenerator();
