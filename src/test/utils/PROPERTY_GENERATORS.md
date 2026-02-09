# Property Generators Documentation

## Overview

This document describes the property-based test generators implemented for the comprehensive testing strategy. These generators create arbitrary, valid test data for property-based testing using the `fast-check` library.

## Implementation Summary

### Task 2.2: Implement PropertyGenerators for property-based testing

**Status:** ✅ Complete

**Requirements Met:**
- ✅ Create arbitrary generators for game content (all types)
- ✅ Create arbitrary generators for assessment data
- ✅ Create arbitrary generators for user state and interactions
- ✅ Create arbitrary generators for curriculum parameters

## Generator Categories

### 1. Game Content Generators (10 generators)

Support all game template types with appropriate fields:

- `arbitraryGameContent(template)` - Generate game payloads for specific templates (CHOICE, DRAG_DROP, SPEAKING, TRACKING, STORY, WRITING, FLASHCARD, CAMERA, FEEDING, TAP_TRACK)
- `arbitraryGameContentAnyTemplate()` - Generate game payloads for any random template
- `arbitraryAssessmentItem()` - Generate assessment items with IDs, names, images, correctness flags
- `arbitraryBackgroundTheme()` - Generate background themes (nature, space, ocean, city, forest, desert, mountains, beach)
- `arbitrarySpawnMode()` - Generate spawn modes (FALLING, FLOATING, STATIC)

**Validates Requirements:** 1.1, 1.2, 1.3, 1.4, 1.6

### 2. Assessment Data Generators (4 generators)

- `arbitraryAssessmentData()` - Generate complete assessment questions with type, difficulty, question text, and items
- `arbitraryAssessmentState()` - Generate assessment state with queue, results, and generation status
- `arbitraryDifficultyLevel()` - Generate difficulty levels (L1, L2, L3)

**Validates Requirements:** 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

### 3. User State & Profile Generators (7 generators)

- `arbitraryUserState()` - Generate complete user profiles with age, interests, avoidances, triggers, communication style
- `arbitraryBuddy()` - Generate buddy companions with name, description, personality, voice
- `arbitraryUserInteraction()` - Generate user interactions (click, keypress, drag, drop, swipe)
- `arbitraryUserPhoto()` - Generate user photos with categories, base64 data, timestamps
- `arbitraryPhotoCategory()` - Generate photo categories (KITCHEN, BEDROOM, FAMILY, OTHER)
- `arbitraryCommunicationStyle()` - Generate communication styles (Verbal, Non-Verbal, Mixed, PECS)

**Validates Requirements:** 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 13.1, 13.2, 13.4

### 4. Curriculum Generators (6 generators)

- `arbitraryCurriculum()` - Generate complete curricula with branch, theme, weekly schedule
- `arbitraryCurriculumModule()` - Generate curriculum modules with type, duration, icon, visual style
- `arbitraryCurriculumParams()` - Generate curriculum parameters (branch, theme, week count)
- `arbitraryModuleType()` - Generate module types (27 different types including MATCHING, PECS, PHONICS, etc.)
- `arbitraryAgeGroup()` - Generate age groups (EarlyChildhood, SchoolAge, Adolescent)
- `arbitraryVisualStyle()` - Generate visual styles (Cartoon, Realistic, Symbolic)

**Validates Requirements:** 8.1, 8.2, 8.3, 8.4, 8.5, 8.6

### 5. Shop & Transaction Generators (4 generators)

- `arbitraryShopProduct()` - Generate shop products with ID, name, price, image
- `arbitraryShopScenario()` - Generate complete shop scenarios with difficulty, theme, products, wallet, dialogue
- `arbitraryTransaction()` - Generate transaction records with type, amount, balances, timestamps
- `arbitraryCurrency()` - Generate currency amounts (0-10000)

**Validates Requirements:** 14.1, 14.2, 14.3, 14.4, 14.5, 14.6

### 6. Story Generators (4 generators)

- `arbitraryStoryBook()` - Generate complete story books with pages, interaction mode, target age group
- `arbitraryStoryPage()` - Generate story pages with text, images, questions, decision points
- `arbitraryStoryInteractionMode()` - Generate interaction modes (READ_ALONG, QUIZ, DECISION_MAKING, LISTEN_ONLY)
- `arbitraryChatMessage()` - Generate chat messages with role and text

**Validates Requirements:** Social story and narrative testing

### 7. Blueprint & Crafting Generators (3 generators)

- `arbitraryBlueprint()` - Generate blueprints with slots, interests, rewards
- `arbitraryBlueprintSlot()` - Generate blueprint slots with labels, required items, emojis
- `arbitraryPuzzleAsset()` - Generate puzzle assets with themes, images, labels

**Validates Requirements:** Fusion workshop and crafting system testing

### 8. Activity Generators (1 generator)

- `arbitraryActivityCompletion()` - Generate activity completion records with scores, time spent, currency earned

**Validates Requirements:** 7.1, 7.2, 7.4 (progress tracking)

### 9. Helper Generators (25 generators)

Utility generators for common data types:

**Numeric Generators:**
- `arbitraryPositiveInt(max)` - Positive integers (1 to max)
- `arbitraryNonNegativeInt(max)` - Non-negative integers (0 to max)
- `arbitraryPercentage()` - Percentages (0-100)
- `arbitraryScore()` - Scores (0-100)
- `arbitraryAge()` - Ages (3-18)
- `arbitraryTimestamp()` - Unix timestamps
- `arbitraryDuration()` - Durations (1s to 5min)

