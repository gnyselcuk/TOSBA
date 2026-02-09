/**
 * Property-based test generators using fast-check
 * 
 * This module provides arbitrary generators for property-based testing across the entire application.
 * All generators create valid, random test data that conforms to the application's type system.
 * 
 * ## Usage
 * 
 * ```typescript
 * import fc from 'fast-check';
 * import { arbitraryGameContent, arbitraryUserState } from './property-generators';
 * 
 * // Use in property tests
 * fc.assert(
 *   fc.property(arbitraryGameContent('CHOICE'), (gameContent) => {
 *     // Test universal properties
 *     return gameContent.items.length > 0;
 *   })
 * );
 * ```
 * 
 * ## Available Generators
 * 
 * ### Game Content
 * - `arbitraryGameContent(template)` - Generate game payloads for specific templates
 * - `arbitraryGameContentAnyTemplate()` - Generate game payloads for any template
 * - `arbitraryAssessmentItem()` - Generate assessment items
 * - `arbitraryBackgroundTheme()` - Generate background themes
 * - `arbitrarySpawnMode()` - Generate spawn modes (FALLING, FLOATING, STATIC)
 * 
 * ### Assessment Data
 * - `arbitraryAssessmentData()` - Generate assessment questions
 * - `arbitraryAssessmentState()` - Generate assessment state with queue and results
 * - `arbitraryDifficultyLevel()` - Generate difficulty levels (L1, L2, L3)
 * 
 * ### User State & Profiles
 * - `arbitraryUserState()` - Generate user profiles
 * - `arbitraryBuddy()` - Generate buddy companions
 * - `arbitraryUserInteraction()` - Generate user interactions
 * - `arbitraryUserPhoto()` - Generate user photos
 * - `arbitraryPhotoCategory()` - Generate photo categories
 * - `arbitraryCommunicationStyle()` - Generate communication styles
 * 
 * ### Curriculum
 * - `arbitraryCurriculum()` - Generate complete curricula
 * - `arbitraryCurriculumModule()` - Generate curriculum modules
 * - `arbitraryCurriculumParams()` - Generate curriculum parameters
 * - `arbitraryModuleType()` - Generate module types
 * - `arbitraryAgeGroup()` - Generate age groups (EarlyChildhood, SchoolAge, Adolescent)
 * - `arbitraryVisualStyle()` - Generate visual styles
 * 
 * ### Shop & Transactions
 * - `arbitraryShopProduct()` - Generate shop products
 * - `arbitraryShopScenario()` - Generate shop scenarios
 * - `arbitraryTransaction()` - Generate transactions
 * - `arbitraryCurrency()` - Generate currency amounts
 * 
 * ### Stories
 * - `arbitraryStoryBook()` - Generate story books
 * - `arbitraryStoryPage()` - Generate story pages
 * - `arbitraryStoryInteractionMode()` - Generate story interaction modes
 * - `arbitraryChatMessage()` - Generate chat messages
 * 
 * ### Blueprints & Crafting
 * - `arbitraryBlueprint()` - Generate blueprints
 * - `arbitraryBlueprintSlot()` - Generate blueprint slots
 * - `arbitraryPuzzleAsset()` - Generate puzzle assets
 * 
 * ### Activities
 * - `arbitraryActivityCompletion()` - Generate activity completion records
 * 
 * ### Helper Generators
 * - `arbitraryValidUrl()` - Generate valid URLs
 * - `arbitraryTimestamp()` - Generate timestamps
 * - `arbitraryDuration()` - Generate durations (1s to 5min)
 * - `arbitraryPercentage()` - Generate percentages (0-100)
 * - `arbitraryScore()` - Generate scores (0-100)
 * - `arbitraryAge()` - Generate ages (3-18)
 * - `arbitraryPositiveInt(max)` - Generate positive integers
 * - `arbitraryNonNegativeInt(max)` - Generate non-negative integers
 * - `arbitraryNonEmptyString(maxLength)` - Generate non-empty strings
 * - `arbitraryNonEmptyArray(arb, maxLength)` - Generate non-empty arrays
 * - `arbitraryBase64Image()` - Generate base64 image strings
 * - `arbitraryBoundingBox()` - Generate bounding boxes [ymin, xmin, ymax, xmax]
 * - `arbitraryEmoji()` - Generate emojis
 * - `arbitraryColor()` - Generate color names
 * - `arbitrarySkillArea()` - Generate skill areas
 * - `arbitraryErrorMessage()` - Generate error messages
 * - `arbitrarySuccessMessage()` - Generate success messages
 * - `arbitraryStringRecord()` - Generate objects with string keys
 * - `arbitraryPersonality()` - Generate personality types
 * - `arbitraryVoiceName()` - Generate voice names
 * 
 * ## Configuration
 * 
 * All generators use sensible defaults for min/max values that match the application's
 * business rules and constraints. For example:
 * - Ages: 3-18 years (target demographic)
 * - Currency: 0-10000 (reasonable game economy)
 * - Scores: 0-100 (percentage-based)
 * - Durations: 1s-5min (typical activity length)
 * 
 * ## Requirements Validation
 * 
 * These generators support property-based testing for:
 * - Requirements 1.1-1.6: Game generator testing
 * - Requirements 3.1-3.6: Assessment system testing
 * - Requirements 4.1-4.6: State management testing
 * - Requirements 8.1-8.6: Curriculum builder testing
 * - Requirements 14.1-14.6: Shop module testing
 * 
 * @module property-generators
 */

