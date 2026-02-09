import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DragDropGenerator } from './DragDropGenerator';
import * as imageService from '../imageService';

// Mock dependencies
vi.mock('../imageService', () => ({
  generateAssessmentImage: vi.fn(),
}));

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

describe('DragDropGenerator', () => {
  let generator: DragDropGenerator;

  beforeEach(() => {
    generator = new DragDropGenerator();
    vi.clearAllMocks();
    vi.mocked(imageService.generateAssessmentImage).mockResolvedValue('mock-image-url');
  });

  describe('canHandle', () => {
    it('should handle FEEDING module type', () => {
      expect(generator.canHandle('FEEDING')).toBe(true);
    });

    it('should handle SENTENCE_TRAIN module type', () => {
      expect(generator.canHandle('SENTENCE_TRAIN')).toBe(true);
    });

    it('should handle MARKET module type', () => {
      expect(generator.canHandle('MARKET')).toBe(true);
    });

    it('should handle SEQUENCING module type', () => {
      expect(generator.canHandle('SEQUENCING')).toBe(true);
    });

    it('should handle RECEPTIVE module type', () => {
      expect(generator.canHandle('RECEPTIVE')).toBe(true);
    });

    it('should not handle other module types', () => {
      expect(generator.canHandle('CHOICE')).toBe(false);
    });
  });

  describe('getSystemPrompt', () => {
    it('should generate FEEDING prompt', () => {
      const prompt = generator.getSystemPrompt('FEEDING', 'fruits', { age: 5 });
      
      expect(prompt).toContain('FEEDING GAME');
      expect(prompt).toContain('5-year-old');
      expect(prompt).toContain('fruits');
      expect(prompt).toContain("Buddy's Mouth");
    });

    it('should generate SENTENCE_TRAIN prompt', () => {
      const prompt = generator.getSystemPrompt('SENTENCE_TRAIN', 'animals', { age: 8 });
      
      expect(prompt).toContain('SENTENCE BUILDER');
      expect(prompt).toContain('8-year-old');
      expect(prompt).toContain('animals');
      expect(prompt).toContain('3 words');
      expect(prompt).toContain('NO "I WANT" sentences');
    });

    it('should generate MARKET prompt with age-appropriate budget', () => {
      const promptYoung = generator.getSystemPrompt('MARKET', 'toys', { age: 7 });
      expect(promptYoung).toContain('10 coins');

      const promptMiddle = generator.getSystemPrompt('MARKET', 'toys', { age: 10 });
      expect(promptMiddle).toContain('20 coins');

      const promptOlder = generator.getSystemPrompt('MARKET', 'toys', { age: 14 });
      expect(promptOlder).toContain('50 coins');
    });

    it('should generate SEQUENCING prompt', () => {
      const prompt = generator.getSystemPrompt('SEQUENCING', 'morning routine', { age: 6 });
      
      expect(prompt).toContain('SEQUENCING GAME');
      expect(prompt).toContain('6-year-old');
      expect(prompt).toContain('morning routine');
      expect(prompt).toContain('Timeline');
    });
  });

  describe('processResponse', () => {
    it('should process FEEDING game response', async () => {
      const mockData = {
        instruction: 'Feed Buddy an apple',
        backgroundTheme: 'Kitchen',
        targetZone: { label: "Buddy's Mouth" },
        items: [
          { id: '1', name: 'Apple', isCorrect: true },
          { id: '2', name: 'Rock', isCorrect: false },
          { id: '3', name: 'Stick', isCorrect: false },
        ],
      };

      const result = await generator.processResponse(mockData, 'FEEDING', 'fruits');

      expect(result.template).toBe('DRAG_DROP');
      expect(result.instruction).toBe('Feed Buddy an apple');
      expect(result.items).toHaveLength(3);
      expect(result.dropSlots).toBe(1);
      expect(result.isOrdered).toBe(false);
      expect(imageService.generateAssessmentImage).toHaveBeenCalledTimes(3);
    });

    it('should process SENTENCE_TRAIN with ordered items', async () => {
      const mockData = {
        instruction: 'Build the sentence',
        backgroundTheme: 'Classroom',
        targetZone: { label: 'Train Wagon' },
        items: [
          { id: '1', name: 'THE', isCorrect: true },
          { id: '2', name: 'CAT', isCorrect: true },
          { id: '3', name: 'SLEEPS', isCorrect: true },
        ],
      };

      const result = await generator.processResponse(mockData, 'SENTENCE_TRAIN', 'animals');

      expect(result.template).toBe('DRAG_DROP');
      expect(result.dropSlots).toBe(3);
      expect(result.isOrdered).toBe(true);
      expect(result.items).toHaveLength(3);
      // Items should NOT be shuffled for SENTENCE_TRAIN
      expect(result.items[0].name).toBe('THE');
      expect(result.items[1].name).toBe('CAT');
      expect(result.items[2].name).toBe('SLEEPS');
    });

    it('should generate text card for articles in SENTENCE_TRAIN', async () => {
      const mockData = {
        instruction: 'Build the sentence',
        backgroundTheme: 'Classroom',
        targetZone: { label: 'Train Wagon' },
        items: [
          { id: '1', name: 'THE', isCorrect: true },
          { id: '2', name: 'DOG', isCorrect: true },
          { id: '3', name: 'RUNS', isCorrect: true },
        ],
      };

      await generator.processResponse(mockData, 'SENTENCE_TRAIN', 'animals');

      // Check that THE was generated with text card prompt
      const firstCall = vi.mocked(imageService.generateAssessmentImage).mock.calls[0];
      expect(firstCall[0]).toContain('text card');
      expect(firstCall[0]).toContain('THE');
    });

    it('should process MARKET game with price tags', async () => {
      const mockData = {
        instruction: 'You have 10 coins. What can you buy?',
        backgroundTheme: 'Store',
        targetZone: { label: 'Shopping Cart' },
        items: [
          { id: '1', name: 'Candy - 5 coins', isCorrect: true },
          { id: '2', name: 'Bike - 50 coins', isCorrect: false },
        ],
      };

      const result = await generator.processResponse(mockData, 'MARKET', 'shopping');

      expect(result.template).toBe('DRAG_DROP');
      expect(result.items).toHaveLength(2);
      
      // Check that price tag was included in image prompt
      const calls = vi.mocked(imageService.generateAssessmentImage).mock.calls;
      expect(calls[0][0]).toContain('price tag');
    });

    it('should process SEQUENCING with ordered items', async () => {
      const mockData = {
        instruction: 'Put the steps in order',
        backgroundTheme: 'Morning',
        targetZone: { label: 'Timeline' },
        items: [
          { id: '1', name: 'Wake up', isCorrect: true },
          { id: '2', name: 'Brush teeth', isCorrect: true },
          { id: '3', name: 'Eat breakfast', isCorrect: true },
        ],
      };

      const result = await generator.processResponse(mockData, 'SEQUENCING', 'morning routine');

      expect(result.template).toBe('DRAG_DROP');
      expect(result.dropSlots).toBe(3);
      expect(result.isOrdered).toBe(true);
      // Items should NOT be shuffled for SEQUENCING
      expect(result.items[0].name).toBe('Wake up');
      expect(result.items[1].name).toBe('Brush teeth');
      expect(result.items[2].name).toBe('Eat breakfast');
    });

    it('should shuffle items for non-ordered games', async () => {
      const mockData = {
        instruction: 'Feed Buddy',
        backgroundTheme: 'Kitchen',
        targetZone: { label: "Buddy's Mouth" },
        items: [
          { id: '1', name: 'Item1', isCorrect: true },
          { id: '2', name: 'Item2', isCorrect: false },
          { id: '3', name: 'Item3', isCorrect: false },
          { id: '4', name: 'Item4', isCorrect: false },
          { id: '5', name: 'Item5', isCorrect: false },
        ],
      };

      const result = await generator.processResponse(mockData, 'FEEDING', 'test');

      expect(result.items).toHaveLength(5);
      // Items should be shuffled (order might be different)
      // We can't test exact order due to randomness, but we can verify all items are present
      const itemNames = result.items.map(i => i.name);
      expect(itemNames).toContain('Item1');
      expect(itemNames).toContain('Item2');
      expect(itemNames).toContain('Item3');
    });

    it('should include profile context age in image generation', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        targetZone: { label: 'Test' },
        items: [
          { id: '1', name: 'Test Item', isCorrect: true },
        ],
      };

      await generator.processResponse(mockData, 'FEEDING', 'test', {
        age: 12,
      });

      const call = vi.mocked(imageService.generateAssessmentImage).mock.calls[0];
      expect(call[1]).toEqual({ age: 12 });
    });

    it('should use default age if not provided', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        targetZone: { label: 'Test' },
        items: [
          { id: '1', name: 'Test Item', isCorrect: true },
        ],
      };

      await generator.processResponse(mockData, 'FEEDING', 'test');

      const call = vi.mocked(imageService.generateAssessmentImage).mock.calls[0];
      expect(call[1]).toEqual({ age: 7 });
    });

    it('should generate unique IDs for items', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        targetZone: { label: 'Test' },
        items: [
          { name: 'Item1', isCorrect: true },
          { name: 'Item2', isCorrect: false },
        ],
      };

      const result = await generator.processResponse(mockData, 'FEEDING', 'test');

      expect(result.items[0].id).toBeDefined();
      expect(result.items[1].id).toBeDefined();
      expect(result.items[0].id).not.toBe(result.items[1].id);
    });
  });
});
