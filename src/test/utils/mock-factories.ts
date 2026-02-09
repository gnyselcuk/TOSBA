/**
 * Mock data factories for testing
 * These factories create consistent test data with sensible defaults
 * and support partial overrides for flexibility
 */

import type { 
  GamePayload,
  AssessmentQuestion,
  AssessmentItem,
  UserProfile,
  Buddy,
  Curriculum,
  CurriculumModule,
  ShopProduct,
  StoryBook,
  StoryPage,
  PuzzleAsset,
  Blueprint,
  BlueprintSlot,
  ShopScenario,
  ModuleType,
} from '../../types';

/**
 * Create mock game content (GamePayload) for testing
 */
export function createMockGameContent(
  template: 'DRAG_DROP' | 'TAP_TRACK' | 'CHOICE' | 'SPEAKING' | 'CAMERA' | 'FEEDING' | 'TRACKING' | 'STORY' | 'WRITING' | 'FLASHCARD' = 'CHOICE',
  overrides?: Partial<GamePayload>
): GamePayload {
  const baseContent: GamePayload = {
    id: `test-game-${Date.now()}`,
    template,
    backgroundTheme: 'nature',
    instruction: 'Complete the activity',
    items: [],
  };

  switch (template) {
    case 'CHOICE':
      return {
        ...baseContent,
        instruction: 'What color is the sky?',
        items: [
          { id: '1', name: 'Blue', imageUrl: 'https://example.com/blue.jpg', isCorrect: true },
          { id: '2', name: 'Green', imageUrl: 'https://example.com/green.jpg', isCorrect: false },
          { id: '3', name: 'Red', imageUrl: 'https://example.com/red.jpg', isCorrect: false },
          { id: '4', name: 'Yellow', imageUrl: 'https://example.com/yellow.jpg', isCorrect: false },
        ],
        ...overrides,
      };
    
    case 'DRAG_DROP':
      return {
        ...baseContent,
        instruction: 'Sort the items into the correct categories',
        targetZone: { label: 'Fruits', image: 'https://example.com/fruit-basket.jpg' },
        dropSlots: 3,
        items: [
          { id: '1', name: 'Apple', imageUrl: 'https://example.com/apple.jpg', isCorrect: true },
          { id: '2', name: 'Carrot', imageUrl: 'https://example.com/carrot.jpg', isCorrect: false },
          { id: '3', name: 'Banana', imageUrl: 'https://example.com/banana.jpg', isCorrect: true },
        ],
        ...overrides,
      };
    
    case 'SPEAKING':
      return {
        ...baseContent,
        instruction: 'Say the word "hello"',
        targetWord: 'hello',
        items: [
          { id: '1', name: 'hello', imageUrl: 'https://example.com/hello.jpg', isCorrect: true },
        ],
        ...overrides,
      };
    
    case 'CAMERA':
      return {
        ...baseContent,
        instruction: 'Take a picture of something blue',
        items: [
          { id: '1', name: 'blue object', imageUrl: '', isCorrect: true },
        ],
        ...overrides,
      };
    
    case 'TRACKING':
      return {
        ...baseContent,
        instruction: 'Follow the moving ball with your eyes',
        spawnMode: 'FLOATING',
        items: [
          { id: '1', name: 'ball', imageUrl: 'https://example.com/ball.jpg', isCorrect: true },
        ],
        ...overrides,
      };

    case 'STORY':
      return {
        ...baseContent,
        instruction: 'Listen to the story',
        story: createMockStoryBook(),
        items: [],
        ...overrides,
      };
    
    default:
      return { ...baseContent, ...overrides };
  }
}

/**
 * Create mock assessment result (AssessmentQuestion) for testing
 */
export function createMockAssessmentResult(
  overrides?: Partial<AssessmentQuestion>
): AssessmentQuestion {
  return {
    id: `test-assessment-${Date.now()}`,
    type: 'MATCHING',
    difficulty: 'L2',
    questionText: 'Match the animals to their homes',
    items: [
      { id: 'q1', name: 'Dog', imageUrl: 'https://example.com/dog.jpg', isCorrect: true },
      { id: 'q2', name: 'Cat', imageUrl: 'https://example.com/cat.jpg', isCorrect: false },
      { id: 'q3', name: 'Bird', imageUrl: 'https://example.com/bird.jpg', isCorrect: false },
    ],
    ...overrides,
  };
}