import fc from 'fast-check';
import type {
  GamePayload,
  AssessmentItem,
  AssessmentQuestion,
  UserProfile,
  Buddy,
  Curriculum,
  CurriculumModule,
  ModuleType,
  BlueprintSlot,
  ShopProduct,
  StoryPage,
  DetectedObject,
} from '../../../types';

// Helper to generate valid ISO date strings
const DATE_MIN_EPOCH = Date.parse('2020-01-01');

const arbitraryISODate = (): fc.Arbitrary<string> => {
  return fc.integer({ min: DATE_MIN_EPOCH, max: Date.parse('2030-12-31') })
    .map(timestamp => new Date(timestamp).toISOString());
};

/**
 * Generate arbitrary assessment item
 */
export function arbitraryAssessmentItem(): fc.Arbitrary<AssessmentItem> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
    isCorrect: fc.boolean(),
    boundingBox: fc.option(
      fc.tuple(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 })
      ) as fc.Arbitrary<[number, number, number, number]>,
      { nil: undefined }
    ),
  });
}

/**
 * Generate arbitrary game content (GamePayload) for property testing
 * Supports all game template types with appropriate fields
 */
export function arbitraryGameContent(
  template: 'DRAG_DROP' | 'TAP_TRACK' | 'CHOICE' | 'SPEAKING' | 'CAMERA' | 'FEEDING' | 'TRACKING' | 'STORY' | 'WRITING' | 'FLASHCARD'
): fc.Arbitrary<GamePayload> {
  const baseFields = {
    id: fc.option(fc.uuid(), { nil: undefined }),
    template: fc.constant(template),
    backgroundTheme: arbitraryBackgroundTheme(),
    backgroundImage: fc.option(fc.webUrl(), { nil: undefined }),
    instruction: fc.string({ minLength: 10, maxLength: 200 }),
    isBreak: fc.option(fc.boolean(), { nil: undefined }),
    items: fc.array(arbitraryAssessmentItem(), { minLength: 1, maxLength: 10 }),
  };

  switch (template) {
    case 'CHOICE':
    case 'FLASHCARD':
      return fc.record({
        ...baseFields,
      });

    case 'DRAG_DROP':
      return fc.record({
        ...baseFields,
        targetZone: fc.option(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 50 }),
            image: fc.option(fc.webUrl(), { nil: undefined }),
          }),
          { nil: undefined }
        ),
        dropSlots: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
        spawnMode: fc.option(arbitrarySpawnMode(), { nil: undefined }),
        isOrdered: fc.option(fc.boolean(), { nil: undefined }),
      });

    case 'SPEAKING':
    case 'CAMERA':
      return fc.record({
        ...baseFields,
        targetWord: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      });

    case 'TRACKING':
      return fc.record({
        ...baseFields,
        spawnMode: fc.option(arbitrarySpawnMode(), { nil: undefined }),
      });

    case 'STORY':
      return fc.record({
        ...baseFields,
        story: fc.option(arbitraryStoryBook(), { nil: undefined }),
        scenarioText: fc.option(fc.string({ minLength: 20, maxLength: 500 }), { nil: undefined }),
      });

    case 'FEEDING':
      return fc.record({
        ...baseFields,
        targetZone: fc.option(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 50 }),
            image: fc.option(fc.webUrl(), { nil: undefined }),
          }),
          { nil: undefined }
        ),
      });

    case 'WRITING':
      return fc.record({
        ...baseFields,
        targetWord: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        scenarioText: fc.option(fc.string({ minLength: 20, maxLength: 200 }), { nil: undefined }),
      });

    default:
      return fc.record(baseFields);
  }
}

