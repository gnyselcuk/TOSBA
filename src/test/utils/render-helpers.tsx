import { ReactElement } from 'react';
import { render, RenderOptions, RenderResult, waitFor, screen } from '@testing-library/react';
import { setup as userEventSetup } from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';
import { useUserStore } from '../../../store/userStore';
import { useContentWorker } from '../../../store/contentWorkerStore';

expect.extend(toHaveNoViolations);

/**
 * Options for renderWithProviders
 */
export interface RenderWithProvidersOptions extends RenderOptions {
  /**
   * Initial state for userStore
   */
  initialUserState?: Partial<ReturnType<typeof useUserStore.getState>>;

  /**
   * Initial state for contentWorkerStore
   */
  initialWorkerState?: Partial<ReturnType<typeof useContentWorker.getState>>;
}

/**
 * Custom render function that wraps components with necessary providers
 * for testing (Zustand stores, context providers, etc.)
 * 
 * This helper allows mocking Zustand store state for isolated component testing.
 * 
 * @param ui - React element to render
 * @param options - Render options including initial store states
 * @returns RenderResult with additional cleanup
 * 
 * @example
 * ```tsx
 * const { container } = renderWithProviders(<MyComponent />, {
 *   initialUserState: {
 *     tokens: 100,
 *     profile: { name: 'Test User', interests: ['math'] }
 *   }
 * });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: RenderWithProvidersOptions
): RenderResult {
  const { initialUserState, initialWorkerState, ...renderOptions } = options || {};

  // Set initial store states if provided
  if (initialUserState) {
    const currentState = useUserStore.getState();
    useUserStore.setState({ ...currentState, ...initialUserState });
  }

  if (initialWorkerState) {
    const currentState = useContentWorker.getState();
    useContentWorker.setState({ ...currentState, ...initialWorkerState });
  }

  // Render the component
  const result = render(ui, renderOptions);

  // Return result with cleanup that resets stores
  return {
    ...result,
    unmount: () => {
      result.unmount();
      // Reset stores to initial state after unmount
      useUserStore.getState().reset();
      useContentWorker.setState({
        queue: [],
        isProcessing: false,
        activeTaskId: null,
      });
    },
  };
}

/**
 * Wait for all loading states to finish
 * Useful for async operations in components
 * 
 * This helper waits for:
 * - Loading indicators to disappear
 * - Async state updates to complete
 * - Pending promises to resolve
 * 
 * @param timeout - Maximum time to wait in milliseconds (default: 3000)
 * @returns Promise that resolves when loading is complete
 * 
 * @example
 * ```tsx
 * render(<AsyncComponent />);
 * await waitForLoadingToFinish();
 * expect(screen.getByText('Content loaded')).toBeInTheDocument();
 * ```
 */
export async function waitForLoadingToFinish(timeout: number = 3000): Promise<void> {
  // Wait for common loading indicators to disappear
  const loadingIndicators = [
    /loading/i,
    /please wait/i,
    /generating/i,
    /processing/i,
  ];

  try {
    // Check if any loading indicators are present
    for (const indicator of loadingIndicators) {
      const elements = screen.queryAllByText(indicator);
      if (elements.length > 0) {
        // Wait for them to disappear
        await waitFor(
          () => {
            const stillPresent = screen.queryAllByText(indicator);
            expect(stillPresent.length).toBe(0);
          },
          { timeout }
        );
      }
    }
  } catch {
    // If no loading indicators found or timeout, continue
    // This is not necessarily an error - component might load instantly
  }

  // Wait for any pending promises to resolve
  await waitFor(() => { }, { timeout: 100 });
}

/**
 * Game interaction types
 */
export type GameAction =
  | { type: 'SELECT_CHOICE'; itemId: string }
  | { type: 'DRAG_ITEM'; itemId: string; targetId: string }
  | { type: 'TAP_ITEM'; itemId: string }
  | { type: 'SPEAK'; text: string }
  | { type: 'CAPTURE_PHOTO' }
  | { type: 'SUBMIT_ANSWER' };

