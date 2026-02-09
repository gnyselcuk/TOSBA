/**
 * Context Update Helper
 * 
 * Use this in game/activity components to keep Buddy informed about what's happening
 * without forcing it to interrupt the child.
 * 
 * USAGE EXAMPLE:
 * 
 * ```tsx
 * import { updateBuddyContext } from '../../services/contextManager';
 * 
 * // In your game component
 * const handleCorrectAnswer = () => {
 *   updateBuddyContext({
 *     score: score + 1,
 *     emotion: 'happy',
 *     consecutiveErrors: 0
 *   });
 * };
 * 
 * const handleWrongAnswer = () => {
 *   const newErrors = consecutiveErrors + 1;
 *   updateBuddyContext({
 *     consecutiveErrors: newErrors,
 *     emotion: newErrors >= 3 ? 'frustrated' : 'neutral'
 *   });
 * };
 * 
 * // At critical moments (e.g., boss fight, timed challenge)
 * updateBuddyContext({
 *   isInCriticalMoment: true  // Buddy won't interrupt
 * });
 * ```
 */

import { getGlobalLiveService } from './geminiService';
import type { SessionContext } from './liveService';

/**
 * Update the buddy's awareness of the current session context
 * This does NOT trigger speech - it just informs the buddy
 */
export const updateBuddyContext = (context: Partial<SessionContext>) => {
    const liveService = getGlobalLiveService();
    if (liveService) {
        liveService.updateContext(context);
    }
};

/**
 * Set quiet mode - buddy won't auto-speak
 * Useful during focus activities like reading or puzzle solving
 */
export const setBuddyQuietMode = (quiet: boolean) => {
    const liveService = getGlobalLiveService();
    if (liveService) {
        liveService.setQuietMode(quiet);
    }
};

/**
 * Trigger encouragement from buddy based on context
 */
export const triggerBuddyEncouragement = (type: 'celebrate' | 'help' | 'motivate') => {
    const liveService = getGlobalLiveService();
    if (liveService) {
        liveService.triggerEncouragement(type);
    }
};

/**
 * Smart context update on game events
 */
export const handleGameEvent = {
    /** Child answered correctly */
    correctAnswer: (score: number) => {
        updateBuddyContext({
            score,
            emotion: 'happy',
            consecutiveErrors: 0
        });

        // Celebrate on milestones
        if (score % 5 === 0 && score > 0) {
            triggerBuddyEncouragement('celebrate');
        }
    },

    /** Child answered incorrectly */
    wrongAnswer: (consecutiveErrors: number) => {
        updateBuddyContext({
            consecutiveErrors,
            emotion: consecutiveErrors >= 3 ? 'frustrated' : 'neutral'
        });

        // Offer help after 3 consecutive errors
        if (consecutiveErrors === 3) {
            triggerBuddyEncouragement('help');
        }
    },

    /** Starting a new activity */
    activityStart: (moduleName: string, activityName: string) => {
        updateBuddyContext({
            currentModule: moduleName,
            currentActivity: activityName,
            emotion: 'excited',
            isInCriticalMoment: false
        });
    },

    /** Entering a focus/critical moment (buddy will be quiet) */
    enterFocusMode: () => {
        updateBuddyContext({
            isInCriticalMoment: true
        });
        setBuddyQuietMode(true);
    },

    /** Exiting focus mode */
    exitFocusMode: () => {
        updateBuddyContext({
            isInCriticalMoment: false
        });
        setBuddyQuietMode(false);
    }
};
