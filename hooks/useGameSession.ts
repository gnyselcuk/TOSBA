import { useState, useRef, useCallback } from 'react';
import { useUserStore } from '../store/userStore';
import { handleGameEvent } from '../services/contextManager';
import { speakBuddyText } from '../services/geminiService';
import { AppStage, GamePayload, CurriculumModule, Buddy } from '../types';

interface UseGameSessionProps {
    activeModule: CurriculumModule | null;
    buddy: Buddy | null;
    gameData: GamePayload | null;
    TARGET_QUESTIONS: number;
    MAX_MISTAKES_FOR_BREAK: number;
    triggerBreakOffer: () => void;
}

export const useGameSession = ({
    activeModule,
    buddy,
    gameData,
    TARGET_QUESTIONS,
    MAX_MISTAKES_FOR_BREAK,
    triggerBreakOffer
}: UseGameSessionProps) => {
    const { addToken, markModuleComplete, logSessionPerformance, setStage } = useUserStore();

    const [sessionStats, setSessionStats] = useState({
        correctCount: 0,
        mistakeCount: 0,
        consecutiveErrors: 0,
        questionsAnswered: 0,
        startTime: Date.now()
    });

    // Prevent duplicate handleLevelComplete calls
    const isProcessingRef = useRef(false);

    const processModuleCompletion = useCallback((nextCorrect: number, nextAnswered: number, currentMistakes: number) => {
        setSessionStats(prev => ({
            ...prev,
            correctCount: nextCorrect,
            questionsAnswered: nextAnswered,
            consecutiveErrors: 0
        }));

        if (activeModule) {
            markModuleComplete(activeModule.id);
            const duration = (Date.now() - sessionStats.startTime) / 1000;

            let stress: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
            if (currentMistakes >= MAX_MISTAKES_FOR_BREAK) {
                stress = 'HIGH';
            } else if (currentMistakes > 0) {
                stress = 'MEDIUM';
            }

            logSessionPerformance({
                id: `log_${Date.now()}`,
                moduleId: activeModule.id,
                moduleTitle: activeModule.title,
                timestamp: new Date().toISOString(),
                durationSeconds: duration,
                correctCount: nextCorrect,
                mistakeCount: currentMistakes,
                stressLevel: stress
            });
        }

        if (currentMistakes >= MAX_MISTAKES_FOR_BREAK) {
            triggerBreakOffer();
        } else {
            if (buddy) speakBuddyText("Amazing! You finished!", undefined, 'high', 'excited');
            setTimeout(() => setStage(AppStage.CURRICULUM_GENERATION), 3000);
        }
    }, [activeModule, sessionStats.startTime, MAX_MISTAKES_FOR_BREAK, markModuleComplete, logSessionPerformance, triggerBreakOffer, buddy, setStage]);

    const handleSuccess = useCallback(() => {
        addToken();
        const nextCorrect = sessionStats.correctCount + 1;
        const nextAnswered = sessionStats.questionsAnswered + 1;

        handleGameEvent.correctAnswer(nextCorrect);

        // Check break activity
        if (activeModule?.id === 'break_time' || gameData?.isBreak) {
            if (buddy) speakBuddyText("That was fun! Feeling better!", undefined, 'medium', 'happy');
            setTimeout(() => setStage(AppStage.CURRICULUM_GENERATION), 2000);
            return;
        }

        // Single-question modules: OFFLINE_TASK, VERBAL complete after 1 question
        const isSingleQuestionModule = activeModule?.type === 'OFFLINE_TASK'
            || activeModule?.type === 'VERBAL';

        const isModuleComplete = isSingleQuestionModule
            ? nextAnswered >= 1
            : (nextAnswered >= TARGET_QUESTIONS || gameData?.template === 'STORY');

        if (isModuleComplete) {
            processModuleCompletion(nextCorrect, nextAnswered, sessionStats.mistakeCount);
        } else {
            // Move to next question
            setSessionStats(prev => ({
                ...prev,
                correctCount: prev.correctCount + 1,
                questionsAnswered: prev.questionsAnswered + 1,
                consecutiveErrors: 0
            }));

            if (buddy) {
                setTimeout(() => speakBuddyText("Nice!", undefined, 'low', 'happy'), 500);
            }
        }
    }, [
        sessionStats, activeModule, buddy, gameData, TARGET_QUESTIONS,
        addToken, setStage, processModuleCompletion
    ]);

    const handleFailure = useCallback(() => {
        // Update buddy context - child made a mistake
        const newConsecutiveErrors = sessionStats.consecutiveErrors + 1;
        handleGameEvent.wrongAnswer(newConsecutiveErrors);

        const newMistakeCount = sessionStats.mistakeCount + 1;

        setSessionStats(prev => ({
            ...prev,
            mistakeCount: newMistakeCount,
            consecutiveErrors: newConsecutiveErrors
        }));

        if (newMistakeCount >= MAX_MISTAKES_FOR_BREAK) {
            triggerBreakOffer();
        }
    }, [sessionStats, MAX_MISTAKES_FOR_BREAK, triggerBreakOffer]);

    const handleLevelComplete = useCallback((success: boolean) => {
        if (isProcessingRef.current) {
            return;
        }
        isProcessingRef.current = true;

        if (success) {
            handleSuccess();
        } else {
            handleFailure();
        }
    }, [handleSuccess, handleFailure]);

    // Reset processing flag when question changes (should be called by parent effect)
    const resetProcessingFlag = useCallback(() => {
        isProcessingRef.current = false;
    }, []);

    return {
        sessionStats,
        setSessionStats,
        handleLevelComplete,
        resetProcessingFlag
    };
};
