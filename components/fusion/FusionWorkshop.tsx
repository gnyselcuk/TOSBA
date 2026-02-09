import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../store/userStore';
import { Blueprint, AppStage } from '../../types';
import { speakBuddyText, generateFusionBlueprint } from '../../services/geminiService';

import BuddyWidget from '../buddy/BuddyWidget';

// ... (existing imports)

const FusionWorkshop: React.FC = () => {
    const { profile, inventory, tokens, spendTokens, removeFromInventory, setStage, fusionBlueprint, setFusionBlueprint } = useUserStore();
    const [currentBlueprint, setCurrentBlueprint] = useState<Blueprint | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [showCompletion, setShowCompletion] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Load or generate blueprint based on child's interests
    useEffect(() => {
        const initializeBlueprint = async () => {
            // 1. If blueprint already exists in store, use it
            if (fusionBlueprint) {
                setCurrentBlueprint(fusionBlueprint);
                return;
            }

            // 2. Generate new blueprint based on child's primary interest
            if (!profile?.interests || profile.interests.length === 0) {
                // Default to "Toys" if no interests set
                await generateAndSaveBlueprint("Toys");
                return;
            }

            const primaryInterest = profile.interests[0];
            await generateAndSaveBlueprint(primaryInterest);
        };

        initializeBlueprint();
    }, [profile, fusionBlueprint]);

    const generateAndSaveBlueprint = async (interest: string) => {
        setIsGenerating(true);
        try {
            const generatedBlueprint = await generateFusionBlueprint(interest);

            if (generatedBlueprint) {
                setCurrentBlueprint(generatedBlueprint);
                setFusionBlueprint(generatedBlueprint); // Save to store
                speakBuddyText(`Welcome to the workshop! Let's build your ${generatedBlueprint.name}!`, 'Puck');
            } else {
                // Fallback to a default blueprint if generation fails
                const fallback: Blueprint = {
                    id: 'default-project',
                    name: 'Amazing Creation',
                    interest: interest,
                    starsPerFusion: 5,
                    completionReward: 'Special Builder Badge!',
                    slots: [
                        { id: 'part1', label: 'Foundation', requiredItems: 3, filledItems: [], emoji: '🏗️' },
                        { id: 'part2', label: 'Structure', requiredItems: 3, filledItems: [], emoji: '🧱' },
                        { id: 'part3', label: 'Details', requiredItems: 3, filledItems: [], emoji: '✨' },
                        { id: 'part4', label: 'Finishing', requiredItems: 3, filledItems: [], emoji: '🎨' }
                    ]
                };
                setCurrentBlueprint(fallback);
                setFusionBlueprint(fallback);
            }
        } catch (error) {
            console.error("Blueprint generation error:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleItemClick = (itemId: string) => {
        if (!selectedSlot || !currentBlueprint) return;

        const slot = currentBlueprint.slots.find(s => s.id === selectedSlot);
        if (!slot) return;

        // Check if slot is full
        if (slot.filledItems.length >= slot.requiredItems) {
            speakBuddyText("This part is already full!", 'Puck');
            return;
        }

        // Check if user has enough stars
        if (tokens < currentBlueprint.starsPerFusion) {
            speakBuddyText(`You need ${currentBlueprint.starsPerFusion} stars to fuse this part!`, 'Puck');
            return;
        }

        // Fuse the item
        spendTokens(currentBlueprint.starsPerFusion);
        slot.filledItems.push(itemId);
        removeFromInventory(itemId);

        // Update blueprint
        setCurrentBlueprint({ ...currentBlueprint });
        setSelectedSlot(null);

        speakBuddyText("Great! Part attached!", 'Puck');

        // Check completion
        checkCompletion();
    };

    const checkCompletion = () => {
        if (!currentBlueprint) return;

        const allSlotsFilled = currentBlueprint.slots.every(
            slot => slot.filledItems.length >= slot.requiredItems
        );

        if (allSlotsFilled) {
            setShowCompletion(true);
            speakBuddyText(`Amazing! You completed the ${currentBlueprint.name}! You're a master builder!`, 'Puck');
        }
    };

    // Workshop theme based on interest (currently not used in UI but available for future enhancements)
    // const getWorkshopTheme = () => {
    //     if (!currentBlueprint) return { bg: 'from-slate-700 to-slate-900', accent: 'slate' };
    //     const interest = currentBlueprint.interest.toLowerCase();
    //     if (interest.includes('robot')) return { bg: 'from-slate-700 to-slate-900', accent: 'blue' };
    //     if (interest.includes('space')) return { bg: 'from-indigo-900 to-black', accent: 'purple' };
    //     if (interest.includes('dino')) return { bg: 'from-amber-800 to-stone-900', accent: 'amber' };
    //     return { bg: 'from-slate-700 to-slate-900', accent: 'slate' };
    // };

    // AI CONTEXT
    const fusionContext = `
        SCENE: Fusion Workshop.
        ROLE: Senior Engineer / Master Builder.
        
        CURRENT PROJECT: ${currentBlueprint?.name || 'Loading...'}.
        INTEREST: ${currentBlueprint?.interest || 'General'}.
        
        GOAL:
        - Guide the child to build the project.
        - Explain that they need "Stars" to melt/fuse parts.
        - If they click a slot, tell them "Add an item from your bag!".
        - If they complete it, celebrate!
        - Make them feel like a genius inventor.
    `;

    if (!currentBlueprint || isGenerating) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex items-center justify-center">
                <div className="text-center">
                    <span className="text-6xl mb-4 block animate-bounce">🔧</span>
                    <p className="text-2xl font-bold text-slate-600 mb-2">
                        {isGenerating ? 'Creating Your Workshop...' : 'Loading Workshop...'}
                    </p>
                    {isGenerating && (
                        <p className="text-lg text-slate-400 animate-pulse">
                            Designing a project just for you! ✨
                        </p>
                    )}
                </div>
            </div>
        );
    }

    const totalItems = currentBlueprint.slots.reduce((sum, slot) => sum + slot.requiredItems, 0);
    const filledItems = currentBlueprint.slots.reduce((sum, slot) => sum + slot.filledItems.length, 0);
    const progress = Math.round((filledItems / totalItems) * 100);

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white text-slate-700 font-fredoka relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-20 right-10 w-48 h-48 bg-sky-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-200 rounded-full blur-3xl opacity-30 pointer-events-none"></div>

            {/* Header with Back Button */}
            <header className="bg-transparent p-4 mb-6 relative z-10">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => setStage(AppStage.DASHBOARD)}
                        className="bg-white hover:bg-slate-50 text-slate-600 rounded-full py-2 px-4 shadow-sm border border-slate-200 transition-transform active:scale-95 font-bold flex items-center gap-2"
                        aria-label="Back to dashboard"
                    >
                        <span>🔙</span> <span className="hidden sm:inline">Dashboard</span>
                    </button>

                    <div className="text-center flex-1 mx-4">
                        <h1 className="text-3xl md:text-4xl font-bold mb-1 text-purple-600">🔧 Fusion Workshop</h1>
                        <p className="text-slate-600 text-sm md:text-lg">Building: {currentBlueprint.name}</p>
                    </div>

                    <div className="bg-amber-100 backdrop-blur-sm px-4 md:px-6 py-2 md:py-3 rounded-full border-2 border-amber-300 shadow-sm">
                        <span className="text-xl md:text-2xl mr-1 md:mr-2">⭐</span>
                        <span className="text-xl md:text-2xl font-bold text-amber-800">{tokens}</span>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 md:px-6">
                {/* Progress Bar */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 mb-6 shadow-md border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-700">Progress</span>
                        <span className="text-2xl font-bold text-purple-600">{filledItems}/{totalItems}</span>
                    </div>
                    <div className="h-4 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Build Plan Panel */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border-2 border-slate-200 shadow-lg">
                        <h2 className="text-2xl font-bold mb-2 flex items-center text-slate-800">
                            <span className="mr-2">🔨</span> Build Plan
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            Use your items to complete each part! Each fusion costs {currentBlueprint.starsPerFusion} ⭐
                        </p>

                        <div className="space-y-3">
                            {currentBlueprint.slots.map((slot) => (
                                <button
                                    key={slot.id}
                                    onClick={() => setSelectedSlot(slot.id)}
                                    className={`w-full p-4 rounded-2xl transition-all ${selectedSlot === slot.id
                                        ? 'bg-blue-500 text-white border-4 border-blue-300 scale-105 shadow-xl'
                                        : 'bg-white/60 border-2 border-slate-200 hover:bg-white hover:shadow-md text-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-4xl">{slot.emoji}</span>
                                            <div className="text-left">
                                                <p className="font-bold text-lg">{slot.label}</p>
                                                <p className={`text-sm ${selectedSlot === slot.id ? 'text-white/90' : 'text-slate-500'}`}>
                                                    {slot.filledItems.length}/{slot.requiredItems} parts
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {Array.from({ length: slot.requiredItems }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-8 h-8 rounded-lg border-2 ${i < slot.filledItems.length
                                                        ? 'bg-green-400 border-green-500'
                                                        : 'bg-slate-100 border-slate-300'
                                                        }`}
                                                ></div>
                                            ))}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {selectedSlot && (
                            <div className="mt-4 p-4 bg-amber-100 border-2 border-amber-400 rounded-2xl">
                                <p className="text-center font-bold text-amber-800 mb-2">
                                    ⭐ Select an item below to fuse!
                                </p>
                                <p className="text-center text-xs text-amber-700">
                                    Each fusion costs {currentBlueprint.starsPerFusion} ⭐ stars
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Inventory Panel */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border-2 border-slate-200 shadow-lg">
                        <h2 className="text-2xl font-bold mb-2 flex items-center text-slate-800">
                            <span className="mr-2">🎒</span> Your Items ({inventory.length})
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            {selectedSlot ? 'Click an item to fuse it!' : 'First, select a part on the left!'}
                        </p>

                        {inventory.length === 0 ? (
                            <div className="text-center py-12">
                                <span className="text-8xl mb-4 block">🎒</span>
                                <p className="text-xl text-slate-500 mb-2">Your bag is empty!</p>
                                <p className="text-sm text-slate-400">Visit the shop to buy parts!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                                {inventory.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleItemClick(item.id)}
                                        disabled={!selectedSlot}
                                        className={`p-3 rounded-2xl border-2 transition-all ${selectedSlot
                                            ? 'bg-white border-slate-300 hover:scale-105 hover:shadow-lg cursor-pointer'
                                            : 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                                            }`}
                                    >
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            className="w-full h-24 object-cover rounded-xl mb-2"
                                        />
                                        <p className="font-bold text-sm text-center truncate text-slate-700">{item.name}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Completion Modal */}
            {showCompletion && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-8 max-w-lg text-center shadow-2xl">
                        <div className="text-8xl mb-4 animate-bounce">🎉</div>
                        <h2 className="text-4xl font-bold text-white mb-4">
                            {currentBlueprint.name} Complete!
                        </h2>
                        <p className="text-2xl text-white/90 mb-6">
                            {currentBlueprint.completionReward}
                        </p>
                        <button
                            onClick={() => setShowCompletion(false)}
                            className="bg-white text-orange-600 font-bold px-8 py-4 rounded-full text-xl hover:scale-105 transition-transform"
                        >
                            Amazing! ✨
                        </button>
                    </div>
                </div>
            )}

            {/* BUDDY WIDGET */}
            <BuddyWidget
                context={fusionContext}
                className="fixed bottom-4 right-4 z-40 flex flex-col items-end"
            />
        </div>
    );
};

export default FusionWorkshop;