/**
 * Generate arbitrary game content for any template type
 */
export function arbitraryGameContentAnyTemplate(): fc.Arbitrary<GamePayload> {
  return fc
    .constantFrom<'DRAG_DROP' | 'TAP_TRACK' | 'CHOICE' | 'SPEAKING' | 'CAMERA' | 'FEEDING' | 'TRACKING' | 'STORY' | 'WRITING' | 'FLASHCARD'>(
      'DRAG_DROP', 'TAP_TRACK', 'CHOICE', 'SPEAKING', 'CAMERA', 'FEEDING', 'TRACKING', 'STORY', 'WRITING', 'FLASHCARD'
    )
    .chain(template => arbitraryGameContent(template));
}

/**
 * Generate arbitrary assessment question
 */
export function arbitraryAssessmentData(): fc.Arbitrary<AssessmentQuestion> {
  return fc.record({
    id: fc.uuid(),
    type: fc.constantFrom('MATCHING', 'READING', 'COMPREHENSION'),
    difficulty: fc.constantFrom('L1', 'L2', 'L3'),
    questionText: fc.string({ minLength: 10, maxLength: 200 }),
    items: fc.array(arbitraryAssessmentItem(), { minLength: 2, maxLength: 10 }),
  });
}

/**
 * Generate arbitrary user state (UserProfile)
 */
export function arbitraryUserState(): fc.Arbitrary<UserProfile> {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    chronologicalAge: fc.integer({ min: 3, max: 18 }),
    developmentalAge: fc.option(fc.integer({ min: 2, max: 18 }), { nil: undefined }),
    interests: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 10 }),
    avoidances: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
    sensoryTriggers: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
    communicationStyle: fc.option(fc.constantFrom('Verbal', 'Non-Verbal', 'Mixed', 'PECS'), { nil: undefined }),
    therapyGoals: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }), { nil: undefined }),
    strengths: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }), { nil: undefined }),
    assessedLevel: fc.option(fc.constantFrom(0, 1, 2, 3), { nil: undefined }),
  });
}

/**
 * Generate arbitrary buddy
 */
export function arbitraryBuddy(): fc.Arbitrary<Buddy> {
  return fc.record({
    name: fc.string({ minLength: 1, maxLength: 20 }),
    description: fc.string({ minLength: 10, maxLength: 100 }),
    imageUrl: fc.webUrl(),
    personality: fc.constantFrom('happy', 'cool', 'smart', 'funny'),
    voiceName: fc.constantFrom('Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'),
  });
}

/**
 * Generate arbitrary module type
 */
export function arbitraryModuleType(): fc.Arbitrary<ModuleType> {
  return fc.constantFrom(
    'MATCHING', 'PECS', 'RECEPTIVE', 'PHONICS', 'SIGHT_WORDS', 'COMPREHENSION',
    'FLUENCY', 'SAFETY_SIGNS', 'SOCIAL_SIM', 'INFORMATIONAL', 'WRITING_SRSD',
    'FEEDING', 'SENTENCE_TRAIN', 'MARKET', 'POP_BALLOON', 'I_SPY', 'SIGNS',
    'VERBAL', 'OFFLINE_TASK', 'PHOTO_HUNT', 'SEQUENCING', 'SOCIAL_STORY',
    'TRACKING', 'DRAG_DROP', 'CHOICE', 'SPEAKING', 'CAMERA'
  );
}

/**
 * Generate arbitrary curriculum module
 */
export function arbitraryCurriculumModule(): fc.Arbitrary<CurriculumModule> {
  return fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 5, maxLength: 50 }),
    description: fc.string({ minLength: 10, maxLength: 200 }),
    type: arbitraryModuleType(),
    durationMinutes: fc.integer({ min: 5, max: 60 }),
    icon: fc.constantFrom('🎨', '📚', '🎮', '🎵', '🏃', '🧩', '🎭', '🔢'),
    visualStyle: fc.constantFrom('Cartoon', 'Realistic', 'Symbolic'),
  });
}

/**
 * Generate arbitrary curriculum parameters
 */
