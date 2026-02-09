import React, { useState, useEffect, useRef, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { StoryBook } from '../../types';
import { useUserStore } from '../../store/userStore';
import { speakBuddyText, stopBuddySpeech } from '../../services/geminiService';
import { GeminiLiveService } from '../../services/liveService';
import { ChevronRight, ChevronLeft, CheckCircle, Sparkles, Star, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface StoryBookPlayerProps {
    story: StoryBook;
    onComplete: () => void;
}

// Helper functions to reduce cognitive complexity
const getReadButtonClassName = (isReading: boolean, isListeningToChild: boolean) => {
    if (isReading) {
        return 'bg-indigo-400 text-white';
    }
    if (isListeningToChild) {
        return 'bg-slate-200 text-slate-400 cursor-not-allowed';
    }
    return 'bg-indigo-500 text-white hover:bg-indigo-600 active:scale-95';
};

const getMyTurnButtonClassName = (isListeningToChild: boolean, isReading: boolean) => {
    if (isListeningToChild) {
        return 'bg-red-500 text-white';
    }
    if (isReading) {
        return 'bg-slate-200 text-slate-400 cursor-not-allowed';
    }
    return 'bg-green-500 text-white hover:bg-green-600 active:scale-95';
};

const StoryBookPlayer: React.FC<StoryBookPlayerProps> = ({ story, onComplete }) => {
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [isReading, setIsReading] = useState(false);
    const { buddy, profile } = useUserStore();
    const flipBookRef = useRef<HTMLElement | null>(null);

    // Read Along Mode State
    const [isListeningToChild, setIsListeningToChild] = useState(false);
    const [matchedWordIndices, setMatchedWordIndices] = useState<Set<number>>(new Set());
    const [showConfetti, setShowConfetti] = useState(false);

    // Quiz & Decision Point State (for SchoolAge and Adolescent)
    const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
    const [selectedDecisions, setSelectedDecisions] = useState<Record<number, number>>({});
    const [showQuizFeedback, setShowQuizFeedback] = useState<{ pageIdx: number; correct: boolean } | null>(null);

    // Determine interaction mode from story
    const interactionMode = story.interactionMode || 'READ_ALONG';

    const liveServiceRef = useRef<GeminiLiveService | null>(null);
    const recognizedTextRef = useRef<string>('');

    // Calculate current story page (accounting for cover at index 0)
    const storyPageIndex = Math.max(0, currentPageIndex - 1);
    const currentPage = story.pages[storyPageIndex];
    const isOnCover = currentPageIndex === 0;
    const isLastPage = storyPageIndex >= story.pages.length - 1 && !isOnCover;

    // Get words from current page
    const getWords = useCallback(() => {
        if (!currentPage?.text) return [];
        return currentPage.text.split(/\s+/).filter(w => w.length > 0);
    }, [currentPage]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopBuddySpeech();
            liveServiceRef.current?.disconnect();
        };
    }, []);

    // Reset matched words when page changes
    useEffect(() => {
        setMatchedWordIndices(new Set());
        setIsListeningToChild(false);
        setShowConfetti(false);
        recognizedTextRef.current = '';
    }, [currentPageIndex]);

    // Buddy reads the page (simple, no karaoke)
    const handleBuddyRead = async () => {
        if (!currentPage?.text || isReading) return;

        setIsReading(true);
        await speakBuddyText(currentPage.text, buddy?.voiceName);
        setIsReading(false);
    };

    // Match spoken words with text (simplified)
    const matchSpokenWords = useCallback((spokenText: string) => {
        const words = getWords();
        const spokenWords = spokenText.toLowerCase().split(/\s+/);

        const newMatched = new Set(matchedWordIndices);

        // Find which words match
        for (let i = 0; i < words.length; i++) {
            const cleanWord = words[i].toLowerCase().replace(/[^a-zA-Z0-9]/g, '');

            for (const spoken of spokenWords) {
                const cleanSpoken = spoken.replace(/[^a-zA-Z0-9]/g, '');

                // Fuzzy match - allow minor pronunciation errors
                if (cleanWord === cleanSpoken ||
                    (cleanWord.length > 3 && cleanSpoken.length > 3 &&
                        (cleanWord.includes(cleanSpoken) || cleanSpoken.includes(cleanWord)))) {
                    newMatched.add(i);
                }
            }
        }

        setMatchedWordIndices(newMatched);

        // Check if all words matched
        if (newMatched.size >= words.length * 0.75) { // 75% threshold
            handleReadingComplete();
        }
    }, [getWords, matchedWordIndices]);

    // Start listening to child's reading
    const startReadAlong = async () => {
        if (!currentPage?.text) return;

        // First, Buddy encourages the child
        await speakBuddyText("Now it's your turn! I'm listening.", buddy?.voiceName);

        setIsListeningToChild(true);
        setMatchedWordIndices(new Set());
        recognizedTextRef.current = '';

        // Initialize Live API for speech recognition
        try {
            liveServiceRef.current = new GeminiLiveService((text, isUser) => {
                if (isUser && text) {
                    recognizedTextRef.current += ' ' + text;
                    matchSpokenWords(recognizedTextRef.current);
                }
            });

            const systemPrompt = `
                You are helping a child practice reading aloud.
                The child will read: "${currentPage.text}"
                
                IMPORTANT: 
                - Just transcribe what the child says
                - Do NOT respond or speak back
                - Only listen and transcribe
                - Be lenient with pronunciation errors
            `;

            await liveServiceRef.current.connect(systemPrompt, buddy?.voiceName || 'Puck', false);
        } catch (e) {
            console.error('Failed to start listening:', e);
            setIsListeningToChild(false);
            speakBuddyText("Oops! I couldn't connect to the microphone. Try again!", buddy?.voiceName);
        }
    };

    // Stop listening
    const stopReadAlong = () => {
        setIsListeningToChild(false);
        liveServiceRef.current?.disconnect();
        liveServiceRef.current = null;
    };

    // Handle successful reading completion
    const handleReadingComplete = async () => {
        stopReadAlong();
        setShowConfetti(true);

        await speakBuddyText("Amazing! You read that so well! 🎉", buddy?.voiceName);

        setTimeout(() => {
            setShowConfetti(false);
        }, 3000);
    };

    const handleFlip = (e: { data: number }) => {
        setCurrentPageIndex(e.data);
        stopBuddySpeech();
        stopReadAlong();
        setIsReading(false);
    };

    const handleReadToMe = async () => {
        if (!currentPage?.text) return;

        if (isReading) {
            stopBuddySpeech();
            setIsReading(false);
        } else {
            await handleBuddyRead();
        }
    };

    const toggleReadAlong = () => {
        if (isListeningToChild) {
            stopReadAlong();
        } else {
            startReadAlong();
        }
    };

    const handleFinish = () => {
        stopBuddySpeech();
        stopReadAlong();
        onComplete();
    };

    const goToNextPage = () => {
        if (flipBookRef.current) {
            flipBookRef.current.pageFlip().flipNext();
        }
    };

    // Quiz Handler (SchoolAge mode)
    const handleQuizAnswer = async (pageIdx: number, optionIdx: number, isCorrect: boolean) => {
        if (answeredQuestions.has(pageIdx)) return;

        setAnsweredQuestions(prev => new Set([...prev, pageIdx]));
        setShowQuizFeedback({ pageIdx, correct: isCorrect });

        if (isCorrect) {
            setShowConfetti(true);
            await speakBuddyText("Great job! That's correct! 🌟", buddy?.voiceName);
            setTimeout(() => setShowConfetti(false), 3000);
        } else {
            await speakBuddyText("Not quite. Let's try again next time!", buddy?.voiceName);
        }

        // Auto-flip to next page after feedback
        setTimeout(() => {
            setShowQuizFeedback(null);
            goToNextPage();
        }, 2500);
    };

    // Decision Point Handler (Adolescent mode)
    const handleDecision = async (pageIdx: number, choiceIdx: number, isOptimal: boolean, consequence: string) => {
        if (selectedDecisions[pageIdx] !== undefined) return;

        setSelectedDecisions(prev => ({ ...prev, [pageIdx]: choiceIdx }));

        // Show consequence feedback
        if (isOptimal) {
            await speakBuddyText(`Good choice! ${consequence}`, buddy?.voiceName);
        } else {
            await speakBuddyText(`Interesting choice. ${consequence}`, buddy?.voiceName);
        }

        // Wait before allowing next page flip
        setTimeout(() => {
            goToNextPage();
        }, 3000);
    };

    const goToPrevPage = () => {
        if (flipBookRef.current) {
            flipBookRef.current.pageFlip().flipPrev();
        }
    };

    // Render text with simple word highlighting (only for matched words)
    const renderHighlightedText = () => {
        if (!currentPage?.text) return null;

        const words = getWords();

        return (
            <p className="text-base md:text-lg font-bold leading-relaxed text-slate-800 text-center">
                {words.map((word, index) => {
                    // Simple highlighting: only show matched words
                    const isMatched = matchedWordIndices.has(index);
                    
                    return (
                        <span 
                            key={index} 
                            className={`inline-block mx-0.5 px-1 rounded transition-all duration-200 ${
                                isMatched 
                                    ? 'bg-green-400 text-white' 
                                    : 'text-slate-800'
                            }`}
                        >
                            {word}
                        </span>
                    );
                })}
            </p>
        );
    };

    return (
        <div className="w-full h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 overflow-hidden relative">

            {/* Confetti Celebration */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none z-50">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-confetti text-2xl"
                            style={{
                                /* eslint-disable sonarjs/pseudo-random */
                                left: `${Math.random() * 100}%`,
                                top: '-20px',
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${2 + Math.random()}s`
                                /* eslint-enable sonarjs/pseudo-random */
                            }}
                        >
                            {/* eslint-disable-next-line sonarjs/pseudo-random */}
                            {['🎉', '⭐', '✨'][Math.floor(Math.random() * 3)]}
                        </div>
                    ))}
                </div>
            )}

            {/* Story Title */}
            <div className="py-2 px-4">
                <h1 className="text-xl md:text-2xl font-black text-indigo-600 flex items-center gap-2">
                    <Sparkles size={20} className="text-yellow-500" />
                    {story.title}
                    <Sparkles size={20} className="text-yellow-500" />
                </h1>
            </div>

            {/* The Flipbook */}
            <div className="flex-1 flex items-center justify-center w-full px-4 min-h-0">
                <HTMLFlipBook
                    ref={flipBookRef as React.RefObject<typeof HTMLFlipBook>}
                    width={450}
                    height={600}
                    showCover={true}
                    className="shadow-2xl"
                    onFlip={handleFlip}
                    mobileScrollSupport={true}
                >
                    {/* COVER PAGE */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-8 flex flex-col items-center justify-center relative overflow-hidden">
                        {/* Cover Image */}
                        {story.pages[0]?.imageUrl && (
                            <div className="w-56 h-56 rounded-2xl overflow-hidden border-4 border-white/30 shadow-xl mb-6 bg-white/10">
                                <img src={story.pages[0].imageUrl} className="w-full h-full object-cover" alt="Cover" />
                            </div>
                        )}

                        <h1 className="text-3xl font-black text-center mb-4 drop-shadow-lg">
                            {story.title}
                        </h1>

                        <div className="flex items-center gap-2 mb-6">
                            <Star className="text-yellow-300 fill-yellow-300" size={22} />
                            <p className="text-lg font-bold">For {profile?.name || 'You'}!</p>
                            <Star className="text-yellow-300 fill-yellow-300" size={22} />
                        </div>

                        <p className="text-sm opacity-80">Tap to start →</p>
                    </div>

                    {/* STORY PAGES */}
                    {story.pages.map((page, index) => (
                        <div
                            key={`page-${index}`}
                            className="bg-white shadow-lg relative flex flex-col"
                        >
                            {/* Image Area */}
                            <div className="h-[35%] w-full flex-shrink-0 bg-slate-100 relative">
                                {page.imageUrl ? (
                                    <img
                                        src={page.imageUrl}
                                        alt={`Page ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-5xl text-slate-300">
                                        📖
                                    </div>
                                )}
                            </div>

                            {/* Text Area - with proper scrolling */}
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="flex flex-col items-center justify-start min-h-full">
                                    {index === storyPageIndex ? renderHighlightedText() : (
                                        <p className="text-base md:text-lg font-bold leading-relaxed text-slate-800 text-center">
                                            {page.text}
                                        </p>
                                    )}

                                    {/* QUIZ UI (SchoolAge mode) */}
                                    {page.question && interactionMode === 'QUIZ' && (
                                        <div className="mt-4 w-full">
                                            <p className="text-sm font-bold text-indigo-700 mb-2 bg-indigo-50 py-2 px-3 rounded-lg">
                                                🤔 {page.question.text}
                                            </p>
                                            <div className="flex flex-col gap-2">
                                                {page.question.options.map((opt, optIdx) => {
                                                    const isAnswered = answeredQuestions.has(index);
                                                    const isSelected = showQuizFeedback?.pageIdx === index;

                                                    let btnStyle = "bg-white border-2 border-indigo-200 text-indigo-800 hover:bg-indigo-50";
                                                    if (isAnswered) {
                                                        if (opt.isCorrect) {
                                                            btnStyle = "bg-green-100 border-2 border-green-400 text-green-800";
                                                        } else if (isSelected) {
                                                            btnStyle = "bg-red-100 border-2 border-red-400 text-red-800";
                                                        } else {
                                                            btnStyle = "bg-slate-100 border-2 border-slate-200 text-slate-500";
                                                        }
                                                    }

                                                    return (
                                                        <button
                                                            key={optIdx}
                                                            onClick={() => handleQuizAnswer(index, optIdx, opt.isCorrect)}
                                                            disabled={isAnswered}
                                                            className={`py-2 px-4 rounded-lg font-bold text-sm transition-all ${!isAnswered && 'active:scale-95'} ${btnStyle}`}
                                                        >
                                                            {opt.label}
                                                            {isAnswered && opt.isCorrect && " ✓"}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* DECISION POINT UI (Adolescent mode) */}
                                    {page.decisionPoint && interactionMode === 'DECISION_MAKING' && (
                                        <div className="mt-4 w-full bg-slate-800 rounded-xl p-4 text-white">
                                            <p className="text-sm font-bold text-amber-400 mb-3">
                                                ⚡ {page.decisionPoint.prompt}
                                            </p>
                                            <div className="flex flex-col gap-2">
                                                {page.decisionPoint.choices.map((choice, choiceIdx) => {
                                                    const isDecided = selectedDecisions[index] !== undefined;
                                                    const isThisSelected = selectedDecisions[index] === choiceIdx;

                                                    let btnStyle = "bg-slate-700 border border-slate-600 hover:bg-slate-600";
                                                    if (isDecided) {
                                                        if (isThisSelected) {
                                                            btnStyle = choice.isOptimal
                                                                ? "bg-green-600 border border-green-500"
                                                                : "bg-yellow-600 border border-yellow-500";
                                                        } else {
                                                            btnStyle = "bg-slate-800 border border-slate-700 opacity-50";
                                                        }
                                                    }

                                                    return (
                                                        <button
                                                            key={choiceIdx}
                                                            onClick={() => handleDecision(index, choiceIdx, choice.isOptimal, choice.consequence)}
                                                            disabled={isDecided}
                                                            className={`py-2 px-4 rounded-lg font-bold text-sm transition-all ${!isDecided && 'active:scale-95'} ${btnStyle}`}
                                                        >
                                                            {choice.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Show consequence */}
                                            {selectedDecisions[index] !== undefined && (
                                                <div className="mt-3 p-3 bg-slate-900 rounded-lg text-xs">
                                                    <span className="text-amber-400 font-bold">Result: </span>
                                                    {page.decisionPoint.choices[selectedDecisions[index]].consequence}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Page Number */}
                            <div className="absolute bottom-3 right-3 z-10">
                                <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-sm font-bold">
                                    {index + 1}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* THE END PAGE */}
                    <div className="bg-gradient-to-br from-green-400 to-emerald-500 text-white p-8 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="text-7xl mb-6">🎉</div>
                        <h2 className="text-4xl font-black mb-4">The End!</h2>
                        <p className="text-xl font-bold mb-8">
                            Great reading, {profile?.name || 'friend'}!
                        </p>

                        <button
                            onClick={handleFinish}
                            className="px-8 py-4 bg-white text-green-600 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-xl flex items-center gap-2 active:scale-95"
                        >
                            <CheckCircle size={24} />
                            Done!
                        </button>
                    </div>
                </HTMLFlipBook>
            </div>

            {/* Control Buttons */}
            <div className="py-3 px-4 flex flex-col items-center gap-3 w-full">

                {/* Action Buttons */}
                {!isOnCover && currentPage && (
                    <div className="flex items-center gap-2">
                        {/* Read to Me Button */}
                        <button
                            onClick={handleReadToMe}
                            disabled={isListeningToChild}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md ${getReadButtonClassName(isReading, isListeningToChild)}`}
                        >
                            {isReading ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            {isReading ? 'Stop' : 'Read'}
                        </button>

                        {/* My Turn Button */}
                        <button
                            onClick={toggleReadAlong}
                            disabled={isReading}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md ${getMyTurnButtonClassName(isListeningToChild, isReading)}`}
                        >
                            {isListeningToChild ? <MicOff size={18} /> : <Mic size={18} />}
                            {isListeningToChild ? 'Stop' : 'My Turn'}
                        </button>
                    </div>
                )}

                {/* Listening Status */}
                {isListeningToChild && (
                    <div className="bg-red-50 border border-red-200 px-3 py-1.5 rounded-full flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-700 font-bold text-xs">
                            {matchedWordIndices.size} / {getWords().length} words
                        </span>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={goToPrevPage}
                        disabled={currentPageIndex === 0}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                            currentPageIndex === 0
                                ? 'opacity-30 cursor-not-allowed bg-slate-200 text-slate-400'
                                : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-sm active:scale-95'
                        }`}
                    >
                        <ChevronLeft size={16} />
                        Back
                    </button>

                    {/* Page dots */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-white rounded-full shadow-sm">
                        {story.pages.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all ${
                                    i === storyPageIndex && !isOnCover
                                        ? 'bg-indigo-500 w-4'
                                        : 'bg-slate-300 w-1.5'
                                }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={isLastPage ? handleFinish : goToNextPage}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold text-white shadow-sm transition-all active:scale-95 ${
                            isLastPage
                                ? 'bg-green-500 hover:bg-green-600'
                                : 'bg-indigo-500 hover:bg-indigo-600'
                        }`}
                    >
                        {isLastPage ? 'Done' : 'Next'}
                        {isLastPage ? <CheckCircle size={16} /> : <ChevronRight size={16} />}
                    </button>
                </div>
            </div>

            {/* CSS for confetti animation */}
            <style>{`
                @keyframes confetti {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
                .animate-confetti {
                    animation: confetti 2.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default StoryBookPlayer;
