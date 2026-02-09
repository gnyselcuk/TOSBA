import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JudgeService, JudgeResult } from './judgeService';
import { ai } from './ai';

// Mock the AI module
vi.mock('./ai', () => ({
    JUDGE_MODEL: 'test-judge-model',
    ai: {
        models: {
            generateContent: vi.fn(),
        }
    }
}));

describe('JudgeService', () => {
    const mockGenerateContent = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (ai as any).models.generateContent = mockGenerateContent;
    });

    it('should validate valid content correctly', async () => {
        // Mock successful JSON response
        const mockResponse: JudgeResult = {
            isSafe: true,
            isRelevant: true,
            isEducationallySound: true,
            reason: 'Content is perfect.',
            severity: 'LOW',
            correctionInstruction: undefined
        };

        const mockResult = {
            text: JSON.stringify(mockResponse)
        };

        mockGenerateContent.mockResolvedValue(mockResult);

        const result = await JudgeService.validateContent(
            { question: "2+2=?" },
            { profile: "Child", task: "Math" }
        );

        expect(result).toEqual(mockResponse);
        expect((ai as any).models.generateContent).toHaveBeenCalledWith(expect.objectContaining({
            model: 'test-judge-model',
            config: expect.objectContaining({ responseMimeType: 'application/json' })
        }));
    });

    it('should handle invalid content with correction instructions', async () => {
        const mockResponse: JudgeResult = {
            isSafe: true,
            isRelevant: true,
            isEducationallySound: false,
            reason: 'Too complex',
            severity: 'MEDIUM',
            correctionInstruction: 'Simplify numbers'
        };

        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify(mockResponse)
        });

        const result = await JudgeService.validateContent(
            { question: "Calculus integral" },
            { profile: "Toddler", task: "Math" }
        );

        expect(result.isEducationallySound).toBe(false);
        expect(result.correctionInstruction).toBe('Simplify numbers');
    });

    it('should handle JSON parsing errors by failing open (safe default)', async () => {
        // Mock invalid JSON response (AI hallucination)
        mockGenerateContent.mockResolvedValue({
            text: "I am not returning JSON today."
        });

        const result = await JudgeService.validateContent(
            { test: "data" },
            { profile: "Test", task: "Test" }
        );

        // Expect backup fail-safe response
        expect(result.isEducationallySound).toBe(true);
        expect(result.reason).toContain('Judge Service Unavailable');
    });

    it('should handle API errors by failing open (safe default)', async () => {
        mockGenerateContent.mockRejectedValue(new Error('API Down'));

        const result = await JudgeService.validateContent(
            { test: "data" },
            { profile: "Test", task: "Test" }
        );

        // Current implementation fails open (returns true)
        expect(result.isEducationallySound).toBe(true);
        expect(result.reason).toContain('Judge Service Unavailable');
    });
});
