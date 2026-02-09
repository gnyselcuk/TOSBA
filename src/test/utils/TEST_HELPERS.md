# Test Helpers Documentation

This document provides comprehensive documentation for the test helper utilities used in component testing.

## Overview

The test helpers provide a unified interface for:
- Rendering components with Zustand store mocking
- Waiting for async operations to complete
- Simulating game interactions
- Checking accessibility compliance

## Helpers

### renderWithProviders

Custom render function that wraps components with necessary providers for testing, including Zustand store state management.

**Signature:**
```typescript
function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions
): RenderResult
```

**Options:**
```typescript
interface RenderWithProvidersOptions extends RenderOptions {
  initialUserState?: Partial<ReturnType<typeof useUserStore.getState>>;
  initialWorkerState?: Partial<ReturnType<typeof useContentWorker.getState>>;
}
```

**Features:**
- Allows mocking initial Zustand store state
- Automatically resets stores on unmount
- Supports all standard React Testing Library render options

**Example:**
```typescript
import { renderWithProviders } from '@/test/utils';

const { container } = renderWithProviders(<MyComponent />, {
  initialUserState: {
    tokens: 100,
    profile: {
      name: 'Test User',
      chronologicalAge: 8,
      interests: ['math'],
      avoidances: [],
      sensoryTriggers: [],
    },
  },
});
```

**Use Cases:**
- Testing components that depend on Zustand stores
- Isolating component tests with specific store states
- Testing component behavior with different user profiles

---

### waitForLoadingToFinish

Waits for all loading states to finish, useful for async operations in components.

**Signature:**
```typescript
async function waitForLoadingToFinish(timeout?: number): Promise<void>
```

**Parameters:**
- `timeout` (optional): Maximum time to wait in milliseconds (default: 3000)

**Features:**
- Automatically detects common loading indicators (loading, please wait, generating, processing)
- Waits for loading indicators to disappear
- Handles cases where no loading indicators are present

**Example:**
```typescript
import { renderWithProviders, waitForLoadingToFinish } from '@/test/utils';

renderWithProviders(<AsyncComponent />);
await waitForLoadingToFinish();
expect(screen.getByText('Content loaded')).toBeInTheDocument();
```

**Use Cases:**
- Testing components with async data fetching
- Waiting for AI content generation
- Testing loading state transitions

---

### simulateGameInteraction

Simulates user interactions with game components across different game templates.

**Signature:**
```typescript
async function simulateGameInteraction(action: GameAction): Promise<void>
```

**Action Types:**
```typescript
type GameAction =
  | { type: 'SELECT_CHOICE'; itemId: string }
  | { type: 'DRAG_ITEM'; itemId: string; targetId: string }
  | { type: 'TAP_ITEM'; itemId: string }
  | { type: 'SPEAK'; text: string }
  | { type: 'CAPTURE_PHOTO' }
  | { type: 'SUBMIT_ANSWER' };
```

**Features:**
- Unified interface for different game interaction types
- Uses @testing-library/user-event for realistic user interactions
- Automatically waits for state updates after interactions

**Examples:**

**Choice Game:**
```typescript
import { renderWithProviders, simulateGameInteraction } from '@/test/utils';

renderWithProviders(<ChoiceGame {...props} />);
await simulateGameInteraction({ type: 'SELECT_CHOICE', itemId: 'item-1' });
expect(screen.getByTestId('selected')).toHaveTextContent('item-1');
```

**Drag and Drop Game:**
```typescript
await simulateGameInteraction({
  type: 'DRAG_ITEM',
  itemId: 'draggable-1',
  targetId: 'dropzone-1',
});
```

**Speaking Game:**
```typescript
await simulateGameInteraction({
  type: 'SPEAK',
  text: 'Hello world',
});
```

**Camera Game:**
```typescript
await simulateGameInteraction({ type: 'CAPTURE_PHOTO' });
```

**Use Cases:**
- Testing game component interactions
- Verifying correct/incorrect answer feedback
- Testing game completion flows

---

### checkAccessibility

Runs automated accessibility checks using jest-axe to verify WCAG compliance.

**Signature:**
```typescript
async function checkAccessibility(container: HTMLElement): Promise<void>
```

**Features:**
- Uses axe-core engine for comprehensive accessibility testing
- Checks for WCAG 2.1 Level A and AA violations
- Provides detailed violation reports

**Example:**
```typescript
import { renderWithProviders, checkAccessibility } from '@/test/utils';

const { container } = renderWithProviders(<MyComponent />);
await checkAccessibility(container);
// Test passes if no violations found
```

**Common Violations Detected:**
- Missing alt text on images
- Missing labels on form inputs
- Insufficient color contrast
- Missing ARIA attributes
- Keyboard navigation issues

**Use Cases:**
- Ensuring components meet accessibility standards
- Testing screen reader compatibility
- Verifying keyboard navigation

---

### checkKeyboardNavigation

Verifies that all interactive elements are keyboard accessible.

**Signature:**
```typescript
function checkKeyboardNavigation(container: HTMLElement): void
```

**Features:**
- Checks all interactive elements (buttons, links, inputs, etc.)
- Verifies elements are visible
- Ensures no elements have tabindex="-1" (unless intentional)

