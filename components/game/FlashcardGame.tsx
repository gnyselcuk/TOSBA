import React, { useState, useEffect } from 'react';
import { AssessmentItem } from '../../types';
import { useSound } from '../../hooks/useSound';

// --- TEMPLATE: FLASHCARD (Sight Words, Vocabulary) ---
interface FlashcardProps {
    items: AssessmentItem[];
    onComplete: (success: boolean) => void;
    autoPlay?: boolean; // If true, flips automatically after a delay
}

export const FlashcardTemplate: React.FC<FlashcardProps> = ({ items, onComplete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const { playSound } = useSound();

    // Safety check for empty items
    if (!items || items.length === 0) return <div>No cards loaded</div>;

    const currentItem = items[currentIndex];

    // Reset flip state when card changes
    useEffect(() => {
        setIsFlipped(false);
        setIsAnimating(false);
    }, [currentIndex]);

    const handleFlip = () => {
        if (isAnimating) return;
        setIsFlipped(!isFlipped);
        playSound('POP'); // Fun sound on flip
    };

    const handleNext = () => {
        setIsAnimating(true);
        setTimeout(() => {
            if (currentIndex < items.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                // Deck Complete
                onComplete(true);
            }
        }, 300); // Wait for potential exit animation
    };

    return (
        <div className="flex flex-col items-center justify-center h-full w-full perspective-1000">
            {/* Progress Bar */}
            <div className="w-full max-w-sm mb-6 flex gap-1">
                {items.map((_, i) => (
                    <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-colors ${i <= currentIndex ? 'bg-indigo-500' : 'bg-slate-200'}`}
                    />
                ))}
            </div>

            {/* THE CARD */}
            <div
                className="relative w-72 h-96 cursor-pointer group perspective-1000"
                onClick={handleFlip}
            >
                <div className={`
                    w-full h-full relative transition-all duration-700 transform-style-3d
                    ${isFlipped ? 'rotate-y-180' : ''}
                `}>

                    {/* FRONT: The Word */}
                    <div className="absolute inset-0 w-full h-full bg-white rounded-3xl shadow-xl border-4 border-indigo-100 flex flex-col items-center justify-center backface-hidden z-10">
                        <span className="text-6xl font-black text-slate-800 tracking-wider">
                            {currentItem.name || "Word"}
                        </span>
                        <p className="mt-8 text-slate-400 font-bold text-sm uppercase tracking-widest animate-pulse">
                            Tap to Flip 👆
                        </p>

                        {/* Decorative Corners */}
                        <div className="absolute top-4 left-4 w-4 h-4 border-t-4 border-l-4 border-indigo-200 rounded-tl-lg"></div>
                        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-4 border-r-4 border-indigo-200 rounded-br-lg"></div>
                    </div>

                    {/* BACK: Image & Context */}
                    <div className="absolute inset-0 w-full h-full bg-indigo-50 rounded-3xl shadow-xl border-4 border-indigo-300 flex flex-col items-center justify-center backface-hidden rotate-y-180">
                        {currentItem.imageUrl ? (
                            <img
                                src={currentItem.imageUrl}
                                alt={currentItem.name}
                                className="w-40 h-40 object-contain drop-shadow-lg mb-6"
                            />
                        ) : (
                            <div className="text-6xl mb-6">🖼️</div>
                        )}

                        <p className="text-3xl font-bold text-indigo-600 mb-2">
                            {currentItem.name}
                        </p>

                        {/* Optional Example Sentence (if we had it in data) */}
                        {/* <p className="text-center text-slate-500 px-4">"The cat is cute."</p> */}
                    </div>
                </div>
            </div>

            {/* CONTROLS */}
            <div className="mt-10 flex gap-6 w-full max-w-sm">
                <button
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="flex-1 py-4 bg-orange-100 text-orange-600 rounded-2xl font-bold text-lg hover:bg-orange-200 transition-colors shadow-sm active:scale-95"
                >
                    Study Again
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-bold text-lg hover:bg-green-400 transition-all shadow-lg shadow-green-200 active:scale-95 flex items-center justify-center gap-2"
                >
                    <span>Got it!</span>
                    <span>✨</span>
                </button>
            </div>

            <style>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .transform-style-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>
        </div>
    );
};