export function arbitraryCurriculumParams(): fc.Arbitrary<{
  branch: 'EarlyChildhood' | 'SchoolAge' | 'Adolescent';
  theme: string;
  weekCount: number;
}> {
  return fc.record({
    branch: fc.constantFrom('EarlyChildhood', 'SchoolAge', 'Adolescent'),
    theme: fc.string({ minLength: 5, maxLength: 50 }),
    weekCount: fc.integer({ min: 1, max: 12 }),
  });
}

/**
 * Generate arbitrary curriculum
 */
export function arbitraryCurriculum(): fc.Arbitrary<Curriculum> {
  return fc.record({
    branch: fc.constantFrom('EarlyChildhood', 'SchoolAge', 'Adolescent'),
    branchTitle: fc.string({ minLength: 5, maxLength: 50 }),
    theme: fc.string({ minLength: 5, maxLength: 50 }),
    weeklySchedule: fc.array(
      fc.record({
        day: fc.constantFrom('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        modules: fc.array(arbitraryCurriculumModule(), { minLength: 1, maxLength: 5 }),
      }),
      { minLength: 1, maxLength: 7 }
    ),
  });
}

/**
 * Generate arbitrary user interaction
 */
export function arbitraryUserInteraction(): fc.Arbitrary<{
  type: string;
  target: string;
  timestamp: string;
  data?: Record<string, unknown>;
}> {
  return fc.record({
    type: fc.constantFrom('click', 'keypress', 'drag', 'drop', 'swipe'),
    target: fc.string({ minLength: 1, maxLength: 50 }),
    timestamp: arbitraryISODate(),
    data: fc.option(fc.object(), { nil: undefined }),
  });
}

/**
 * Generate arbitrary transaction
 */
export function arbitraryTransaction(): fc.Arbitrary<{
  id: string;
  userId: string;
  type: 'purchase' | 'earn';
  amount: number;
  itemId?: string;
  itemName?: string;
  timestamp: string;
  balanceBefore: number;
  balanceAfter: number;
}> {
  return fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    type: fc.constantFrom('purchase', 'earn'),
    amount: fc.integer({ min: 1, max: 1000 }),
    itemId: fc.option(fc.uuid(), { nil: undefined }),
    itemName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    timestamp: arbitraryISODate(),
    balanceBefore: fc.integer({ min: 0, max: 10000 }),
    balanceAfter: fc.integer({ min: 0, max: 10000 }),
  });
}

/**
 * Generate arbitrary activity completion
 */
export function arbitraryActivityCompletion(): fc.Arbitrary<{
  id: string;
  userId: string;
  activityId: string;
  activityType: ModuleType;
  score: number;
  timeSpent: number;
  currencyEarned: number;
  completedAt: string;
}> {
  return fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    activityId: fc.uuid(),
    activityType: arbitraryModuleType(),
    score: fc.integer({ min: 0, max: 100 }),
    timeSpent: fc.integer({ min: 1000, max: 300000 }),
    currencyEarned: fc.integer({ min: 0, max: 100 }),
    completedAt: arbitraryISODate(),
  });
}

/**
 * Generate arbitrary valid URL
 */
export function arbitraryValidUrl(): fc.Arbitrary<string> {
  return fc.webUrl();
}

/**
 * Generate arbitrary color
 */
export function arbitraryColor(): fc.Arbitrary<string> {
  return fc.constantFrom('red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown');
}

/**
 * Generate arbitrary skill area
 */
export function arbitrarySkillArea(): fc.Arbitrary<string> {
  return fc.constantFrom('colors', 'shapes', 'letters', 'numbers', 'animals', 'emotions', 'patterns', 'sizes');
}

/**
 * Generate arbitrary photo category
 */
export function arbitraryPhotoCategory(): fc.Arbitrary<'KITCHEN' | 'BEDROOM' | 'FAMILY' | 'OTHER'> {
  return fc.constantFrom('KITCHEN', 'BEDROOM', 'FAMILY', 'OTHER');
}

/**
 * Generate arbitrary user photo
 */
export function arbitraryUserPhoto(): fc.Arbitrary<{
  id: string;
  category: 'KITCHEN' | 'BEDROOM' | 'FAMILY' | 'OTHER';
  base64: string;
  detectedObjects?: DetectedObject[];
  timestamp: number;
}> {
  return fc.record({
    id: fc.uuid(),
    category: arbitraryPhotoCategory(),
    base64: fc.string({ minLength: 100, maxLength: 200 }).map(s => `data:image/png;base64,${s}`),
    detectedObjects: fc.option(fc.array(fc.object()), { nil: undefined }),
    timestamp: fc.integer({ min: DATE_MIN_EPOCH, max: Date.now() }),
  });
}

