import { z } from "zod";

export const GameItemSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    isCorrect: z.boolean().default(false),
    boundingBox: z.array(z.number()).optional(), // [ymin, xmin, ymax, xmax]
});

export const GameContentSchema = z.object({
    instruction: z.string().min(1),
    backgroundTheme: z.string(),
    spawnMode: z.enum(['FALLING', 'STATIC']).optional(),
    scenarioText: z.string().optional(),
    targetWord: z.string().optional(),
    targetZone: z.object({
        label: z.string()
    }).optional(),
    items: z.array(GameItemSchema).min(1),
    // Metadata for educational tracking
    difficultyLevel: z.number().optional(),
    skillsTargeted: z.array(z.string()).optional()
});

export type GameContentResponse = z.infer<typeof GameContentSchema>;
