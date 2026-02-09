import { ShopScenario, ShopProduct } from "../../types";
import { ai, TEXT_MODEL, IMAGE_MODEL, parseJSON } from "../ai";
import { getMockImage, removeWhiteBackground } from "../imageService";

export class ShopScenarioGenerator {
    async generate(
        difficulty: 'L1' | 'L2' | 'L3',
        interests: string[],
        age: number
    ): Promise<ShopScenario | null> {
        // Context (Math.random is acceptable for game content selection)
        // eslint-disable-next-line sonarjs/pseudo-random
        const interest = interests[Math.floor(Math.random() * interests.length)] || "General Store";
        // eslint-disable-next-line sonarjs/pseudo-random
        const season = ["Summer", "Winter", "Spring", "Autumn"][Math.floor(Math.random() * 4)];

        // Prompt Construction
        const prompt = `
        Create a SHOPPING SCENARIO for an educational game for an autistic child.
        
        Difficulty: ${difficulty}
        Age Group: ${age}
        Interest/Theme: ${interest} (${season})
        
        RULES:
        - L1 (3-6yo): Simple Barter. Price is always 1 Token. 3 Items.
        - L2 (7-12yo): Basic Math. Prices $1-$10. Wallet has exact or slightly more change. 4 Items.
        - L3 (13+yo): Budgeting. Prices $10-$50. Wallet limit requires choice (cannot buy all). Shopping List given. 5 Items.

        IMPORTANT: 
        1. The output MUST be in ENGLISH.
        2. Dialogue should be simple, encouraging, and clear.
        3. Currency is implicit ($), keep prices as integers.

        Return JSON:
        {
          "theme": "Creative Theme Name (English)",
          "walletAmount": number (1 for L1, specific amount for L2/L3),
          "requiredItems": ["ItemName1", "ItemName..."] (Only for L3, else empty),
          "dialogue": {
            "welcome": "Friendly greeting from Shopkeeper (English)",
            "success": "Purchase success message (English)",
            "failure": "Not enough money / wrong item message (English)"
          },
          "products": [
             { "name": "Item Name (English)", "price": number }
          ]
        }
    `;

        try {
            const response = await ai.models.generateContent({
                model: TEXT_MODEL,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            const data = parseJSON(response.text);
            if (!data || !data.products) throw new Error("Invalid Generation");

            // Generate Images for Products
            const productsWithImages: ShopProduct[] = await Promise.all(data.products.map(async (prod: { name: string, price: number }, idx: number) => {
                const imgPrompt = `Icon of ${prod.name}, ${interest} theme, isolated on white background, simple vector style.`;
                let imageUrl = getMockImage(prod.name);

                try {
                    const imgResp = await ai.models.generateContent({
                        model: IMAGE_MODEL,
                        contents: { parts: [{ text: imgPrompt }] },
                        config: { imageConfig: { aspectRatio: "1:1" } }
                    });

                    for (const part of imgResp.candidates?.[0]?.content?.parts || []) {
                        if (part.inlineData) {
                            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                            imageUrl = await removeWhiteBackground(imageUrl);
                            break;
                        }
                    }
                } catch {
                    console.warn(`Shop Image Failed for ${prod.name}`);
                }

                return {
                    id: `prod_${Date.now()}_${idx}`,
                    name: prod.name,
                    price: difficulty === 'L1' ? 1 : prod.price,
                    imageUrl: imageUrl
                };
            }));

            return {
                difficulty,
                theme: data.theme,
                walletAmount: data.walletAmount,
                requiredItems: data.requiredItems || [],
                dialogue: data.dialogue,
                products: productsWithImages
            };

        } catch (e) {
            console.error("Shop Scenario Generation Failed", e);
            // Fallback
            return {
                difficulty,
                theme: "My Market",
                walletAmount: difficulty === 'L1' ? 1 : 10,
                requiredItems: [],
                dialogue: { welcome: "Welcome!", success: "Good job!", failure: "Oops!" },
                products: [
                    { id: '1', name: 'Apple', price: 1, imageUrl: getMockImage('Apple') },
                    { id: '2', name: 'Milk', price: 2, imageUrl: getMockImage('Milk') }
                ]
            };
        }
    }
}

export const shopScenarioGenerator = new ShopScenarioGenerator();
