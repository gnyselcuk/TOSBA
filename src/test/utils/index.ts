/**
 * Test utilities index
 * Exports all test helpers, mock factories, and property generators
 */

// Render helpers
export {
  renderWithProviders,
  waitForLoadingToFinish,
  checkAccessibility,
  checkKeyboardNavigation,
  checkAriaAttributes,
  simulateGameInteraction,
  type RenderWithProvidersOptions,
  type GameAction,
} from './render-helpers';

// Mock factories
export {
  createMockGameContent,
  createMockAssessmentResult,
  createMockAssessmentItem,
  createMockUserState,
  createMockBuddy,
  createMockCurriculum,
  createMockCurriculumModule,
  createMockShopProduct,
  createMockTransaction,
  createMockStoryPage,
  createMockStoryBook,
  createMockPuzzleAsset,
  createMockBlueprintSlot,
  createMockBlueprint,
  createMockShopScenario,
  createMockActivityCompletion,
} from './mock-factories';

// Property generators
export {
  arbitraryGameContent,
  arbitraryAssessmentData,
  arbitraryAssessmentItem,
  arbitraryUserState,
  arbitraryBuddy,
  arbitraryCurriculumParams,
  arbitraryCurriculum,
  arbitraryCurriculumModule,
  arbitraryModuleType,
  arbitraryUserInteraction,
  arbitraryTransaction,
  arbitraryActivityCompletion,
  arbitraryValidUrl,
  arbitraryColor,
  arbitrarySkillArea,
} from './property-generators';
