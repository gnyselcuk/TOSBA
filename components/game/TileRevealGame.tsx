import React, { useState, useEffect, useMemo } from 'react';
import { AssessmentItem } from '../../types';
import { useUserStore } from '../../store/userStore';

// --- TEMPLATE F: TILE REVEAL (Guess the Image) ---
interface TileRevealProps {
    items: AssessmentItem[];
    onComplete: (success: boolean) => void;
}

// Helper function to determine grid columns based on number of options
const getGridColumns = (optionsLength: number): string => {
    if (optionsLength <= 4) return 'grid-cols-2';
    if (optionsLength <= 6) return 'grid-cols-3';
    return 'grid-cols-2';
};

// Helper function to determine button class based on state
const getButtonClass = (item: AssessmentItem, isWrong: boolean, completed: boolean): string => {
    const baseClass = 'relative py-4 px-6 rounded-2xl font-bold text-lg shadow-sm border-b-4 transition-all active:scale-95';
    
    if (isWrong && !item.isCorrect) {
        return `${baseClass} bg-red-100 text-red-500 border-red-200 animate-shake`;
    }
    
    if (completed && item.isCorrect) {
        return `${baseClass} bg-green-100 text-green-600 border-green-300 scale-105`;
    }
    
    return `${baseClass} bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-indigo-200`;
};

export const TileRevealTemplate: React.FC<TileRevealProps> = ({ items, onComplete }) => {
    // Get user age for difficulty adjustment
    const { profile } = useUserStore();
    const age = profile?.chronologicalAge || 7;

    // Calculate tile count based on age (difficulty)
    const tileCount = useMemo(() => {
        if (age <= 6) return 6;      // 2x3 grid - easier
        if (age <= 10) return 9;     // 3x3 grid - medium
        if (age <= 14) return 12;    // 3x4 grid - hard
        return 16;                    // 4x4 grid - very hard
    }, [age]);

    // Calculate grid layout
    const gridLayout = useMemo(() => {
        if (tileCount === 6) return { cols: 2, rows: 3 };
        if (tileCount === 9) return { cols: 3, rows: 3 };
        if (tileCount === 12) return { cols: 3, rows: 4 };
        return { cols: 4, rows: 4 };
    }, [tileCount]);

    // 1. Identify the correct answer (Target)
    const targetItem = items.find(i => i.isCorrect) || items[0];

    // 2. State
    const [tiles, setTiles] = useState(Array.from({ length: tileCount }, (_, i) => ({ id: i, visible: true })));
    const [isWrong, setIsWrong] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [options, setOptions] = useState<AssessmentItem[]>([]);

    // Reset all state when items change (new question)
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.log('[TileReveal] New question loaded, resetting state');
        setTiles(Array.from({ length: tileCount }, (_, i) => ({ id: i, visible: true })));
        setIsWrong(false);
        setCompleted(false);
        // eslint-disable-next-line sonarjs/pseudo-random
        setOptions([...items].sort(() => Math.random() - 0.5));
    }, [items, tileCount]);

    // 4. Handlers
    const handleTileClick = (id: number) => {
        if (!tiles.find(t => t.id === id)?.visible) return;
        setTiles(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
    };

    const handleGuess = (item: AssessmentItem) => {
        if (completed) return;

        if (item.id === targetItem.id) {
            // Correct!
            setCompleted(true);
            // Reveal remaining tiles for satisfaction
            // setTiles(prev => prev.map(t => ({ ...t, visible: false })));
            setTimeout(() => onComplete(true), 1500);
        } else {
            // Wrong!
            setIsWrong(true);
            setTimeout(() => setIsWrong(false), 1000);
        }
    };

    return (
        <div className="flex flex-col items-center h-full w-full p-4 overflow-y-auto">
            {/* Game Title */}
            <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-indigo-900">Guess the Picture!</h3>
                <p className="text-indigo-400 text-sm">Tap tiles to take a peek 👀</p>
            </div>

            {/* The Hidden Image Container */}
            <div className="relative flex-shrink-0 w-64 h-64 md:w-72 md:h-72 rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-200 mb-8">
                {/* The Target Image */}
                <img
                    src={targetItem.imageUrl}
                    alt="Hidden"
                    className="absolute inset-0 w-full h-full object-contain p-4 bg-white"
                />

                {/* The Cover Tiles Grid */}
                <div 
                    className="absolute inset-0 grid"
                    style={{
                        gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
                        gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`
                    }}
                >
                    {tiles.map(tile => (
                        <div
                            key={tile.id}
                            onClick={() => handleTileClick(tile.id)}
                            className={`
                                relative border border-white/20 transition-all duration-500 transform
                                ${tile.visible
                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 scale-100 opacity-100 cursor-pointer hover:opacity-90 active:scale-95'
                                    : 'scale-0 opacity-0 pointer-events-none'
                                }
                            `}
                        >
                            {tile.visible && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-3xl text-white/30">?</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Choice Options */}
            <div className={`w-full max-w-lg grid gap-4 ${getGridColumns(options.length)}`}>
                {options.map(item => {
                    const buttonClass = getButtonClass(item, isWrong, completed);
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleGuess(item)}
                            className={buttonClass}
                        >
                            {item.name}

                            {/* Status Icon */}
                            {completed && item.isCorrect && (
                                <span className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">✓</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