**String Generators:**
- `arbitraryValidUrl()` - Valid HTTP/HTTPS URLs
- `arbitraryNonEmptyString(maxLength)` - Non-empty strings
- `arbitraryBase64Image()` - Base64-encoded image strings
- `arbitraryEmoji()` - Emoji characters
- `arbitraryColor()` - Color names
- `arbitrarySkillArea()` - Skill areas (colors, shapes, letters, numbers, etc.)
- `arbitraryErrorMessage()` - Common error messages
- `arbitrarySuccessMessage()` - Success/encouragement messages

**Complex Type Generators:**
- `arbitraryBoundingBox()` - Bounding boxes [ymin, xmin, ymax, xmax] in 0-1000 scale
- `arbitraryNonEmptyArray(arb, maxLength)` - Non-empty arrays
- `arbitraryStringRecord()` - Objects with string keys
- `arbitraryPersonality()` - Personality types (happy, cool, smart, funny)
- `arbitraryVoiceName()` - Voice names (Puck, Charon, Kore, Fenrir, Zephyr)

## Test Coverage

All generators have been validated with property-based tests in `src/test/property-generators.test.ts`:

- ✅ 28 test suites
- ✅ All tests passing
- ✅ Validates generator output structure
- ✅ Validates data constraints (min/max values, required fields)
- ✅ Validates type correctness

## Usage Examples

### Basic Property Test

```typescript
import fc from 'fast-check';
import { arbitraryGameContent } from './utils/property-generators';

it('Property 1: Schema Compliance', () => {
  fc.assert(
    fc.property(arbitraryGameContent('CHOICE'), (gameContent) => {
      // Test that all game content has required fields
      expect(gameContent.template).toBe('CHOICE');
      expect(gameContent.instruction).toBeTruthy();
      expect(gameContent.items.length).toBeGreaterThan(0);
      return true;
    }),
    { numRuns: 100 } // Run 100 iterations
  );
});
```

### Testing with Multiple Generators

```typescript
import fc from 'fast-check';
import { arbitraryUserState, arbitraryCurriculum } from './utils/property-generators';

it('Property 11: Curriculum Generation from Assessment', () => {
  fc.assert(
    fc.property(
      arbitraryUserState(),
      arbitraryCurriculum(),
      (userState, curriculum) => {
        // Test curriculum alignment with user profile
        const ageGroup = getAgeGroup(userState.chronologicalAge);
        expect(curriculum.branch).toBe(ageGroup);
        return true;
      }
    ),
    { numRuns: 100 }
  );
});
```

### Testing Invariants

```typescript
import fc from 'fast-check';
import { arbitraryTransaction } from './utils/property-generators';

it('Property 63: Currency Precision Preservation', () => {
  fc.assert(
    fc.property(arbitraryTransaction(), (transaction) => {
      // Test that balance calculations are correct
      if (transaction.type === 'purchase') {
        expect(transaction.balanceAfter).toBe(
          transaction.balanceBefore - transaction.amount
        );
      } else {
        expect(transaction.balanceAfter).toBe(
          transaction.balanceBefore + transaction.amount
        );
      }
      return true;
    }),
    { numRuns: 100 }
  );
});
```

## Design Decisions

### 1. Sensible Defaults

All generators use realistic constraints that match the application's business rules:
- Ages: 3-18 years (target demographic for special needs education)
- Currency: 0-10000 (reasonable game economy limits)
- Scores: 0-100 (percentage-based scoring)
- Durations: 1s-5min (typical activity length)
- String lengths: Appropriate for UI display

### 2. Optional Fields

Generators properly handle optional fields using `fc.option()` with `{ nil: undefined }` to match TypeScript's optional field semantics.

### 3. Type Safety

All generators are strongly typed and return `fc.Arbitrary<T>` where T matches the application's type definitions from `types.ts`.

### 4. Composability

Complex generators are built from simpler ones:
- `arbitraryGameContent()` uses `arbitraryAssessmentItem()`
- `arbitraryCurriculum()` uses `arbitraryCurriculumModule()`
- `arbitraryStoryBook()` uses `arbitraryStoryPage()`

### 5. Realistic Data

Generators produce realistic test data:
- Valid URLs (using `fc.webUrl()`)
- Valid UUIDs (using `fc.uuid()`)
- Valid ISO dates (using custom `arbitraryISODate()`)
- Realistic bounding boxes (min < max, within 0-1000 range)

## Integration with Testing Strategy

These generators support the comprehensive testing strategy by enabling:

1. **Property-Based Testing**: Test universal properties across randomly generated inputs
2. **Edge Case Discovery**: Fast-check automatically finds edge cases through shrinking
3. **Regression Prevention**: Reproducible tests with seed values
4. **Coverage Expansion**: Test with thousands of input combinations
5. **Specification Validation**: Verify requirements hold for all valid inputs

## Next Steps

These generators are ready to be used in:

- Task 3.2-3.5: Game generator property tests
- Task 4.2-4.7: AI service property tests
- Task 6.2-6.9: Assessment system property tests
- Task 7.2-7.9: State management property tests
- Task 13.2-13.8: Curriculum builder property tests
- Task 14.2-14.7: Data validation property tests
- Task 20.2-20.11: Shop module property tests

## Maintenance

When adding new types to the application:

1. Add the type definition to `types.ts`
2. Create a corresponding generator in `property-generators.ts`
3. Add tests for the generator in `property-generators.test.ts`
4. Update this documentation

## References

- [fast-check Documentation](https://github.com/dubzzz/fast-check)
- [Property-Based Testing Guide](https://github.com/dubzzz/fast-check/blob/main/documentation/Guides.md)
- Design Document: `.kiro/specs/comprehensive-testing-strategy/design.md`
- Requirements Document: `.kiro/specs/comprehensive-testing-strategy/requirements.md`