/**
 * Generate arbitrary shop product
 */
export function arbitraryShopProduct(): fc.Arbitrary<{
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 30 }),
    price: fc.integer({ min: 1, max: 1000 }),
    imageUrl: fc.webUrl(),
  });
}

/**
 * Generate arbitrary puzzle asset
 */
export function arbitraryPuzzleAsset(): fc.Arbitrary<{
  id: string;
  name: string;
  theme: string;
  imageUrl: string;
  label: string;
  unlockedAt: string;
}> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 30 }),
    theme: fc.constantFrom('animals', 'vehicles', 'nature', 'space', 'ocean'),
    imageUrl: fc.webUrl(),
    label: fc.string({ minLength: 3, maxLength: 30 }),
    unlockedAt: arbitraryISODate(),
  });
}

/**
 * Generate arbitrary blueprint slot
 */
export function arbitraryBlueprintSlot(): fc.Arbitrary<{
  id: string;
  label: string;
  requiredItems: number;
  filledItems: string[];
  emoji: string;
}> {
  return fc.record({
    id: fc.uuid(),
    label: fc.constantFrom('Head', 'Body', 'Arms', 'Legs', 'Accessory'),
    requiredItems: fc.integer({ min: 1, max: 5 }),
    filledItems: fc.array(fc.uuid(), { maxLength: 5 }),
    emoji: fc.constantFrom('🤖', '🚀', '🦖', '🎨', '⚙️', '🔧', '🎯'),
  });
}

/**
 * Generate arbitrary blueprint
 */
export function arbitraryBlueprint(): fc.Arbitrary<{
  id: string;
  name: string;
  interest: string;
  slots: BlueprintSlot[];
  starsPerFusion: number;
  completionReward: string;
  imageUrl?: string;
}> {
  return fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 5, maxLength: 30 }),
    interest: fc.constantFrom('Robots', 'Space', 'Dinosaurs', 'Animals', 'Vehicles'),
    slots: fc.array(arbitraryBlueprintSlot(), { minLength: 2, maxLength: 5 }),
    starsPerFusion: fc.integer({ min: 1, max: 10 }),
    completionReward: fc.string({ minLength: 10, maxLength: 50 }),
    imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
  });
}

/**
 * Generate arbitrary shop scenario
 */
export function arbitraryShopScenario(): fc.Arbitrary<{
  difficulty: 'L1' | 'L2' | 'L3';
  theme: string;
  products: ShopProduct[];
  walletAmount: number;
  requiredItems: string[];
  dialogue: {
    welcome: string;
    success: string;
    failure: string;
  };
}> {
  return fc.record({
    difficulty: fc.constantFrom('L1', 'L2', 'L3'),
    theme: fc.string({ minLength: 5, maxLength: 30 }),
    products: fc.array(arbitraryShopProduct(), { minLength: 2, maxLength: 10 }),
    walletAmount: fc.integer({ min: 0, max: 1000 }),
    requiredItems: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { maxLength: 5 }),
    dialogue: fc.record({
      welcome: fc.string({ minLength: 10, maxLength: 100 }),
      success: fc.string({ minLength: 10, maxLength: 100 }),
      failure: fc.string({ minLength: 10, maxLength: 100 }),
    }),
  });
}

/**
 * Generate arbitrary chat message
 */
export function arbitraryChatMessage(): fc.Arbitrary<{
  role: 'user' | 'model';
  text: string;
}> {
  return fc.record({
    role: fc.constantFrom('user', 'model'),
    text: fc.string({ minLength: 1, maxLength: 500 }),
  });
}

/**
 * Generate arbitrary story page
 */
