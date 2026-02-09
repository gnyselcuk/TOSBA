import React, { useEffect, useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { speakBuddyText } from '../../services/geminiService';
import { AppStage, GamePayload } from '../../types';
import { handleGameEvent } from '../../services/contextManager';
import BuddyWidget from '../buddy/BuddyWidget';
import StoryBookPlayer from './StoryBookPlayer';
import { DragDropTemplate, TapTrackTemplate, ChoiceTemplate, SpeakingTemplate, TileRevealTemplate, FeedingTemplate, TrackingTemplate, WritingTemplate, FlashcardTemplate } from './GameTemplates';

import { useGamePackLoader } from '../../hooks/useGamePackLoader';
import { useGameSession } from '../../hooks/useGameSession';

const GameArena: React.FC = () => {
    const {
        activeModule,
        setStage,
        returnToPreviousStage,
        buddy,
        moduleContents,
    } = useUserStore();

    const [gameData, setGameData] = useState<GamePayload | null>(null);
    const [showBreakOffer, setShowBreakOffer] = useState(false);

    // --- GAME MANAGER STATE ---
    const TARGET_QUESTIONS = 5;
    const MAX_MISTAKES_FOR_BREAK = 2;

    const triggerBreakOffer = () => {
        setShowBreakOffer(true);
        if (buddy) {
            speakBuddyText("This is tricky! Want a fun break?", undefined, 'high');
        }
    };

    const {
        sessionStats,
        handleLevelComplete,
        resetProcessingFlag
    } = useGameSession({
        activeModule,
        buddy,
        gameData,
        TARGET_QUESTIONS,
        MAX_MISTAKES_FOR_BREAK,
        triggerBreakOffer
    });

    const [waitingTimeout, setWaitingTimeout] = useState<NodeJS.Timeout | null>(null);

    // Custom Hook for Data Loading
    const { questionPack, loading, setLoading } = useGamePackLoader({
        activeModule,
        moduleContents: moduleContents
    });

    // Update buddy context when activity starts
    useEffect(() => {
        if (activeModule) {
            handleGameEvent.activityStart(
                activeModule.type,
                activeModule.title
            );
        }
    }, [activeModule?.id, activeModule?.type, activeModule?.title]);

    // Speak instruction when game data changes
    useEffect(() => {
        if (gameData && buddy && gameData.instruction) {
            const t = setTimeout(() => {
                speakBuddyText(gameData.instruction, buddy.voiceName, 'high');
            }, 500);
            return () => clearTimeout(t);
        }
    }, [gameData?.id, buddy?.voiceName]);

    // 2. Sync Current Question with Progress
    useEffect(() => {
        if (!activeModule) return;

        const currentIndex = sessionStats.questionsAnswered;

        // If finished, stop.
        if (currentIndex >= TARGET_QUESTIONS && gameData?.template !== 'STORY') return;

        // Check if we have the question ready in the pack
        if (currentIndex < questionPack.length) {
            const currentQ = questionPack[currentIndex];

            // Only update if it's different to avoid re-renders
            if (!gameData || gameData.id !== currentQ.id) {
                setGameData(currentQ);
                setLoading(false); // Make sure we aren't stuck in loading
                resetProcessingFlag(); // Reset guard for new question
            } else {
                // Same question, just ensure loading is off
                if (loading) {
                    setLoading(false);
                }
            }

        } else {
            // We need the next question but it's not here yet.
            if (!loading) {
                setLoading(true);

                // SAFETY: If we wait too long (10 seconds), go back to dashboard
                const timeout = setTimeout(() => {
                    if (buddy) {
                        speakBuddyText("Hmm, this is taking too long. Let's go back and try again!", undefined, 'high');
                    }
                    setTimeout(() => setStage(AppStage.CURRICULUM_GENERATION), 2000);
                }, 10000);
                setWaitingTimeout(timeout);
            }
        }

        // Cleanup timeout when we get content
        return () => {
            if (waitingTimeout) {
                clearTimeout(waitingTimeout);
                setWaitingTimeout(null);
            }
        };
    }, [questionPack, sessionStats.questionsAnswered, activeModule, buddy, gameData]);

    // STRATEGY 2: Mola Verelim (Buddy Trigger)
    const handleBreakAccept = () => {
        // Load a hardcoded "Fun" payload
        const BALLOON_IMG = 'https://cdn-icons-png.flaticon.com/512/3014/3014524.png';
        const breakPayload: GamePayload = {
            template: 'TAP_TRACK',
            instruction: "Pop all the balloons!",
            backgroundTheme: "Carnival",
            isBreak: true, // Tag as break so we exit after
            spawnMode: 'FALLING', // Fix: Added missing property
            items: Array.from({ length: 5 }).map((_, i) => ({
                id: `b${i + 1}`,
                name: 'Balloon',
                isCorrect: true,
                imageUrl: BALLOON_IMG
            }))
        };
        setGameData(breakPayload);
        setShowBreakOffer(false);
        if (buddy) speakBuddyText("Yay! Let's pop them!", buddy.voiceName, 'medium', 'excited');
    };

    if (loading || !gameData) {
        return (
            <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center space-y-6 p-4">
                <div className="w-32 h-32 relative">
                    <div className="absolute inset-0 border-8 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-4 flex items-center justify-center text-5xl animate-bounce">
                        🎮
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-indigo-800">
                        {buddy?.name || 'Your friend'} is preparing games!
                    </h2>
                    <p className="text-lg text-indigo-600">
                        {activeModule?.title || 'Fun activities'} coming soon...
                    </p>
                    <p className="text-sm text-indigo-400 animate-pulse">
                        This takes about 45-55 seconds ⏱️
                    </p>
                </div>
                <button
                    onClick={() => setStage(AppStage.CURRICULUM_GENERATION)}
                    className="mt-4 px-8 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl border-2 border-indigo-100"
                >
                    ← Back to Map
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col relative overflow-hidden font-fredoka">
            {/* Header: Game Instruction */}
            <div className="absolute top-0 w-full p-4 z-20 flex justify-between items-start pointer-events-none">
                <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-2xl shadow-lg border border-indigo-100 animate-slide-down pointer-events-auto">
                    <span className="text-2xl mr-2">🎯</span>
                    <span className="font-bold text-slate-800">{gameData.instruction}</span>

                    {/* Progress Indicator */}
                    <div className="ml-4 flex gap-1">
                        {Array.from({
                            length: (activeModule?.type === 'OFFLINE_TASK' || activeModule?.type === 'VERBAL')
                                ? 1
                                : TARGET_QUESTIONS
                        }).map((_, i) => (
                            <div key={i} className={`w-3 h-3 rounded-full ${i < sessionStats.questionsAnswered ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => returnToPreviousStage()}
                    className="bg-red-100 hover:bg-red-200 text-red-600 w-10 h-10 rounded-full flex items-center justify-center font-bold pointer-events-auto shadow-sm"
                >
                    ✕
                </button>
            </div>

            {/* Game Canvas */}
            <div
                key={sessionStats.questionsAnswered} // FORCE RE-RENDER on new question
                className={`flex-1 w-full h-full relative z-10 pt-20 pb-20 p-4 transition-all duration-500 ${showBreakOffer ? 'blur-sm scale-95 opacity-50' : ''}`}
            >
                {gameData.template === 'DRAG_DROP' && (
                    <DragDropTemplate
                        items={gameData.items}
                        targetZone={gameData.targetZone || { label: 'Target' }}
                        slots={gameData.dropSlots || 1}
                        buddyImage={buddy?.imageUrl}
                        onComplete={handleLevelComplete}
                    />
                )}

                {gameData.template === 'TAP_TRACK' && (
                    <TapTrackTemplate
                        items={gameData.items}
                        mode={gameData.spawnMode || 'STATIC'}
                        backgroundUrl={gameData.backgroundImage} // Pass the image directly from payload
                        onComplete={handleLevelComplete}
                    />
                )}

                {gameData.template === 'CHOICE' && (
                    <ChoiceTemplate
                        question={gameData.instruction}
                        items={gameData.items}
                        scenarioText={gameData.scenarioText}
                        // Fallback: If no background set, use the correct item's image match!
                        image={gameData.backgroundImage || gameData.items.find(i => i.isCorrect)?.imageUrl}
                        onComplete={handleLevelComplete}
                    />
                )}

                {gameData.template === 'SPEAKING' && (
                    <SpeakingTemplate
                        targetWord={gameData.targetWord || gameData.items.find(i => i.isCorrect)?.name || 'Hello'}
                        item={gameData.items.find(i => i.isCorrect) || gameData.items[0]}
                        onComplete={handleLevelComplete}
                    />
                )}

                {gameData.template === 'CAMERA' && (
                    <TileRevealTemplate
                        items={gameData.items}
                        onComplete={handleLevelComplete}
                    />
                )}

                {gameData.template === 'FEEDING' && (
                    <FeedingTemplate
                        items={gameData.items}
                        targetZone={gameData.targetZone || { label: 'Hungry Buddy' }}
                        buddyImage={buddy?.imageUrl}
                        onComplete={handleLevelComplete}
                    />
                )}

                {gameData.template === 'TRACKING' && (
                    <TrackingTemplate
                        items={gameData.items}
                        onComplete={handleLevelComplete}
                    />
                )}

                {gameData.template === 'STORY' && gameData.story && (
                    <StoryBookPlayer
                        story={gameData.story}
                        onComplete={() => handleLevelComplete(true)}
                    />
                )}

                {gameData.template === 'WRITING' && (
                    <WritingTemplate
                        targetWord={gameData.targetWord || 'A'}
                        onComplete={handleLevelComplete}
                    />
                )}

                {gameData.template === 'FLASHCARD' && (
                    <FlashcardTemplate
                        items={gameData.items}
                        onComplete={handleLevelComplete}
                    />
                )}
            </div>

            {/* STRATEGY 2: Break Offer Overlay */}
            {
                showBreakOffer && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center transform scale-100 animate-bounce-in relative">
                            {/* Buddy Head Zoom Effect */}
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32">
                                {buddy?.imageUrl && <img src={buddy.imageUrl} className="w-full h-full object-contain drop-shadow-lg" />}
                            </div>

                            <div className="mt-12">
                                <h2 className="text-2xl font-black text-indigo-900 mb-2">Brain Break?</h2>
                                <p className="text-slate-500 mb-6 font-medium">I&apos;m tired! Let&apos;s play a fun game!</p>

                                <div className="space-y-3">
                                    <button
                                        onClick={handleBreakAccept}
                                        className="w-full py-4 bg-green-500 text-white font-black text-xl rounded-2xl shadow-lg hover:bg-green-400 transition-transform active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <span>🎈</span>
                                        <span>Pop Balloons!</span>
                                    </button>
                                    <button
                                        onClick={() => setStage(AppStage.DASHBOARD)}
                                        className="w-full py-3 bg-slate-100 text-slate-400 font-bold rounded-xl hover:bg-slate-200"
                                    >
                                        No, go home
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Buddy Widget - Always there for support/hints */}
            {!showBreakOffer && <BuddyWidget context={gameData.instruction} />}
        </div >
    );
};

export default GameArena;
