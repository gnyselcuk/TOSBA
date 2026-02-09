import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import fc from 'fast-check';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

// Configure fast-check for all property tests
fc.configureGlobal({
  numRuns: 100, // Minimum iterations per property (as per requirements)
  verbose: true, // Show detailed output on failure
  endOnFailure: true, // Stop on first failure
});

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
    cleanup();
});

// Polyfill for AudioContext which is not available in JSDOM
// Only if not already present
if (typeof window.AudioContext === 'undefined') {
    window.AudioContext = vi.fn().mockImplementation(() => ({
        createMediaElementSource: vi.fn(),
        createMediaStreamSource: vi.fn(),
        createOscillator: vi.fn(),
        createGain: vi.fn(),
        decodeAudioData: vi.fn(),
        close: vi.fn(),
        resume: vi.fn(),
        suspend: vi.fn(),
    })) as any;
}

// Mock IndexedDB for testing
if (typeof window.indexedDB === 'undefined') {
    const { IDBFactory } = await import('fake-indexeddb');
    window.indexedDB = new IDBFactory() as any;
}

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
})) as any;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
})) as any;