export function arbitraryStoryPage(): fc.Arbitrary<{
  text: string;
  imageUrl: string;
  audioBase64?: string;
  question?: {
    text: string;
    options: { label: string; isCorrect: boolean }[];
  };
  decisionPoint?: {
    prompt: string;
    choices: { label: string; consequence: string; isOptimal: boolean }[];
  };
}> {
  return fc.record({
    text: fc.string({ minLength: 20, maxLength: 500 }),
    imageUrl: fc.webUrl(),
    audioBase64: fc.option(fc.string({ minLength: 100, maxLength: 200 }), { nil: undefined }),
    question: fc.option(
      fc.record({
        text: fc.string({ minLength: 10, maxLength: 100 }),
        options: fc.array(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 50 }),
            isCorrect: fc.boolean(),
          }),
          { minLength: 2, maxLength: 4 }
        ),
      }),
      { nil: undefined }
    ),
    decisionPoint: fc.option(
      fc.record({
        prompt: fc.string({ minLength: 10, maxLength: 100 }),
        choices: fc.array(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 50 }),
            consequence: fc.string({ minLength: 10, maxLength: 100 }),
            isOptimal: fc.boolean(),
          }),
          { minLength: 2, maxLength: 4 }
        ),
      }),
      { nil: undefined }
    ),
  });
}

/**
 * Generate arbitrary story interaction mode
 */
export function arbitraryStoryInteractionMode(): fc.Arbitrary<'READ_ALONG' | 'QUIZ' | 'DECISION_MAKING' | 'LISTEN_ONLY'> {
  return fc.constantFrom('READ_ALONG', 'QUIZ', 'DECISION_MAKING', 'LISTEN_ONLY');
}

/**
 * Generate arbitrary story book
 */
export function arbitraryStoryBook(): fc.Arbitrary<{
  id: string;
  title: string;
  coverImage?: string;
  pages: StoryPage[];
  date: string;
  interactionMode?: 'READ_ALONG' | 'QUIZ' | 'DECISION_MAKING' | 'LISTEN_ONLY';
  targetAgeGroup?: 'EarlyChildhood' | 'SchoolAge' | 'Adolescent';
  socialLesson?: string;
}> {
  return fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 5, maxLength: 50 }),
    coverImage: fc.option(fc.webUrl(), { nil: undefined }),
    pages: fc.array(arbitraryStoryPage(), { minLength: 1, maxLength: 20 }),
    date: arbitraryISODate(),
    interactionMode: fc.option(arbitraryStoryInteractionMode(), { nil: undefined }),
    targetAgeGroup: fc.option(fc.constantFrom('EarlyChildhood', 'SchoolAge', 'Adolescent'), { nil: undefined }),
    socialLesson: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined }),
  });
}

/**
 * Generate arbitrary assessment state
 */
export function arbitraryAssessmentState(): fc.Arbitrary<{
  queue: AssessmentQuestion[];
  results: { questionId: string; correct: boolean; difficulty: string }[];
  isGenerating: boolean;
}> {
  return fc.record({
    queue: fc.array(arbitraryAssessmentData(), { maxLength: 10 }),
    results: fc.array(
      fc.record({
        questionId: fc.uuid(),
        correct: fc.boolean(),
        difficulty: fc.constantFrom('L1', 'L2', 'L3'),
      }),
      { maxLength: 20 }
    ),
    isGenerating: fc.boolean(),
  });
}

/**
 * Generate arbitrary difficulty level
 */
export function arbitraryDifficultyLevel(): fc.Arbitrary<'L1' | 'L2' | 'L3'> {
  return fc.constantFrom('L1', 'L2', 'L3');
}

/**
 * Generate arbitrary age group
 */
export function arbitraryAgeGroup(): fc.Arbitrary<'EarlyChildhood' | 'SchoolAge' | 'Adolescent'> {
  return fc.constantFrom('EarlyChildhood', 'SchoolAge', 'Adolescent');
}

/**
 * Generate arbitrary visual style
 */
export function arbitraryVisualStyle(): fc.Arbitrary<'Cartoon' | 'Realistic' | 'Symbolic'> {
  return fc.constantFrom('Cartoon', 'Realistic', 'Symbolic');
}

/**
 * Generate arbitrary communication style
 */
export function arbitraryCommunicationStyle(): fc.Arbitrary<'Verbal' | 'Non-Verbal' | 'Mixed' | 'PECS'> {
  return fc.constantFrom('Verbal', 'Non-Verbal', 'Mixed', 'PECS');
}

/**
 * Generate arbitrary personality type
 */
export function arbitraryPersonality(): fc.Arbitrary<'happy' | 'cool' | 'smart' | 'funny'> {
  return fc.constantFrom('happy', 'cool', 'smart', 'funny');
}

/**
 * Generate arbitrary voice name
 */
export function arbitraryVoiceName(): fc.Arbitrary<'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'> {
  return fc.constantFrom('Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr');
}

