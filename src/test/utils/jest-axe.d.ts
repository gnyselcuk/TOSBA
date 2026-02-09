// Type declaration for jest-axe matchers
// Extends Vitest's expect with jest-axe matchers

import 'vitest';

declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }

  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): any;
  }
}
