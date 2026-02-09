# Mock Factories Documentation

## Overview

Mock factories provide a consistent and flexible way to generate test data for the educational companion application. Each factory creates valid instances of domain objects with sensible defaults while supporting partial overrides for test-specific customization.

## Design Principles

1. **Sensible Defaults**: Each factory provides realistic default values that work out of the box
2. **Partial Overrides**: All factories support partial overrides via the `overrides` parameter
3. **Type Safety**: All factories are fully typed using TypeScript interfaces
4. **Consistency**: Related factories use consistent patterns and naming conventions
5. **Flexibility**: Factories can be composed to create complex test scenarios

## Available Factories

### Game Content Factories

#### `createMockGameContent(template, overrides?)`

Creates mock game content (GamePayload) for different game types.

**Parameters:**
- `template`: Game template type ('CHOICE', 'DRAG_DROP', 'SPEAKING', 'CAMERA', 'TRACKING', 'STORY', etc.)
- `overrides`: Optional partial overrides

**Example:**
```typescript
// Create a CHOICE game with defaults
const choiceGame = createMockGameContent('CHOICE');

// Create a DRAG_DROP game with custom instruction
const dragDropGame = createMockGameContent('DRAG_DROP', {
  instruction: 'Sort the animals by size',
  backgroundTheme: 'forest',
});

// Create a SPEAKING game with custom target word
const speakingGame = createMockGameContent('SPEAKING', {
  targetWord: 'elephant',
});
```

### Assessment Factories

#### `createMockAssessmentResult(overrides?)`

Creates a mock assessment question with items.

**Example:**
```typescript
// Create assessment with defaults
const assessment = createMockAssessmentResult();

// Create READING assessment at L3 difficulty
const readingAssessment = createMockAssessmentResult({
  type: 'READING',
  difficulty: 'L3',
  questionText: 'Read the following passage...',
});
```

#### `createMockAssessmentItem(overrides?)`

Creates a single assessment item.

**Example:**
```typescript
// Create item with defaults
const item = createMockAssessmentItem();

// Create custom item
const customItem = createMockAssessmentItem({
  name: 'Red Apple',
  isCorrect: true,
  imageUrl: 'https://example.com/red-apple.jpg',
});
```

### User Profile Factories

#### `createMockUserState(overrides?)`

Creates a mock user profile with developmental information.

**Example:**
```typescript
// Create user with defaults
const user = createMockUserState();

// Create user with specific characteristics
const customUser = createMockUserState({
  name: 'Alex',
  chronologicalAge: 8,
  developmentalAge: 7,
  interests: ['dinosaurs', 'space', 'robots'],
  communicationStyle: 'Verbal',
  assessedLevel: 2,
});
```

#### `createMockBuddy(overrides?)`

Creates a mock buddy companion.

**Example:**
```typescript
// Create buddy with defaults
const buddy = createMockBuddy();

// Create custom buddy
const customBuddy = createMockBuddy({
  name: 'Sparkle',
  personality: 'funny',
  voiceName: 'Zephyr',
});
```

### Curriculum Factories

#### `createMockCurriculum(overrides?)`

Creates a complete curriculum with weekly schedule.

**Example:**
```typescript
// Create curriculum with defaults
const curriculum = createMockCurriculum();

// Create custom curriculum
const customCurriculum = createMockCurriculum({
  branch: 'SchoolAge',
  theme: 'Math Adventures',
  branchTitle: 'Elementary Math Skills',
});
```

#### `createMockCurriculumModule(overrides?)`

Creates a single curriculum module.

**Example:**
```typescript
// Create module with defaults
const module = createMockCurriculumModule();

// Create custom module
const customModule = createMockCurriculumModule({
  title: 'Phonics Practice',
  type: 'PHONICS',
  durationMinutes: 15,
  visualStyle: 'Cartoon',
});
```

### Shop Factories

#### `createMockShopProduct(overrides?)`

Creates a shop product.

**Example:**
```typescript
// Create product with defaults
const product = createMockShopProduct();

// Create custom product
const customProduct = createMockShopProduct({
  name: 'Golden Crown',
  price: 150,
  imageUrl: 'https://example.com/crown.jpg',
});
```

#### `createMockShopScenario(overrides?)`

Creates a complete shop scenario with products and dialogue.

**Example:**
```typescript
// Create scenario with defaults
const scenario = createMockShopScenario();

// Create custom scenario
const customScenario = createMockShopScenario({
  difficulty: 'L3',
  theme: 'Toy Store',
  walletAmount: 100,
  requiredItems: ['teddy bear', 'puzzle'],
});
```

#### `createMockTransaction(overrides?)`

Creates a transaction record.

**Example:**
```typescript
// Create purchase transaction
const purchase = createMockTransaction({
  type: 'purchase',
  amount: 50,
  itemName: 'Blue Hat',
});

// Create earning transaction
const earning = createMockTransaction({
  type: 'earn',
  amount: 25,
  itemName: undefined,
});
```

### Story Factories

#### `createMockStoryBook(overrides?)`

Creates a complete story book with pages.

**Example:**
```typescript
// Create story with defaults
const story = createMockStoryBook();

// Create custom story
const customStory = createMockStoryBook({
  title: 'The Brave Knight',
  interactionMode: 'DECISION_MAKING',
  targetAgeGroup: 'SchoolAge',
  socialLesson: 'Courage and perseverance',
});
```

#### `createMockStoryPage(overrides?)`

Creates a single story page.

**Example:**
```typescript
// Create page with defaults
const page = createMockStoryPage();

// Create custom page with question
const customPage = createMockStoryPage({
  text: 'The dragon appeared from behind the mountain.',
  question: {
    text: 'What did the dragon do?',
    options: [
      { label: 'Roared loudly', isCorrect: true },
      { label: 'Flew away', isCorrect: false },
    ],
  },
});
```

