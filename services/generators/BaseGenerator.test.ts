import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseGenerator } from './BaseGenerator';
import { GamePayload, ModuleType } from '../../types';
import { ai } from '../ai';
import { GameContentSchema } from './schema';

// Create a concrete implementation for testing
class TestGenerator extends BaseGenerator {
  canHandle(moduleType: ModuleType): boolean {
    return moduleType === 'CHOICE';
  }

  getSystemPrompt(_moduleType: ModuleType, interest: string): string {
    return `Generate a test game about ${interest}`;
  }

  async processResponse(
    data: Record<string, unknown>,
    _moduleType: ModuleType,
    _interest: string
  ): Promise<GamePayload> {
    return {
      template: 'CHOICE',
      instruction: data.instruction as string || 'Test instruction',
      backgroundTheme: data.backgroundTheme as string || 'Test theme',
      items: (data.items as Array<{ id: string; name: string; isCorrect: boolean }>) || [],
    };
  }
}

// Mock dependencies
vi.mock('../ai', () => ({
  ai: {
    models: {
      generateContent: vi.fn(),
    },
  },
  TEXT_MODEL: 'gemini-1.5-flash',
  parseJSON: vi.fn((text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }),
}));

vi.mock('./schema', () => ({
  GameContentSchema: {
    safeParse: vi.fn(),
  },
}));

