import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateProfileAnalysis,
  analyzeHomeworkMaterial,
  generateMemorySummary,
  validateTextContent,
  validateVisualContent,
  detectObjectsInImage,
  verifyImageContent,
  generateColoringPage,
  enhanceSketch,
  generateHiddenImage,
  generateFluencyTask,
  generateWritingTask,
  shuffleArray,
  stopBuddySpeech,
  setGlobalLiveService,
  getGlobalLiveService,
} from './geminiService';
import { ai } from './ai';
import { JudgeService } from './judgeService';

// Mock dependencies
vi.mock('./ai', () => ({
  ai: {
    models: {
      generateContent: vi.fn(),
    },
  },
  TEXT_MODEL: 'gemini-1.5-flash',
  IMAGE_MODEL: 'gemini-2.0-flash-exp',
  TTS_MODEL: 'gemini-2.0-flash-exp',
  parseJSON: vi.fn((text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }),
}));

vi.mock('./judgeService', () => ({
  JudgeService: {
    validateContent: vi.fn(),
    validateImage: vi.fn(),
  },
}));

vi.mock('./imageService', () => ({
  getMockImage: vi.fn((desc: string) => `mock-image-${desc}`),
  removeWhiteBackground: vi.fn((img: string) => img),
}));

vi.mock('./generators/ColoringPageGenerator', () => ({
  coloringPageGenerator: {
    generate: vi.fn(),
  },
}));

vi.mock('./generators/SketchEnhancerGenerator', () => ({
  sketchEnhancerGenerator: {
    enhance: vi.fn(),
  },
}));

vi.mock('./generators/HiddenImageGenerator', () => ({
  hiddenImageGenerator: {
    generate: vi.fn(),
  },
}));

vi.mock('../store/userStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({
      setBuddyStatus: vi.fn(),
    })),
  },
}));

