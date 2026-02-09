import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChoiceGenerator } from './ChoiceGenerator';
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

describe('ChoiceGenerator', () => {
  let generator: ChoiceGenerator;

  beforeEach(() => {
    generator = new ChoiceGenerator();
    vi.clearAllMocks();
    vi.mocked(imageService.generateAssessmentImage).mockResolvedValue('mock-image-url');
  });

  describe('canHandle', () => {
    it('should handle MATCHING module type', () => {
      expect(generator.canHandle('MATCHING')).toBe(true);
    });

    it('should handle SIGHT_WORDS module type', () => {
      expect(generator.canHandle('SIGHT_WORDS')).toBe(true);
    });

    it('should handle SOCIAL_SIM module type', () => {
      expect(generator.canHandle('SOCIAL_SIM')).toBe(true);
    });

    it('should handle SIGNS module type', () => {
      expect(generator.canHandle('SIGNS')).toBe(true);
    });

    it('should handle SAFETY_SIGNS module type', () => {
      expect(generator.canHandle('SAFETY_SIGNS')).toBe(true);
    });

    it('should handle COMPREHENSION module type', () => {
      expect(generator.canHandle('COMPREHENSION')).toBe(true);
    });

    it('should handle SOCIAL_STORY module type', () => {
      expect(generator.canHandle('SOCIAL_STORY')).toBe(true);
    });

    it('should not handle other module types', () => {
      expect(generator.canHandle('FEEDING')).toBe(false);
    });
  });

  describe('getSystemPrompt', () => {
    it('should generate MATCHING prompt', () => {
      const prompt = generator.getSystemPrompt('MATCHING', 'animals');
      
      expect(prompt).toContain('MATCHING GAME');
      expect(prompt).toContain('animals');
      expect(prompt).toContain('Find the matching');
    });

    it('should generate SIGHT_WORDS prompt', () => {
      const prompt = generator.getSystemPrompt('SIGHT_WORDS', 'apple');
      
      expect(prompt).toContain('SIGHT WORD');
      expect(prompt).toContain('Edmark Style');
      expect(prompt).toContain('APPLE');
    });

    it('should generate SOCIAL_SIM prompt', () => {
      const prompt = generator.getSystemPrompt('SOCIAL_SIM', 'friendship');
      
      expect(prompt).toContain('SOCIAL CHAT');
      expect(prompt).toContain('Polite/Positive Reply');
      expect(prompt).toContain('friendship');
    });

    it('should generate SIGNS prompt', () => {
      const prompt = generator.getSystemPrompt('SIGNS', 'navigation');
      
      expect(prompt).toContain('SIGN READING');
      expect(prompt).toContain('EXIT');
      expect(prompt).toContain('navigation');
    });

    it('should generate SAFETY_SIGNS prompt', () => {
      const prompt = generator.getSystemPrompt('SAFETY_SIGNS', 'safety');
      
      expect(prompt).toContain('SIGN READING');
      expect(prompt).toContain('EXIT');
    });

    it('should generate COMPREHENSION prompt', () => {
      const prompt = generator.getSystemPrompt('COMPREHENSION', 'space');
      
      expect(prompt).toContain('READING COMPREHENSION');
      expect(prompt).toContain('WHY/HOW');
      expect(prompt).toContain('space');
    });

    it('should generate SOCIAL_STORY prompt', () => {
      const prompt = generator.getSystemPrompt('SOCIAL_STORY', 'emotions');
      
      expect(prompt).toContain('SOCIAL STORY');
      expect(prompt).toContain('Emotional Intelligence');
      expect(prompt).toContain('emotions');
    });
  });

  describe('processResponse', () => {
    it('should process MATCHING game with reference image', async () => {
      const mockData = {
        instruction: 'Find the matching cat',
        backgroundTheme: 'Animals',
        items: [
          { id: '1', name: 'Cat', isCorrect: true },
          { id: '2', name: 'Dog', isCorrect: false },
          { id: '3', name: 'Bird', isCorrect: false },
          { id: '4', name: 'Fish', isCorrect: false },
        ],
      };

      const result = await generator.processResponse(mockData, 'MATCHING', 'animals');

      expect(result.template).toBe('CHOICE');
      expect(result.instruction).toBe('Find the matching cat');
      expect(result.items).toHaveLength(4);
      // For MATCHING, backgroundImage should be set to correct item's image
      expect(result.backgroundImage).toBe('mock-image-url');
      expect(imageService.generateAssessmentImage).toHaveBeenCalledTimes(4);
    });

    it('should process SIGHT_WORDS game with reference image', async () => {
      const mockData = {
        instruction: 'Touch the picture of EXIT',
        backgroundTheme: 'Signs',
        items: [
          { id: '1', name: 'Exit Sign', isCorrect: true },
          { id: '2', name: 'Stop Sign', isCorrect: false },
          { id: '3', name: 'Restroom Sign', isCorrect: false },
        ],
      };

      const result = await generator.processResponse(mockData, 'SIGHT_WORDS', 'exit');

      expect(result.template).toBe('CHOICE');
      expect(result.items).toHaveLength(3);
      // For SIGHT_WORDS, backgroundImage should be set
      expect(result.backgroundImage).toBe('mock-image-url');
    });

    it('should process SOCIAL_SIM without reference image', async () => {
      const mockData = {
        instruction: 'How should you reply?',
        backgroundTheme: 'Chat',
        scenarioText: "Buddy: Let's go to the cinema!",
        items: [
          { id: '1', name: 'That sounds fun!', isCorrect: true },
          { id: '2', name: 'I hate movies', isCorrect: false },
          { id: '3', name: 'Whatever', isCorrect: false },
        ],
      };

      const result = await generator.processResponse(mockData, 'SOCIAL_SIM', 'friendship');

      expect(result.template).toBe('CHOICE');
      expect(result.scenarioText).toBe("Buddy: Let's go to the cinema!");
      // For SOCIAL_SIM, backgroundImage should be null (text-based)
      expect(result.backgroundImage).toBeNull();
    });

    it('should process COMPREHENSION without reference image', async () => {
      const mockData = {
        instruction: 'Why did the robot go to the moon?',
        backgroundTheme: 'Story',
        scenarioText: 'The robot went to the moon because he needed cheese.',
        items: [
          { id: '1', name: 'To get cheese', isCorrect: true },
          { id: '2', name: 'To see stars', isCorrect: false },
          { id: '3', name: 'To play', isCorrect: false },
        ],
      };

      const result = await generator.processResponse(mockData, 'COMPREHENSION', 'space');

      expect(result.template).toBe('CHOICE');
      expect(result.scenarioText).toBe('The robot went to the moon because he needed cheese.');
      // For COMPREHENSION, backgroundImage should be null (text-based)
      expect(result.backgroundImage).toBeNull();
    });

    it('should process SOCIAL_STORY without reference image', async () => {
      const mockData = {
        instruction: 'How does the robot feel?',
        backgroundTheme: 'Emotions',
        scenarioText: 'The robot dropped his ice cream.',
        items: [
          { id: '1', name: 'Sad', isCorrect: true },
          { id: '2', name: 'Happy', isCorrect: false },
          { id: '3', name: 'Angry', isCorrect: false },
        ],
      };

      const result = await generator.processResponse(mockData, 'SOCIAL_STORY', 'emotions');

      expect(result.template).toBe('CHOICE');
      expect(result.scenarioText).toBe('The robot dropped his ice cream.');
      // For SOCIAL_STORY, backgroundImage should be null (text-based)
      expect(result.backgroundImage).toBeNull();
    });

    it('should shuffle items', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [
          { id: '1', name: 'Item1', isCorrect: true },
          { id: '2', name: 'Item2', isCorrect: false },
          { id: '3', name: 'Item3', isCorrect: false },
          { id: '4', name: 'Item4', isCorrect: false },
          { id: '5', name: 'Item5', isCorrect: false },
        ],
      };

      const result = await generator.processResponse(mockData, 'MATCHING', 'test');

      expect(result.items).toHaveLength(5);
      // Verify all items are present (order might be different due to shuffle)
      const itemNames = result.items.map(i => i.name);
      expect(itemNames).toContain('Item1');
      expect(itemNames).toContain('Item2');
      expect(itemNames).toContain('Item3');
      expect(itemNames).toContain('Item4');
      expect(itemNames).toContain('Item5');
    });

    it('should include profile context age in image generation', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [
          { id: '1', name: 'Test Item', isCorrect: true },
        ],
      };

      await generator.processResponse(mockData, 'MATCHING', 'test', {
        age: 10,
      });

      const call = vi.mocked(imageService.generateAssessmentImage).mock.calls[0];
      expect(call[1]).toEqual({ age: 10 });
    });

    it('should use default age if not provided', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [
          { id: '1', name: 'Test Item', isCorrect: true },
        ],
      };

      await generator.processResponse(mockData, 'MATCHING', 'test');

      const call = vi.mocked(imageService.generateAssessmentImage).mock.calls[0];
      expect(call[1]).toBeUndefined();
    });

    it('should generate unique IDs for items without IDs', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [
          { name: 'Item1', isCorrect: true },
          { name: 'Item2', isCorrect: false },
        ],
      };

      const result = await generator.processResponse(mockData, 'MATCHING', 'test');

      expect(result.items[0].id).toBeDefined();
      expect(result.items[1].id).toBeDefined();
      expect(result.items[0].id).not.toBe(result.items[1].id);
    });

    it('should preserve existing IDs', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [
          { id: 'custom-1', name: 'Item1', isCorrect: true },
          { id: 'custom-2', name: 'Item2', isCorrect: false },
        ],
      };

      const result = await generator.processResponse(mockData, 'MATCHING', 'test');

      const item1 = result.items.find(i => i.name === 'Item1');
      const item2 = result.items.find(i => i.name === 'Item2');
      
      expect(item1?.id).toBe('custom-1');
      expect(item2?.id).toBe('custom-2');
    });

    it('should generate unique game ID', async () => {
      const mockData = {
        instruction: 'Test',
        backgroundTheme: 'Test',
        items: [
          { id: '1', name: 'Item1', isCorrect: true },
        ],
      };

      const result1 = await generator.processResponse(mockData, 'MATCHING', 'test');
      const result2 = await generator.processResponse(mockData, 'MATCHING', 'test');

      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      expect(result1.id).not.toBe(result2.id);
    });
  });
});