/**
 * Create mock assessment item for testing
 */
export function createMockAssessmentItem(
  overrides?: Partial<AssessmentItem>
): AssessmentItem {
  return {
    id: `test-item-${Date.now()}`,
    name: 'Test Item',
    imageUrl: 'https://example.com/test-item.jpg',
    isCorrect: true,
    ...overrides,
  };
}

/**
 * Create mock user state (UserProfile) for testing
 */
export function createMockUserState(
  overrides?: Partial<UserProfile>
): UserProfile {
  return {
    name: 'Test Child',
    chronologicalAge: 6,
    developmentalAge: 5,
    interests: ['animals', 'colors', 'shapes'],
    avoidances: ['loud noises'],
    sensoryTriggers: ['bright lights'],
    communicationStyle: 'Verbal',
    therapyGoals: ['improve communication', 'social skills'],
    strengths: ['visual learning', 'pattern recognition'],
    assessedLevel: 1,
    ...overrides,
  };
}

/**
 * Create mock buddy for testing
 */
export function createMockBuddy(
  overrides?: Partial<Buddy>
): Buddy {
  return {
    name: 'Buddy',
    description: 'A friendly and encouraging companion',
    imageUrl: 'https://example.com/buddy-cat.jpg',
    personality: 'happy',
    voiceName: 'Puck',
    ...overrides,
  };
}

/**
 * Create mock curriculum module for testing
 */
export function createMockCurriculumModule(
  overrides?: Partial<CurriculumModule>
): CurriculumModule {
  return {
    id: `test-module-${Date.now()}`,
    title: 'Color Recognition',
    description: 'Learn to identify and name colors',
    type: 'CHOICE',
    durationMinutes: 10,
    icon: '🎨',
    visualStyle: 'Cartoon',
    ...overrides,
  };
}

/**
 * Create mock curriculum for testing
 */
export function createMockCurriculum(
  overrides?: Partial<Curriculum>
): Curriculum {
  return {
    branch: 'EarlyChildhood',
    branchTitle: 'Early Learning Adventures',
    theme: 'Colors and Shapes',
    weeklySchedule: [
      {
        day: 'Monday',
        modules: [
          createMockCurriculumModule({ type: 'CHOICE', title: 'Color Matching' }),
          createMockCurriculumModule({ type: 'DRAG_DROP', title: 'Shape Sorting' }),
        ],
      },
      {
        day: 'Tuesday',
        modules: [
          createMockCurriculumModule({ type: 'SPEAKING', title: 'Name the Colors' }),
          createMockCurriculumModule({ type: 'MATCHING', title: 'Find the Shapes' }),
        ],
      },
    ],
    ...overrides,
  };
}

/**
 * Create mock shop product for testing
 */
export function createMockShopProduct(
  overrides?: Partial<ShopProduct>
): ShopProduct {
  return {
    id: `test-product-${Date.now()}`,
    name: 'Blue Hat',
    price: 50,
    imageUrl: 'https://example.com/blue-hat.jpg',
    ...overrides,
  };
}

/**
 * Create mock transaction for shop testing
 */
export function createMockTransaction(
  overrides?: Partial<{ id: string; userId: string; type: 'purchase' | 'earn'; amount: number; itemId: string; itemName: string; timestamp: string; balanceBefore: number; balanceAfter: number }>
): { id: string; userId: string; type: 'purchase' | 'earn'; amount: number; itemId: string; itemName: string; timestamp: string; balanceBefore: number; balanceAfter: number } {
  return {
    id: `test-transaction-${Date.now()}`,
    userId: 'test-user-1',
    type: 'purchase',
    amount: 50,
    itemId: 'item-1',
    itemName: 'Blue Hat',
    timestamp: new Date().toISOString(),
    balanceBefore: 100,
    balanceAfter: 50,
    ...overrides,
  };
}

