import React, { useState, useEffect } from 'react';
import { useSound } from '../../hooks/useSound';
import { AssessmentItem } from '../../types';

// --- TEMPLATE B: TAP TRACK (Pop Balloons, Phonics, I Spy, Photo Hunt) ---
interface TapTrackProps {
    items: AssessmentItem[];
    mode: 'FALLING' | 'FLOATING' | 'STATIC';
    onComplete: (success: boolean) => void;
    backgroundUrl?: string; // New: For Photo Hunt AR-Lite
}

export const TapTrackTemplate: React.FC<TapTrackProps> = ({ items, onComplete, backgroundUrl }) => {
    const [activeItems, setActiveItems] = useState<AssessmentItem[]>(items || []);
    const [score, setScore] = useState(0);
    const requiredScore = (items || []).filter(i => i.isCorrect).length;
    const [feedback, setFeedback] = useState<{ x: number, y: number, text: string } | null>(null);
    const { playSound } = useSound();

    // Sync activeItems with props if items change
    useEffect(() => {
        if (items && items.length > 0) {
            setActiveItems(items);
        }
    }, [items]);

    const handleTap = (item: AssessmentItem, e: React.MouseEvent) => {
        if (item.isCorrect) {
            // Success Sound
            playSound('POP');

            // Vibration
            if (navigator.vibrate) navigator.vibrate(50);

            setScore(prev => {
                const newScore = prev + 1;
                if (newScore >= requiredScore) {
                    setTimeout(() => onComplete(true), 1500);
                }
                return newScore;
            });
            // Mark as popped
            setActiveItems(prev => prev.map(i => i.id === item.id ? { ...i, id: i.id + '_popped' } : i));

            // Visual success at tap location
            setFeedback({ x: e.clientX, y: e.clientY, text: "Found it! 🎉" });
            setTimeout(() => setFeedback(null), 1000);

        } else {
            // Error Sound
            playSound('ERROR');

            // Shake effect 
            const el = document.getElementById(`item-${item.id}`);
            if (el) el.classList.add('animate-shake');
            setTimeout(() => el?.classList.remove('animate-shake'), 500);

            // Error Vibration
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

            // Wrong feedback
            setFeedback({ x: e.clientX, y: e.clientY, text: `That's ${item.name} ❌` });
            setTimeout(() => setFeedback(null), 1000);
        }
    };

    // Guard: Show message if no items
    if (!items || items.length === 0) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                    <span className="text-4xl mb-4 block">⏳</span>
                    <p className="text-slate-600 font-bold">Loading game items...</p>
                </div>
            </div>
        );
    }

    // Check if we are in AR-Lite mode (Background + Bounding Boxes)
    const isARLite = backgroundUrl && items.some(i => i.boundingBox);

    const containerClass = backgroundUrl
        ? "absolute inset-0 rounded-xl border-4 border-white/50 shadow-2xl overflow-hidden"
        : "relative w-full h-full rounded-xl border-4 border-white/50 shadow-2xl bg-gradient-to-br from-indigo-100 to-purple-100 overflow-hidden";

    return (
        <div className={containerClass}>
            {/* Background Image for Photo Hunt */}
            {backgroundUrl && (
                <div
                    className="absolute inset-0"
                    style={{
                        zIndex: 1,
                        backgroundColor: '#1e293b' // slate-800 - neutral background
                    }}
                >
                    <img
                        src={backgroundUrl}
                        className="w-full h-full"
                        style={{
                            objectFit: 'fill',
                            display: 'block'
                        }}
                        alt="Find the objects"
                    />
                </div>
            )}

            {/* Progress Bar */}
            <div className="absolute top-4 right-4 bg-white/90 rounded-full px-4 py-1 font-bold text-indigo-600 shadow-sm z-20 pointer-events-none">
                Score: {score} / {requiredScore}
            </div>

            {/* Float Feedback */}
            {feedback && (
                <div
                    className="fixed z-50 bg-white/90 px-3 py-1 rounded-full text-sm font-bold shadow-lg pointer-events-none animate-bounce-gentle"
                    style={{ left: feedback.x, top: feedback.y - 50 }}
                >
                    {feedback.text}
                </div>
            )}

            {/* Game Items Container */}
            {isARLite ? (
                // AR-LITE MODE: Absolute positioning
                <div className="absolute inset-0 z-10">
                    {activeItems.map((item) => {
                        if (item.id.includes('_popped')) return null; // Hide after finding

                        const box = item.boundingBox;
                        if (!box) return null; // Skip items without box in AR mode

                        // Box is [ymin, xmin, ymax, xmax] in 0-1000 scale
                        // We convert to percentages
                        const top = box[0] / 10;
                        const left = box[1] / 10;
                        const height = (box[2] - box[0]) / 10;
                        const width = (box[3] - box[1]) / 10;

                        return (
                            <button
                                key={item.id}
                                id={`item-${item.id}`}
                                onClick={(e) => handleTap(item, e)}
                                className="absolute border-2 border-dashed border-white/30 hover:border-yellow-400 hover:bg-yellow-400/20 active:bg-green-400/40 rounded-lg transition-colors"
                                style={{
                                    top: `${top}%`,
                                    left: `${left}%`,
                                    height: `${height}%`,
                                    width: `${width}%`
                                }}
                            >
                                {/* Debug Label - Optional, maybe hide in prod */}
                                {/* <span className="text-[10px] text-white bg-black/50 px-1 absolute -top-4 left-0">{item.name} {item.isCorrect && '★'}</span> */}
                            </button>
                        );
                    })}
                </div>
            ) : (
                // CLASSIC MODE: Flex Grid
                <div className="flex flex-wrap gap-6 justify-center items-center h-full pt-16 px-4 relative z-10">
                    {activeItems.map((item, index) => {
                        if (item.id.includes('_popped')) {
                            return (
                                <div key={item.id} className="w-24 h-24 bg-green-200/50 rounded-full flex items-center justify-center animate-pop-out">
                                    <span className="text-4xl">✓</span>
                                </div>
                            );
                        }

                        return (
                            <button
                                key={item.id}
                                id={`item-${item.id}`}
                                onClick={(e) => handleTap(item, e)}
                                style={{ animationDelay: `${index * 0.1}s` }}
                                className="w-24 h-24 p-2 rounded-full shadow-xl transition-all duration-300 bg-white border-4 border-indigo-200 hover:border-green-400 hover:scale-110 active:scale-90 cursor-pointer animate-bounce-gentle"
                            >
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 rounded-full overflow-hidden shadow-inner">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} className="w-full h-full object-contain p-1" alt={item.name} />
                                    ) : (
                                        <span className="text-xl font-black text-indigo-600">{item.name}</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <style>{`
                @keyframes bounceGentle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes popOut {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.3); opacity: 0.5; }
                    100% { transform: scale(0); opacity: 0; }
                }
                .animate-bounce-gentle {
                    animation: bounceGentle 2s ease-in-out infinite;
                }
                .animate-pop-out {
                    animation: popOut 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