/**
 * Simulate user interactions with game components
 * 
 * This helper provides a unified interface for simulating common game interactions
 * across different game templates (Choice, DragDrop, Speaking, etc.)
 * 
 * @param action - The game action to simulate
 * @returns Promise that resolves when the interaction is complete
 * 
 * @example
 * ```tsx
 * // Simulate selecting a choice in a choice game
 * await simulateGameInteraction({ type: 'SELECT_CHOICE', itemId: 'item-1' });
 * 
 * // Simulate drag and drop
 * await simulateGameInteraction({ 
 *   type: 'DRAG_ITEM', 
 *   itemId: 'draggable-1', 
 *   targetId: 'dropzone-1' 
 * });
 * ```
 */
export async function simulateGameInteraction(action: GameAction): Promise<void> {
  const user = userEventSetup();

  switch (action.type) {
    case 'SELECT_CHOICE': {
      // Find and click the choice button/element
      const choiceElement = screen.getByTestId(action.itemId) ||
        screen.getByText(new RegExp(action.itemId, 'i'));
      await user.click(choiceElement);
      break;
    }

    case 'DRAG_ITEM': {
      // Simulate drag and drop interaction
      const draggable = screen.getByTestId(action.itemId);
      const dropzone = screen.getByTestId(action.targetId);

      // Simulate drag start
      await user.pointer([
        { keys: '[MouseLeft>]', target: draggable },
        { coords: { x: 0, y: 0 } },
      ]);

      // Simulate drop
      await user.pointer([
        { target: dropzone },
        { keys: '[/MouseLeft]' },
      ]);
      break;
    }

    case 'TAP_ITEM': {
      // Find and tap/click the item
      const item = screen.getByTestId(action.itemId);
      await user.click(item);
      break;
    }

    case 'SPEAK': {
      // Simulate speech input (for speaking games)
      // In tests, we can trigger the speech recognition mock
      const input = screen.getByRole('textbox', { name: /speak/i }) ||
        screen.getByPlaceholderText(/speak/i);
      await user.type(input, action.text);
      break;
    }

    case 'CAPTURE_PHOTO': {
      // Simulate photo capture button click
      const captureButton = screen.getByRole('button', { name: /capture|take photo/i });
      await user.click(captureButton);
      break;
    }

    case 'SUBMIT_ANSWER': {
      // Submit the current answer
      const submitButton = screen.getByRole('button', { name: /submit|next|continue/i });
      await user.click(submitButton);
      break;
    }

    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unknown game action type: ${(action as { type: string }).type}`);
  }

  // Wait for any state updates to complete
  await waitFor(() => { }, { timeout: 100 });
}

/**
 * Check accessibility violations using jest-axe
 * 
 * This helper runs automated accessibility checks using the axe-core engine
 * to verify WCAG compliance.
 * 
 * @param container - The HTML element to check
 * @returns Promise that resolves with accessibility results
 * 
 * @example
 * ```tsx
 * const { container } = render(<MyComponent />);
 * await checkAccessibility(container);
 * // Test passes if no violations found
 * ```
 */
export async function checkAccessibility(container: HTMLElement): Promise<void> {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}

/**
 * Check keyboard navigation for a component
 * Verifies that all interactive elements are keyboard accessible
 * 
 * @param container - The HTML element to check
 * 
 * @example
 * ```tsx
 * const { container } = render(<MyComponent />);
 * checkKeyboardNavigation(container);
 * ```
 */
export function checkKeyboardNavigation(container: HTMLElement): void {
  const interactiveElements = container.querySelectorAll(
    'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  interactiveElements.forEach((element) => {
    expect(element).toBeVisible();
    expect(element).not.toHaveAttribute('tabindex', '-1');
  });
}

/**
 * Check ARIA attributes for accessibility
 * Verifies that interactive elements have proper ARIA labels
 * 
 * @param container - The HTML element to check
 * 
 * @example
 * ```tsx
 * const { container } = render(<MyComponent />);
 * checkAriaAttributes(container);
 * ```
 */
export function checkAriaAttributes(container: HTMLElement): void {
  const buttons = container.querySelectorAll('button');
  buttons.forEach((button) => {
    const hasLabel =
      button.hasAttribute('aria-label') ||
      button.hasAttribute('aria-labelledby') ||
      (button.textContent?.trim().length ?? 0) > 0;
    expect(hasLabel).toBeTruthy();
  });

  const images = container.querySelectorAll('img');
  images.forEach((img) => {
    expect(img).toHaveAttribute('alt');
  });
}