describe('BaseGenerator', () => {
  let generator: TestGenerator;

  beforeEach(() => {
    generator = new TestGenerator();
    vi.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate game content successfully', async () => {
      const mockData = {
        instruction: 'Find the apple',
        backgroundTheme: 'Kitchen',
        spawnMode: 'STATIC',
        items: [
          { id: '1', name: 'Apple', isCorrect: true },
          { id: '2', name: 'Banana', isCorrect: false },
        ],
      };

      vi.mocked(ai.models.generateContent).mockResolvedValue({
        text: JSON.stringify(mockData),
        candidates: [],
      });

      vi.mocked(GameContentSchema.safeParse).mockReturnValue({
        success: true,
        data: mockData,
      });

      const result = await generator.generate('CHOICE', 'fruits');

      expect(result).not.toBeNull();
      expect(result?.instruction).toBe('Find the apple');
      expect(result?.backgroundTheme).toBe('Kitchen');
    });

    it('should include age-appropriate dignity rules for adolescent', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [],
      };

      vi.mocked(ai.models.generateContent).mockResolvedValue({
        text: JSON.stringify(mockData),
        candidates: [],
      });

      vi.mocked(GameContentSchema.safeParse).mockReturnValue({
        success: true,
        data: mockData,
      });

      await generator.generate('CHOICE', 'technology', undefined, undefined, undefined, {
        age: 14,
      });

      const call = vi.mocked(ai.models.generateContent).mock.calls[0];
      const prompt = call[0].contents as string;

      expect(prompt).toContain('ADOLESCENT');
      expect(prompt).toContain('NO childish items');
      expect(prompt).toContain('Smartphone');
    });

    it('should include age-appropriate rules for school age', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [],
      };

      vi.mocked(ai.models.generateContent).mockResolvedValue({
        text: JSON.stringify(mockData),
        candidates: [],
      });

      vi.mocked(GameContentSchema.safeParse).mockReturnValue({
        success: true,
        data: mockData,
      });

      await generator.generate('CHOICE', 'sports', undefined, undefined, undefined, {
        age: 8,
      });

      const call = vi.mocked(ai.models.generateContent).mock.calls[0];
      const prompt = call[0].contents as string;

      expect(prompt).toContain('SCHOOL AGE');
      expect(prompt).toContain('school-related');
    });

    it('should include age-appropriate rules for early childhood', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [],
      };

      vi.mocked(ai.models.generateContent).mockResolvedValue({
        text: JSON.stringify(mockData),
        candidates: [],
      });

      vi.mocked(GameContentSchema.safeParse).mockReturnValue({
        success: true,
        data: mockData,
      });

      await generator.generate('CHOICE', 'animals', undefined, undefined, undefined, {
        age: 4,
      });

      const call = vi.mocked(ai.models.generateContent).mock.calls[0];
      const prompt = call[0].contents as string;

      expect(prompt).toContain('YOUNG CHILD');
      expect(prompt).toContain('Simple, colorful');
    });

    it('should include avoid items in prompt', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [],
      };

      vi.mocked(ai.models.generateContent).mockResolvedValue({
        text: JSON.stringify(mockData),
        candidates: [],
      });

      vi.mocked(GameContentSchema.safeParse).mockReturnValue({
        success: true,
        data: mockData,
      });

      await generator.generate(
        'CHOICE',
        'fruits',
        undefined,
        undefined,
        ['apple', 'banana']
      );

      const call = vi.mocked(ai.models.generateContent).mock.calls[0];
      const prompt = call[0].contents as string;

      expect(prompt).toContain('DO NOT use these items');
      expect(prompt).toContain('apple');
      expect(prompt).toContain('banana');
    });

    it('should include safety guidelines in prompt', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [],
      };

      vi.mocked(ai.models.generateContent).mockResolvedValue({
        text: JSON.stringify(mockData),
        candidates: [],
      });

      vi.mocked(GameContentSchema.safeParse).mockReturnValue({
        success: true,
        data: mockData,
      });

      await generator.generate('CHOICE', 'test');

      const call = vi.mocked(ai.models.generateContent).mock.calls[0];
      const prompt = call[0].contents as string;

      expect(prompt).toContain('SAFETY RULES');
      expect(prompt).toContain('NO weapons');
      expect(prompt).toContain('NO violence');
      expect(prompt).toContain('NO scary themes');
    });

    it('should retry on validation failure', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [],
      };

      vi.mocked(ai.models.generateContent).mockResolvedValue({
        text: JSON.stringify(mockData),
        candidates: [],
      });

      // First attempt fails validation
      vi.mocked(GameContentSchema.safeParse)
        .mockReturnValueOnce({
          success: false,
          error: {
            format: () => ({ items: 'Required' }),
            flatten: () => ({ fieldErrors: { items: ['Required'] } }),
          } as never,
        })
        // Second attempt succeeds
        .mockReturnValueOnce({
          success: true,
          data: mockData,
        });

      const result = await generator.generate('CHOICE', 'test');

      expect(result).not.toBeNull();
      expect(ai.models.generateContent).toHaveBeenCalledTimes(2);
    });

    it('should return null after 3 failed attempts', async () => {
      vi.mocked(ai.models.generateContent).mockRejectedValue(new Error('API Error'));

      const result = await generator.generate('CHOICE', 'test');

      expect(result).toBeNull();
      expect(ai.models.generateContent).toHaveBeenCalledTimes(3);
    });

    it('should include previous error in retry prompt', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [],
      };

      vi.mocked(ai.models.generateContent)
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({
          text: JSON.stringify(mockData),
          candidates: [],
        });

      vi.mocked(GameContentSchema.safeParse).mockReturnValue({
        success: true,
        data: mockData,
      });

      await generator.generate('CHOICE', 'test');

      const secondCall = vi.mocked(ai.models.generateContent).mock.calls[1];
      const prompt = secondCall[0].contents as string;

      expect(prompt).toContain('PREVIOUS REJECTION REASON');
      expect(prompt).toContain('First error');
    });
  });

  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await generator['delay'](100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some margin
    });
  });

  describe('canHandle', () => {
    it('should return true for CHOICE module type', () => {
      expect(generator.canHandle('CHOICE')).toBe(true);
    });

    it('should return false for other module types', () => {
      expect(generator.canHandle('DRAG_DROP')).toBe(false);
    });
  });

  describe('getSystemPrompt', () => {
    it('should return system prompt with interest', () => {
      const prompt = generator.getSystemPrompt('CHOICE', 'trains');
      expect(prompt).toContain('trains');
    });
  });
});