/**
 * Generate arbitrary spawn mode
 */
export function arbitrarySpawnMode(): fc.Arbitrary<'FALLING' | 'FLOATING' | 'STATIC'> {
  return fc.constantFrom('FALLING', 'FLOATING', 'STATIC');
}

/**
 * Generate arbitrary background theme
 */
export function arbitraryBackgroundTheme(): fc.Arbitrary<string> {
  return fc.constantFrom('nature', 'space', 'ocean', 'city', 'forest', 'desert', 'mountains', 'beach');
}

/**
 * Generate arbitrary positive integer (for IDs, counts, etc.)
 */
export function arbitraryPositiveInt(max: number = 1000): fc.Arbitrary<number> {
  return fc.integer({ min: 1, max });
}

/**
 * Generate arbitrary non-negative integer (for currency, scores, etc.)
 */
export function arbitraryNonNegativeInt(max: number = 10000): fc.Arbitrary<number> {
  return fc.integer({ min: 0, max });
}

/**
 * Generate arbitrary percentage (0-100)
 */
export function arbitraryPercentage(): fc.Arbitrary<number> {
  return fc.integer({ min: 0, max: 100 });
}

/**
 * Generate arbitrary timestamp (milliseconds since epoch)
 */
export function arbitraryTimestamp(): fc.Arbitrary<number> {
  return fc.integer({ min: DATE_MIN_EPOCH, max: Date.now() });
}

/**
 * Generate arbitrary duration in milliseconds (1 second to 5 minutes)
 */
export function arbitraryDuration(): fc.Arbitrary<number> {
  return fc.integer({ min: 1000, max: 300000 });
}

/**
 * Generate arbitrary score (0-100)
 */
export function arbitraryScore(): fc.Arbitrary<number> {
  return fc.integer({ min: 0, max: 100 });
}

/**
 * Generate arbitrary currency amount (0-10000)
 */
export function arbitraryCurrency(): fc.Arbitrary<number> {
  return fc.integer({ min: 0, max: 10000 });
}

/**
 * Generate arbitrary age (3-18 years)
 */
export function arbitraryAge(): fc.Arbitrary<number> {
  return fc.integer({ min: 3, max: 18 });
}

/**
 * Generate arbitrary non-empty string
 */
export function arbitraryNonEmptyString(maxLength: number = 100): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength });
}

/**
 * Generate arbitrary emoji
 */
export function arbitraryEmoji(): fc.Arbitrary<string> {
  return fc.constantFrom('😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴');
}

/**
 * Generate arbitrary base64 image string (simplified for testing)
 */
export function arbitraryBase64Image(): fc.Arbitrary<string> {
  return fc.string({ minLength: 100, maxLength: 200 }).map(s => `data:image/png;base64,${s}`);
}

/**
 * Generate arbitrary bounding box [ymin, xmin, ymax, xmax] in 0-1000 scale
 */
export function arbitraryBoundingBox(): fc.Arbitrary<[number, number, number, number]> {
  return fc.tuple(
    fc.integer({ min: 0, max: 500 }),
    fc.integer({ min: 0, max: 500 }),
    fc.integer({ min: 500, max: 1000 }),
    fc.integer({ min: 500, max: 1000 })
  ) as fc.Arbitrary<[number, number, number, number]>;
}

/**
 * Generate arbitrary array with at least one element
 */
export function arbitraryNonEmptyArray<T>(arb: fc.Arbitrary<T>, maxLength: number = 10): fc.Arbitrary<T[]> {
  return fc.array(arb, { minLength: 1, maxLength });
}

/**
 * Generate arbitrary object with string keys and any values
 */
export function arbitraryStringRecord(): fc.Arbitrary<Record<string, unknown>> {
  return fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.jsonValue());
}

/**
 * Generate arbitrary error message
 */
export function arbitraryErrorMessage(): fc.Arbitrary<string> {
  return fc.constantFrom(
    'Network error',
    'Invalid input',
    'Resource not found',
    'Permission denied',
    'Timeout exceeded',
    'Internal server error',
    'Invalid format',
    'Missing required field'
  );
}

/**
 * Generate arbitrary success message
 */
export function arbitrarySuccessMessage(): fc.Arbitrary<string> {
  return fc.constantFrom(
    'Great job!',
    'Well done!',
    'Excellent!',
    'Perfect!',
    'Amazing!',
    'Fantastic!',
    'You did it!',
    'Keep it up!'
  );
}
