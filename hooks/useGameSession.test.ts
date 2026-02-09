/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameSession } from './useGameSession';
import { useUserStore } from '../store/userStore';
import { handleGameEvent } from '../services/contextManager';
import { speakBuddyText } from '../services/geminiService';
import { AppStage } from '../types';

// Mock dependencies
vi.mock('../store/userStore', () => ({
    useUserStore: vi.fn()
}));

vi.mock('../services/contextManager', () => ({
    handleGameEvent: {
        correctAnswer: vi.fn(),
        wrongAnswer: vi.fn(),
    }
}));

vi.mock('../services/geminiService', () => ({
    speakBuddyText: vi.fn(),
}));

describe('useGameSession', () => {
    // Mock implementations
    const mockAddToken = vi.fn();
    const mockMarkModuleComplete = vi.fn();
    const mockLogSessionPerformance = vi.fn();
    const mockSetStage = vi.fn();
    const mockTriggerBreakOffer = vi.fn();

    // Default Props
    const defaultProps = {
        activeModule: { id: 'mod1', title: 'Test Module' } as any,
        buddy: { name: 'TestBuddy' } as any,
        gameData: { id: 'game1', template: 'CHOICE', isBreak: false } as any,
        TARGET_QUESTIONS: 5,
        MAX_MISTAKES_FOR_BREAK: 3,
        triggerBreakOffer: mockTriggerBreakOffer
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();

        // Setup UserStore Mock
        // Cast useUserStore to any to allow mockReturnValue
        (useUserStore as any).mockReturnValue({
            addToken: mockAddToken,
            markModuleComplete: mockMarkModuleComplete,
            logSessionPerformance: mockLogSessionPerformance,
            setStage: mockSetStage
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should initialize with correct default stats', () => {
        const { result } = renderHook(() => useGameSession(defaultProps));

        expect(result.current.sessionStats).toEqual({
            correctCount: 0,
            mistakeCount: 0,
            consecutiveErrors: 0,
            questionsAnswered: 0,
            startTime: expect.any(Number)
        });
    });

    it('should handle correct answer by incrementing stats and tokens', () => {
        const { result } = renderHook(() => useGameSession(defaultProps));

        act(() => {
            result.current.handleLevelComplete(true);
        });

        expect(mockAddToken).toHaveBeenCalled();
        expect(handleGameEvent.correctAnswer).toHaveBeenCalledWith(1);

        expect(result.current.sessionStats.correctCount).toBe(1);
        expect(result.current.sessionStats.questionsAnswered).toBe(1);

        // Wait for buddy speech delay
        act(() => {
            vi.runAllTimers();
        });
        expect(speakBuddyText).toHaveBeenCalledWith("Nice!", undefined, 'low', 'happy');
    });

    it('should handle wrong answer by incrementing mistake count', () => {
        const { result } = renderHook(() => useGameSession(defaultProps));

        act(() => {
            result.current.handleLevelComplete(false);
        });

        expect(handleGameEvent.wrongAnswer).toHaveBeenCalledWith(1);
        expect(result.current.sessionStats.mistakeCount).toBe(1);
        expect(result.current.sessionStats.consecutiveErrors).toBe(1);
    });

    it('should complete module when questions done', () => {
        const props = { ...defaultProps, TARGET_QUESTIONS: 1 };
        const { result } = renderHook(() => useGameSession(props));

        act(() => {
            result.current.handleLevelComplete(true);
        });

        // Should call completion logic
        expect(mockMarkModuleComplete).toHaveBeenCalledWith('mod1');
        expect(mockLogSessionPerformance).toHaveBeenCalled();
        expect(speakBuddyText).toHaveBeenCalledWith(expect.stringContaining("Amazing"), undefined, 'high', 'excited');

        // Should navigate away after delay
        act(() => {
            vi.runAllTimers();
        });
        expect(mockSetStage).toHaveBeenCalledWith(AppStage.CURRICULUM_GENERATION);
    });

    it('should trigger break offer if too many mistakes', () => {
        const props = { ...defaultProps, MAX_MISTAKES_FOR_BREAK: 2 };
        const { result } = renderHook(() => useGameSession(props));

        // 1st Mistake
        act(() => {
            result.current.handleLevelComplete(false);
        });
        act(() => {
            result.current.resetProcessingFlag();
        });
        expect(mockTriggerBreakOffer).not.toHaveBeenCalled();

        // 2nd Mistake (Limit Reached)
        act(() => {
            result.current.handleLevelComplete(false);
        });
        act(() => {
            result.current.resetProcessingFlag();
        });
        expect(mockTriggerBreakOffer).toHaveBeenCalled();
    });

    it('should handle break activity completion explicitly', () => {
        const props = {
            ...defaultProps,
            activeModule: { id: 'break_time' } as any,
            gameData: { isBreak: true } as any
        };
        const { result } = renderHook(() => useGameSession(props));

        act(() => {
            result.current.handleLevelComplete(true);
        });

        expect(speakBuddyText).toHaveBeenCalledWith(expect.stringContaining("That was fun"), undefined, 'medium', 'happy');

        // Should NOT log performance or mark module complete
        expect(mockMarkModuleComplete).not.toHaveBeenCalled();

        // Immediate cleanup
        act(() => {
            vi.runAllTimers();
        });
        expect(mockSetStage).toHaveBeenCalledWith(AppStage.CURRICULUM_GENERATION);
    });

    it('should prevent duplicate calls via isProcessingRef', () => {
        const { result } = renderHook(() => useGameSession(defaultProps));

        act(() => {
            // Simulate rapid double click
            result.current.handleLevelComplete(true);
            result.current.handleLevelComplete(true);
        });

        expect(mockAddToken).toHaveBeenCalledTimes(1);
    });
});
