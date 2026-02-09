import React, { useState } from 'react';
import { useUserStore } from '../../store/userStore';
import { AppStage } from '../../types';

import InfiniteColoring from './InfiniteColoring';
import SketchToImage from './SketchToImage';
import ScratchReveal from './ScratchReveal';
import PuzzleGame from './PuzzleGame';

import BuddyWidget from '../buddy/BuddyWidget';

const ArtStudio: React.FC = () => {
    const { setStage } = useUserStore();
    const [activeMode, setActiveMode] = useState<'MENU' | 'COLORING' | 'SKETCH' | 'SCRATCH' | 'PUZZLE'>('MENU');

    const handleBack = () => {
        if (activeMode === 'MENU') {
            setStage(AppStage.DASHBOARD);
        } else {
            setActiveMode('MENU');
        }
    };

    // AI Context based on what the child is doing
    const studioContext = `
        SCENE: Magic Art Studio.
        CURRENT ACTIVITY: ${activeMode === 'MENU' ? 'Choosing an activity' : activeMode}.
        
        GOAL:
        - If MENU: Suggest trying "Magic Sketch" to turn drawings into real art.
        - If COLORING: Say "What pretty colors!" or "Keep going!".
        - If SKETCH: Say "Draw something and I will make it real!".
        - If SCRATCH: Say "Scratch to find the surprise!".
        - If PUZZLE: Say "You can solve this puzzle!".
    `;

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white flex flex-col font-fredoka relative overflow-hidden">
            {/* Decorative Background Elements from Dashboard */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-20 right-10 w-48 h-48 bg-sky-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

            {/* Header */}
            <header className="p-4 bg-transparent flex items-center justify-between z-10">
                <button
                    onClick={handleBack}
                    className="bg-white hover:bg-slate-50 text-slate-600 rounded-full py-2 px-4 shadow-sm border border-slate-200 transition-transform active:scale-95 font-bold flex items-center gap-2"
                >
                    <span>🔙</span> <span className="hidden sm:inline">Dashboard</span>
                </button>
                <h1 className="text-3xl font-bold text-purple-600 drop-shadow-sm">🎨 Magic Art Studio</h1>
                <div className="w-10"></div> {/* Spacer */}
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative">
                {activeMode === 'MENU' && (
                    <div className="h-full flex flex-col items-center justify-center p-6 space-y-8 z-10">
                        <h2 className="text-3xl font-bold text-slate-700 mb-4 drop-shadow-sm">What do you want to create?</h2>

                        {/* Mode Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-6xl">

                            {/* Mode 1: Coloring */}
                            <button
                                onClick={() => setActiveMode('COLORING')}
                                className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border-b-8 border-pink-200 hover:-translate-y-2 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-transparent opacity-50"></div>
                                <div className="relative z-10">
                                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🖍️</div>
                                    <h3 className="text-2xl font-bold text-pink-500">Magic Coloring</h3>
                                    <p className="text-slate-500 font-medium mt-2">Endless pages to color!</p>
                                </div>
                            </button>

                            {/* Mode 2: Sketch */}
                            <button
                                onClick={() => setActiveMode('SKETCH')}
                                className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border-b-8 border-purple-200 hover:-translate-y-2 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-50"></div>
                                <div className="relative z-10">
                                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">✏️</div>
                                    <h3 className="text-2xl font-bold text-purple-500">Magic Sketch</h3>
                                    <p className="text-slate-500 font-medium mt-2">Turn drawings into art!</p>
                                </div>
                            </button>

                            {/* Mode 3: Scratch */}
                            <button
                                onClick={() => setActiveMode('SCRATCH')}
                                className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border-b-8 border-green-200 hover:-translate-y-2 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-transparent opacity-50"></div>
                                <div className="relative z-10">
                                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🌫️</div>
                                    <h3 className="text-2xl font-bold text-green-500">Scratch Reveal</h3>
                                    <p className="text-slate-500 font-medium mt-2">Reveal hidden surprises!</p>
                                </div>
                            </button>

                            {/* Mode 4: Puzzle */}
                            <button
                                onClick={() => setActiveMode('PUZZLE')}
                                className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border-b-8 border-blue-200 hover:-translate-y-2 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-50"></div>
                                <div className="relative z-10">
                                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">🧩</div>
                                    <h3 className="text-2xl font-bold text-blue-500">Puzzle Time</h3>
                                    <p className="text-slate-500 font-medium mt-2">Solve your discoveries!</p>
                                </div>
                            </button>

                        </div>
                    </div>
                )}

                {activeMode === 'COLORING' && <InfiniteColoring />}
                {activeMode === 'SKETCH' && <SketchToImage />}
                {activeMode === 'SCRATCH' && <ScratchReveal onComplete={() => setActiveMode('MENU')} />}
                {activeMode === 'PUZZLE' && <PuzzleGame onComplete={() => setActiveMode('MENU')} />}
            </div>

            {/* NEW STANDARD BUDDY WIDGET */}
            <BuddyWidget
                context={studioContext}
                className="absolute bottom-4 left-4 z-50 flex items-end"
            />
        </div>
    );
};

export default ArtStudio;