**Example:**
```typescript
import { renderWithProviders, checkKeyboardNavigation } from '@/test/utils';

const { container } = renderWithProviders(<MyComponent />);
checkKeyboardNavigation(container);
```

**Use Cases:**
- Testing keyboard-only navigation
- Ensuring focus management is correct
- Verifying tab order

---

### checkAriaAttributes

Verifies that interactive elements have proper ARIA labels and attributes.

**Signature:**
```typescript
function checkAriaAttributes(container: HTMLElement): void
```

**Features:**
- Checks buttons have labels (aria-label, aria-labelledby, or text content)
- Verifies images have alt attributes
- Ensures proper ARIA attribute usage

**Example:**
```typescript
import { renderWithProviders, checkAriaAttributes } from '@/test/utils';

const { container } = renderWithProviders(<MyComponent />);
checkAriaAttributes(container);
```

**Use Cases:**
- Testing screen reader compatibility
- Verifying proper semantic HTML
- Ensuring accessible labels

---

## Best Practices

### 1. Always Reset Store State

Use `renderWithProviders` to ensure store state is properly managed:

```typescript
// Good
const { unmount } = renderWithProviders(<Component />);
// ... tests ...
unmount(); // Automatically resets stores

// Bad
render(<Component />);
// Store state persists between tests
```

### 2. Wait for Async Operations

Always wait for async operations to complete:

```typescript
// Good
renderWithProviders(<AsyncComponent />);
await waitForLoadingToFinish();
expect(screen.getByText('Loaded')).toBeInTheDocument();

// Bad
renderWithProviders(<AsyncComponent />);
expect(screen.getByText('Loaded')).toBeInTheDocument(); // May fail
```

### 3. Use Realistic Interactions

Use `simulateGameInteraction` for realistic user interactions:

```typescript
// Good
await simulateGameInteraction({ type: 'SELECT_CHOICE', itemId: 'item-1' });

// Bad
fireEvent.click(screen.getByTestId('item-1')); // Less realistic
```

### 4. Test Accessibility

Always include accessibility checks in component tests:

```typescript
it('should be accessible', async () => {
  const { container } = renderWithProviders(<Component />);
  await checkAccessibility(container);
  checkKeyboardNavigation(container);
  checkAriaAttributes(container);
});
```

### 5. Use Test IDs Consistently

Add data-testid attributes to interactive elements for reliable selection:

```typescript
// Component
<button data-testid="submit-button">Submit</button>

// Test
await simulateGameInteraction({ type: 'TAP_ITEM', itemId: 'submit-button' });
```

## Common Patterns

### Testing Component with Store State

```typescript
it('should display user tokens', () => {
  renderWithProviders(<TokenDisplay />, {
    initialUserState: { tokens: 50 },
  });
  
  expect(screen.getByText('Tokens: 50')).toBeInTheDocument();
});
```

### Testing Async Component

```typescript
it('should load and display content', async () => {
  renderWithProviders(<AsyncContent />);
  
  await waitForLoadingToFinish();
  
  expect(screen.getByText('Content loaded')).toBeInTheDocument();
});
```

### Testing Game Interaction Flow

```typescript
it('should complete game on correct answer', async () => {
  const onComplete = vi.fn();
  renderWithProviders(<ChoiceGame onComplete={onComplete} />);
  
  await simulateGameInteraction({ type: 'SELECT_CHOICE', itemId: 'correct-item' });
  
  expect(onComplete).toHaveBeenCalledWith(true);
});
```

### Testing Accessibility

```typescript
it('should meet accessibility standards', async () => {
  const { container } = renderWithProviders(<GameComponent />);
  
  await checkAccessibility(container);
  checkKeyboardNavigation(container);
  checkAriaAttributes(container);
});
```

## Troubleshooting

### Test Fails with "Element not found"

**Problem:** `simulateGameInteraction` can't find the element.

**Solution:** Ensure the element has a `data-testid` attribute matching the `itemId`:

```typescript
// Component
<button data-testid="my-button">Click me</button>

// Test
await simulateGameInteraction({ type: 'TAP_ITEM', itemId: 'my-button' });
```

### Accessibility Test Fails

**Problem:** `checkAccessibility` reports violations.

**Solution:** Review the violation details and fix the component:

```typescript
// Bad
<button>X</button>
<img src="icon.png" />

// Good
<button aria-label="Close">X</button>
<img src="icon.png" alt="Close icon" />
```

### Store State Persists Between Tests

**Problem:** Store state from one test affects another.

**Solution:** Always use `renderWithProviders` and call `unmount()`:

```typescript
it('test 1', () => {
  const { unmount } = renderWithProviders(<Component />);
  // ... test ...
  unmount(); // Resets stores
});
```

### Timeout Waiting for Loading

**Problem:** `waitForLoadingToFinish` times out.

**Solution:** Increase timeout or check if loading indicator text matches expected patterns:

```typescript
// Increase timeout
await waitForLoadingToFinish(5000);

// Or ensure loading text matches patterns: /loading/i, /please wait/i, etc.
```

## Related Documentation

- [Mock Factories](./MOCK_FACTORIES.md) - Creating test data
- [Property Generators](./PROPERTY_GENERATORS.md) - Property-based testing
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [@testing-library/user-event](https://testing-library.com/docs/user-event/intro)