describe('geminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateProfileAnalysis', () => {
    it('should analyze transcript and return user profile', async () => {
      const mockProfile = {
        name: 'Test Child',
        chronologicalAge: 7,
        developmentalAge: 5,
        interests: ['trains', 'music'],
        avoidances: ['loud noises'],
        sensoryTriggers: ['bright lights'],
      };

      vi.mocked(ai.models.generateContent).mockResolvedValue({
        text: JSON.stringify(mockProfile),
        candidates: [],
      });

      const result = await generateProfileAnalysis('Test transcript');

      expect(result).toEqual(mockProfile);
      expect(ai.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-1.5-flash',
          contents: expect.stringContaining('Test transcript'),
        })
      );
    });

    it('should return null on error', async () => {
      vi.mocked(ai.models.generateContent).mockRejectedValue(new Error('API Error'));

      const result = await generateProfileAnalysis('Test transcript');

      expect(result).toBeNull();
    });
  });

  describe('analyzeHomeworkMaterial', () => {
    it('should analyze homework image and return analysis', async () => {
      const mockAnalysis = {
        subject: 'MATH' as const,
        topic: 'Addition',
        difficulty: 'EASY' as const,
        extractedContent: [
          {
            question: '2 + 2',
            answer: '4',
            distractors: ['3', '5', '6'],
            type: 'TEXT' as const,
          },
        ],
        suggestedGameTemplate: 'TAP_TRACK' as const,
        summary: 'Basic addition problems',
      };

      vi.mocked(ai.models.generateContent).mockResolvedValue({
        text: JSON.stringify(mockAnalysis),
        candidates: [],
      });

      const result = await analyzeHomeworkMaterial('base64image');

      expect(result).toEqual(mockAnalysis);
    });

    it('should return null on error', async () => {
      vi.mocked(ai.models.generateContent).mockRejectedValue(new Error('API Error'));

      const result = await analyzeHomeworkMaterial('base64image');

      expect(result).toBeNull();
    });
  });

  describe('generateMemorySummary', () => {
    it('should generate summary from text', async () => {
      vi.mocked(ai.models.generateContent).mockResolvedValue({
        text: 'Summary of interactions',
        candidates: [],
      });

      const result = await generateMemorySummary('Long interaction history');

      expect(result).toBe('Summary of interactions');
    });

    it('should return fallback message on error', async () => {
      vi.mocked(ai.models.generateContent).mockRejectedValue(new Error('API Error'));

      const result = await generateMemorySummary('Long interaction history');

      expect(result).toBe('Summary failed.');
    });
  });

  describe('validateTextContent', () => {
    it('should validate text content using JudgeService', async () => {
      const mockResult = {
        isSafe: true,
        isRelevant: true,
        reason: 'Content is appropriate',
      };

      vi.mocked(JudgeService.validateContent).mockResolvedValue(mockResult);

      const result = await validateTextContent('Test content', 'Profile context', 'Task description');

      expect(result).toEqual(mockResult);
      expect(JudgeService.validateContent).toHaveBeenCalledWith('Test content', {
        profile: 'Profile context',
        task: 'Task description',
      });
    });
  });

  describe('validateVisualContent', () => {
    it('should validate image content using JudgeService', async () => {
      const mockResult = {
        isSafe: true,
        isRelevant: true,
        reason: 'Image is appropriate',
      };

      vi.mocked(JudgeService.validateImage).mockResolvedValue(mockResult);

      const result = await validateVisualContent('base64image', 'Expected content');

      expect(result).toEqual(mockResult);
      expect(JudgeService.validateImage).toHaveBeenCalledWith('base64image', 'Expected content', undefined);
    });
  });

  describe('detectObjectsInImage', () => {
    it('should detect objects in image', async () => {
      const mockObjects = {
        objects: [
          { name: 'apple', box2d: [100, 100, 200, 200], label: 'Apple' },
          { name: 'banana', box2d: [300, 300, 400, 400], label: 'Banana' },
        ],
      };

      vi.mocked(ai.models.generateContent).mockResolvedValue({
        text: JSON.stringify(mockObjects),
        candidates: [],
      });

      const result = await detectObjectsInImage('base64image');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('apple');
    });

    it('should return empty array on error', async () => {
      vi.mocked(ai.models.generateContent).mockRejectedValue(new Error('API Error'));

      const result = await detectObjectsInImage('base64image');

      expect(result).toEqual([]);
    });
  });

  describe('verifyImageContent', () => {
    it('should verify image contains target object', async () => {
      const mockResponse = {
        match: true,
        feedback: 'Great job! I see the apple!',
      };

      vi.mocked(ai.models.generateContent).mockResolvedValue({
        text: JSON.stringify(mockResponse),
        candidates: [],
      });

      const result = await verifyImageContent('base64image', 'apple', 7);

      expect(result.success).toBe(true);
      expect(result.feedback).toBe('Great job! I see the apple!');
    });

    it('should return failure feedback on error', async () => {
      vi.mocked(ai.models.generateContent).mockRejectedValue(new Error('API Error'));

      const result = await verifyImageContent('base64image', 'apple', 7);

      expect(result.success).toBe(false);
      expect(result.feedback).toContain("couldn't quite see");
    });
  });

  describe('Helper Functions', () => {
    it('generateFluencyTask should return default task', async () => {
      const result = await generateFluencyTask('trains');

      expect(result).toEqual({
        sentence: 'I love playing games!',
        emotion: 'Happy',
        instruction: 'Say it!',
      });
    });

    it('generateWritingTask should return default task', async () => {
      const result = await generateWritingTask('snacks');

      expect(result).toEqual({
        scenario: 'Ask for a snack',
        recipient: 'Dad',
        correctParts: ['I', 'want', 'apple'],
        distractors: ['Red', 'Big'],
      });
    });

    it('shuffleArray should shuffle array elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);

      expect(shuffled).toHaveLength(original.length);
      expect(shuffled).toEqual(expect.arrayContaining(original));
      // Original should not be modified
      expect(original).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Global Live Service', () => {
    it('should set and get global live service', () => {
      const mockService = { test: 'service' };

      setGlobalLiveService(mockService);
      const result = getGlobalLiveService();

      expect(result).toBe(mockService);
    });
  });

  describe('stopBuddySpeech', () => {
    it('should stop speech synthesis', () => {
      const mockCancel = vi.fn();
      global.window.speechSynthesis = {
        speaking: true,
        cancel: mockCancel,
      } as unknown as SpeechSynthesis;

      stopBuddySpeech();

      expect(mockCancel).toHaveBeenCalled();
    });
  });
});
