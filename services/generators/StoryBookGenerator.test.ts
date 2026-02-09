import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storyBookGenerator } from './StoryBookGenerator';
import { ai } from '../ai';
import { JudgeService } from '../judgeService';

// Mock dependencies
vi.mock('../ai', () => ({
  ai: {
    models: {
      generateContent: vi.fn(),
    },
  },
  TEXT_MODEL: 'gemini-1.5-flash',
  IMAGE_MODEL: 'gemini-2.0-flash-exp',
  parseJSON: vi.fn((text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }),
}));

vi.mock('../judgeService', () => ({
  JudgeService: {
    validateContent: vi.fn(),
    validateImage: vi.fn(),
    isPass: vi.fn(),
  },
}));

vi.mock('../imageService', () => ({
  delay: vi.fn(() => Promise.resolve()),
}));

describe('StoryBookGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate a story for early childhood', async () => {
      const mockScript = {
        title: 'Test Story',
        pages: [
          {
            text: 'Once upon a time...',
            imagePrompt: 'A happy scene',
          },
          {
            text: 'The end.',
            imagePrompt: 'A happy ending',
          },
        ],
      };

      // Mock text generation
      vi.mocked(ai.models.generateContent)
        .mockResolvedValueOnce({
          text: JSON.stringify(mockScript),
          candidates: [],
        })
        // Mock image generation for page 1
        .mockResolvedValueOnce({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: 'base64imagedata1',
                    },
                  },
                ],
              },
            },
          ],
        })
        // Mock image generation for page 2
        .mockResolvedValueOnce({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: 'base64imagedata2',
                    },
                  },
                ],
              },
            },
          ],
        });

      // Mock judge to pass
      vi.mocked(JudgeService.validateContent).mockResolvedValue({
        isSafe: true,
        isRelevant: true,
        reason: 'Content is appropriate',
      });
      vi.mocked(JudgeService.validateImage).mockResolvedValue({
        isSafe: true,
        isRelevant: true,
        reason: 'Image is appropriate',
      });
      vi.mocked(JudgeService.isPass).mockReturnValue(true);

      const result = await storyBookGenerator.generate(
        'Alice',
        'Robo',
        'trains',
        'sharing',
        5,
        { avoidances: [] }
      );

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Test Story');
      expect(result?.pages).toHaveLength(2);
      expect(result?.interactionMode).toBe('READ_ALONG');
      expect(result?.targetAgeGroup).toBe('EarlyChildhood');
    });

    it('should generate a story with quiz for school age', async () => {
      const mockScript = {
        title: 'School Story',
        pages: [
          {
            text: 'Page 1 text',
            imagePrompt: 'Scene 1',
            question: {
              text: 'What happened?',
              options: [
                { label: 'Correct', isCorrect: true },
                { label: 'Wrong', isCorrect: false },
              ],
            },
          },
        ],
      };

      vi.mocked(ai.models.generateContent)
        .mockResolvedValueOnce({
          text: JSON.stringify(mockScript),
          candidates: [],
        })
        .mockResolvedValueOnce({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: 'base64imagedata',
                    },
                  },
                ],
              },
            },
          ],
        });

      vi.mocked(JudgeService.validateContent).mockResolvedValue({
        isSafe: true,
        isRelevant: true,
        reason: 'Content is appropriate',
      });
      vi.mocked(JudgeService.validateImage).mockResolvedValue({
        isSafe: true,
        isRelevant: true,
        reason: 'Image is appropriate',
      });
      vi.mocked(JudgeService.isPass).mockReturnValue(true);

      const result = await storyBookGenerator.generate(
        'Bob',
        'Bot',
        'space',
        'teamwork',
        8,
        { avoidances: [] }
      );

      expect(result).not.toBeNull();
      expect(result?.interactionMode).toBe('QUIZ');
      expect(result?.targetAgeGroup).toBe('SchoolAge');
      expect(result?.pages[0].question).toBeDefined();
    });

    it('should generate a story with decision points for adolescent', async () => {
      const mockScript = {
        title: 'Teen Story',
        pages: [
          {
            text: 'Setup',
            imagePrompt: 'Scene',
          },
          {
            text: 'Challenge',
            imagePrompt: 'Scene',
            decisionPoint: {
              prompt: 'What would you do?',
              choices: [
                { label: 'Good choice', consequence: 'Good outcome', isOptimal: true },
                { label: 'Bad choice', consequence: 'Bad outcome', isOptimal: false },
              ],
            },
          },
        ],
      };

      vi.mocked(ai.models.generateContent)
        .mockResolvedValueOnce({
          text: JSON.stringify(mockScript),
          candidates: [],
        })
        .mockResolvedValueOnce({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: 'base64imagedata1',
                    },
                  },
                ],
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: 'base64imagedata2',
                    },
                  },
                ],
              },
            },
          ],
        });

      vi.mocked(JudgeService.validateContent).mockResolvedValue({
        isSafe: true,
        isRelevant: true,
        reason: 'Content is appropriate',
      });
      vi.mocked(JudgeService.validateImage).mockResolvedValue({
        isSafe: true,
        isRelevant: true,
        reason: 'Image is appropriate',
      });
      vi.mocked(JudgeService.isPass).mockReturnValue(true);

      const result = await storyBookGenerator.generate(
        'Charlie',
        'Chip',
        'coding',
        'problem solving',
        14,
        { avoidances: [] }
      );

      expect(result).not.toBeNull();
      expect(result?.interactionMode).toBe('DECISION_MAKING');
      expect(result?.targetAgeGroup).toBe('Adolescent');
      expect(result?.pages[1].decisionPoint).toBeDefined();
    });

    it('should return null if script generation fails after retries', async () => {
      vi.mocked(ai.models.generateContent).mockRejectedValue(new Error('API Error'));

      const result = await storyBookGenerator.generate(
        'Test',
        'Bot',
        'test',
        'test',
        5,
        { avoidances: [] }
      );

      expect(result).toBeNull();
    });

    it('should retry script generation if judge rejects', async () => {
      const mockScript = {
        title: 'Test Story',
        pages: [
          {
            text: 'Test',
            imagePrompt: 'Test',
          },
        ],
      };

      vi.mocked(ai.models.generateContent)
        // First attempt - rejected
        .mockResolvedValueOnce({
          text: JSON.stringify(mockScript),
          candidates: [],
        })
        // Second attempt - accepted
        .mockResolvedValueOnce({
          text: JSON.stringify(mockScript),
          candidates: [],
        })
        // Image generation
        .mockResolvedValueOnce({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: 'base64imagedata',
                    },
                  },
                ],
              },
            },
          ],
        });

      vi.mocked(JudgeService.validateContent)
        .mockResolvedValueOnce({
          isSafe: false,
          isRelevant: true,
          reason: 'Content not appropriate',
          correctionInstruction: 'Make it safer',
        })
        .mockResolvedValueOnce({
          isSafe: true,
          isRelevant: true,
          reason: 'Content is appropriate',
        });

      vi.mocked(JudgeService.validateImage).mockResolvedValue({
        isSafe: true,
        isRelevant: true,
        reason: 'Image is appropriate',
      });

      vi.mocked(JudgeService.isPass)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true)
        .mockReturnValue(true);

      const result = await storyBookGenerator.generate(
        'Test',
        'Bot',
        'test',
        'test',
        5,
        { avoidances: [] }
      );

      expect(result).not.toBeNull();
      expect(ai.models.generateContent).toHaveBeenCalledTimes(3); // 2 script attempts + 1 image
    });

    it('should use placeholder image if image generation fails', async () => {
      const mockScript = {
        title: 'Test Story',
        pages: [
          {
            text: 'Test',
            imagePrompt: 'Test',
          },
        ],
      };

      vi.mocked(ai.models.generateContent)
        .mockResolvedValueOnce({
          text: JSON.stringify(mockScript),
          candidates: [],
        })
        // Image generation fails
        .mockRejectedValueOnce(new Error('Image generation failed'));

      vi.mocked(JudgeService.validateContent).mockResolvedValue({
        isSafe: true,
        isRelevant: true,
        reason: 'Content is appropriate',
      });
      vi.mocked(JudgeService.isPass).mockReturnValue(true);

      const result = await storyBookGenerator.generate(
        'Test',
        'Bot',
        'test',
        'test',
        5,
        { avoidances: [] }
      );

      expect(result).not.toBeNull();
      expect(result?.pages[0].imageUrl).toContain('data:image/svg+xml'); // Placeholder
    });

    it('should include inventory items in story context', async () => {
      const mockScript = {
        title: 'Test Story',
        pages: [
          {
            text: 'Test with items',
            imagePrompt: 'Test',
          },
        ],
      };

      vi.mocked(ai.models.generateContent)
        .mockResolvedValueOnce({
          text: JSON.stringify(mockScript),
          candidates: [],
        })
        .mockResolvedValueOnce({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      data: 'base64imagedata',
                    },
                  },
                ],
              },
            },
          ],
        });

      vi.mocked(JudgeService.validateContent).mockResolvedValue({
        isSafe: true,
        isRelevant: true,
        reason: 'Content is appropriate',
      });
      vi.mocked(JudgeService.validateImage).mockResolvedValue({
        isSafe: true,
        isRelevant: true,
        reason: 'Image is appropriate',
      });
      vi.mocked(JudgeService.isPass).mockReturnValue(true);

      const result = await storyBookGenerator.generate(
        'Test',
        'Bot',
        'test',
        'test',
        5,
        { avoidances: [], inventoryItems: ['toy car', 'teddy bear', 'ball'] }
      );

      expect(result).not.toBeNull();
      // Check that the prompt included inventory items
      const firstCall = vi.mocked(ai.models.generateContent).mock.calls[0];
      expect(firstCall[0].contents).toContain('toy car');
    });
  });
});