### Game Asset Factories

#### `createMockPuzzleAsset(overrides?)`

Creates a puzzle asset for the scratch reveal game.

**Example:**
```typescript
const puzzle = createMockPuzzleAsset({
  name: 'T-Rex Puzzle',
  theme: 'dinosaurs',
  label: 'Tyrannosaurus Rex',
});
```

#### `createMockBlueprint(overrides?)`

Creates a blueprint for the fusion workshop.

**Example:**
```typescript
const blueprint = createMockBlueprint({
  name: 'Space Rocket',
  interest: 'Space',
  starsPerFusion: 5,
});
```

#### `createMockBlueprintSlot(overrides?)`

Creates a blueprint slot.

**Example:**
```typescript
const slot = createMockBlueprintSlot({
  label: 'Engine',
  requiredItems: 3,
  emoji: '🚀',
});
```

### Activity Tracking Factories

#### `createMockActivityCompletion(overrides?)`

Creates an activity completion record.

**Example:**
```typescript
// Create completion with defaults
const completion = createMockActivityCompletion();

// Create custom completion
const customCompletion = createMockActivityCompletion({
  activityType: 'SPEAKING',
  score: 95,
  timeSpent: 45000, // 45 seconds
  currencyEarned: 15,
});
```

## Usage Patterns

### Basic Usage

```typescript
import { createMockGameContent, createMockUserState } from '@/test/utils';

describe('Game Component', () => {
  it('should render game content', () => {
    const gameContent = createMockGameContent('CHOICE');
    const { getByText } = render(<GameComponent content={gameContent} />);
    
    expect(getByText(gameContent.instruction)).toBeInTheDocument();
  });
});
```

### Composing Factories

```typescript
import { 
  createMockUserState, 
  createMockBuddy, 
  createMockCurriculum 
} from '@/test/utils';

describe('User Dashboard', () => {
  it('should display user information', () => {
    const buddy = createMockBuddy({ name: 'Sparkle' });
    const curriculum = createMockCurriculum({ theme: 'Colors' });
    const user = createMockUserState({
      name: 'Alex',
      chronologicalAge: 6,
    });
    
    const { getByText } = render(
      <Dashboard user={user} buddy={buddy} curriculum={curriculum} />
    );
    
    expect(getByText('Alex')).toBeInTheDocument();
    expect(getByText('Sparkle')).toBeInTheDocument();
  });
});
```

### Testing Edge Cases

```typescript
import { createMockGameContent } from '@/test/utils';

describe('Game Validation', () => {
  it('should handle games with no items', () => {
    const emptyGame = createMockGameContent('CHOICE', {
      items: [],
    });
    
    expect(() => validateGame(emptyGame)).toThrow('Game must have items');
  });
  
  it('should handle games with many items', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
      isCorrect: i === 0,
    }));
    
    const largeGame = createMockGameContent('CHOICE', { items });
    
    expect(validateGame(largeGame)).toBe(true);
  });
});
```

### Integration Testing

```typescript
import { 
  createMockUserState,
  createMockAssessmentResult,
  createMockCurriculum,
} from '@/test/utils';

describe('Assessment to Curriculum Flow', () => {
  it('should generate curriculum based on assessment', () => {
    const user = createMockUserState();
    const assessment = createMockAssessmentResult({
      type: 'MATCHING',
      difficulty: 'L2',
    });
    
    const curriculum = generateCurriculumFromAssessment(user, assessment);
    
    expect(curriculum).toHaveProperty('weeklySchedule');
    expect(curriculum.weeklySchedule.length).toBeGreaterThan(0);
  });
});
```

## Best Practices

1. **Use Defaults First**: Start with default values and only override what's necessary for your test
2. **Be Specific**: When overriding, be explicit about what you're testing
3. **Avoid Over-Mocking**: Don't mock more than you need for the test
4. **Compose Factories**: Build complex scenarios by composing multiple factories
5. **Test Realistic Data**: Use factories to create realistic test scenarios
6. **Document Custom Overrides**: Add comments explaining why specific overrides are needed

## Type Safety

All factories are fully typed and will provide TypeScript autocomplete and type checking:

```typescript
// TypeScript will autocomplete available properties
const game = createMockGameContent('CHOICE', {
  instruction: 'Pick the right answer', // ✓ Valid
  backgroundTheme: 'space', // ✓ Valid
  invalidProp: 'value', // ✗ TypeScript error
});

// TypeScript will enforce valid template types
const game1 = createMockGameContent('CHOICE'); // ✓ Valid
const game2 = createMockGameContent('INVALID'); // ✗ TypeScript error
```

## Extending Factories

To add a new factory:

1. Define the factory function in `mock-factories.ts`
2. Export it from `index.ts`
3. Add tests in `mock-factories.test.ts`
4. Document it in this file

Example:

```typescript
// In mock-factories.ts
export function createMockNewFeature(
  overrides?: Partial<NewFeature>
): NewFeature {
  return {
    id: `test-feature-${Date.now()}`,
    name: 'Default Feature',
    enabled: true,
    ...overrides,
  };
}

// In index.ts
export { createMockNewFeature } from './mock-factories';

// In mock-factories.test.ts
describe('createMockNewFeature', () => {
  it('should create feature with defaults', () => {
    const feature = createMockNewFeature();
    expect(feature).toHaveProperty('id');
    expect(feature.enabled).toBe(true);
  });
});
```

## Related Documentation

- [Property Generators](./PROPERTY_GENERATORS.md) - For property-based testing
- [Render Helpers](./RENDER_HELPERS.md) - For component testing
- [Test Setup](../setup.ts) - Global test configuration