/**
 * Create mock story page for testing
 */
export function createMockStoryPage(
  overrides?: Partial<StoryPage>
): StoryPage {
  return {
    text: 'Once upon a time, there was a friendly cat.',
    imageUrl: 'https://example.com/story-page-1.jpg',
    question: {
      text: 'What animal is in the story?',
      options: [
        { label: 'Cat', isCorrect: true },
        { label: 'Dog', isCorrect: false },
        { label: 'Bird', isCorrect: false },
      ],
    },
    ...overrides,
  };
}

/**
 * Create mock story book for testing
 */
export function createMockStoryBook(
  overrides?: Partial<StoryBook>
): StoryBook {
  return {
    id: `test-story-${Date.now()}`,
    title: 'The Friendly Cat',
    coverImage: 'https://example.com/story-cover.jpg',
    pages: [
      createMockStoryPage(),
      createMockStoryPage({ text: 'The cat loved to play with yarn.' }),
      createMockStoryPage({ text: 'One day, the cat made a new friend.' }),
    ],
    date: new Date().toISOString(),
    interactionMode: 'QUIZ',
    targetAgeGroup: 'EarlyChildhood',
    socialLesson: 'Making friends',
    ...overrides,
  };
}

/**
 * Create mock puzzle asset for testing
 */
export function createMockPuzzleAsset(
  overrides?: Partial<PuzzleAsset>
): PuzzleAsset {
  return {
    id: `test-puzzle-${Date.now()}`,
    name: 'Dinosaur Puzzle',
    theme: 'dinosaurs',
    imageUrl: 'https://example.com/dinosaur-puzzle.jpg',
    label: 'T-Rex',
    unlockedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock blueprint slot for testing
 */
export function createMockBlueprintSlot(
  overrides?: Partial<BlueprintSlot>
): BlueprintSlot {
  return {
    id: `test-slot-${Date.now()}`,
    label: 'Head',
    requiredItems: 2,
    filledItems: [],
    emoji: '🤖',
    ...overrides,
  };
}

/**
 * Create mock blueprint for testing
 */
export function createMockBlueprint(
  overrides?: Partial<Blueprint>
): Blueprint {
  return {
    id: `test-blueprint-${Date.now()}`,
    name: 'Giant Mech',
    interest: 'Robots',
    slots: [
      createMockBlueprintSlot({ label: 'Head' }),
      createMockBlueprintSlot({ label: 'Body' }),
      createMockBlueprintSlot({ label: 'Arms' }),
    ],
    starsPerFusion: 3,
    completionReward: 'Unlock special robot animation',
    imageUrl: 'https://example.com/giant-mech.jpg',
    ...overrides,
  };
}

/**
 * Create mock shop scenario for testing
 */
export function createMockShopScenario(
  overrides?: Partial<ShopScenario>
): ShopScenario {
  return {
    difficulty: 'L2',
    theme: 'Summer Ice Cream',
    products: [
      createMockShopProduct({ name: 'Vanilla Ice Cream', price: 10 }),
      createMockShopProduct({ name: 'Chocolate Ice Cream', price: 15 }),
      createMockShopProduct({ name: 'Strawberry Ice Cream', price: 12 }),
    ],
    walletAmount: 50,
    requiredItems: [],
    dialogue: {
      welcome: 'Welcome to the ice cream shop!',
      success: 'Great choice! Enjoy your ice cream!',
      failure: 'Oops! You don\'t have enough money.',
    },
    ...overrides,
  };
}

/**
 * Create mock activity completion for testing
 */
export function createMockActivityCompletion(
  overrides?: Partial<{ id: string; userId: string; activityId: string; activityType: ModuleType; score: number; timeSpent: number; currencyEarned: number; completedAt: string }>
): { id: string; userId: string; activityId: string; activityType: ModuleType; score: number; timeSpent: number; currencyEarned: number; completedAt: string } {
  return {
    id: `test-completion-${Date.now()}`,
    userId: 'test-user-1',
    activityId: 'activity-1',
    activityType: 'CHOICE',
    score: 100,
    timeSpent: 30000,
    currencyEarned: 10,
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}
