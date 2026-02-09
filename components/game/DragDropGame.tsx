import React, { useState, useEffect } from 'react';
import { useSound } from '../../hooks/useSound';
import { AssessmentItem } from '../../types';

// --- TEMPLATE A: DRAG & DROP (Feed Buddy, Sentence Train, Budget) ---
interface DragDropProps {
    items: AssessmentItem[];
    targetZone: { label: string, image?: string };
    slots: number;
    onComplete: (success: boolean) => void;
    buddyImage?: string;
}

export const DragDropTemplate: React.FC<DragDropProps> = ({ items, targetZone, slots, onComplete, buddyImage }) => {
    const [draggedItem, setDraggedItem] = useState<AssessmentItem | null>(null);
    const [droppedItems, setDroppedItems] = useState<AssessmentItem[]>([]);
    const [feedback, setFeedback] = useState<string | null>(null);
    const { playSound } = useSound();

    // Logic for Sequencing/Sentence Train:
    // If targetZone label implies order ("Train" or "Timeline"), we enforce strict 1-2-3 order.
    const isOrdered = targetZone.label.includes("Train") || targetZone.label.includes("Timeline");

    // We keep a shuffled version for the UI "shelf" so the answer isn't obvious
    const [shelfItems, setShelfItems] = useState<AssessmentItem[]>([]);

    useEffect(() => {
        // Shuffle display items on mount (Math.random is acceptable for game shuffling)
        // eslint-disable-next-line sonarjs/pseudo-random
        setShelfItems([...items].sort(() => Math.random() - 0.5));
    }, [items]);

    const handleItemClick = (item: AssessmentItem) => {
        if (droppedItems.find(i => i.id === item.id)) return;
        setDraggedItem(item);
    };

    const handleZoneClick = () => {
        if (!draggedItem) return;

        let isCorrectHit = false;

        if (isOrdered) {
            // ORDERED MODE: Must match the specific item at current index
            // The 'items' prop is the Answer Key (Sequential). 
            // We check if dragged item matches items[currentDropIndex].
            const expectedItem = items[droppedItems.length];
            if (expectedItem && draggedItem.id === expectedItem.id) {
                isCorrectHit = true;
            }
        } else {
            // UNORDERED MODE (Feeding/Shopping): Just check isCorrect flag
            if (draggedItem.isCorrect) {
                isCorrectHit = true;
            }
        }

        if (isCorrectHit) {
            const newDropped = [...droppedItems, draggedItem];
            setDroppedItems(newDropped);
            setDraggedItem(null);

            // Visual feedback
            setFeedback("YUM!");
            setTimeout(() => setFeedback(null), 1000);
            playSound('EAT'); // or SUCCESS

            if (newDropped.length >= slots) {
                onComplete(true);
            }
        } else {
            setFeedback("NOPE");
            setTimeout(() => setFeedback(null), 1000);
            setDraggedItem(null);
            playSound('ERROR');
        }
    };

    return (
        <div className="flex flex-col items-center justify-between h-full w-full relative">
            {/* Target Zone (Mouth / Train / Cart) */}
            <div className="flex-1 w-full flex items-center justify-center relative">
                <div
                    onClick={handleZoneClick}
                    className={`transition-all duration-300 transform ${draggedItem ? 'scale-110 cursor-pointer ring-4 ring-green-400' : ''} relative`}
                >
                    {/* If it's feeding time, show Buddy! */}
                    {buddyImage && slots === 1 ? (
                        <div className="relative w-48 h-48 md:w-64 md:h-64">
                            <img src={buddyImage} alt="Buddy" className={`w-full h-full object-contain ${feedback === 'YUM!' ? 'animate-bounce' : ''}`} />
                            {feedback === 'YUM!' && <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl animate-ping">😋</div>}
                            {feedback === 'NOPE' && <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl animate-shake">🤢</div>}
                            {/* Mouth Target Hint */}
                            {draggedItem && <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-16 h-16 bg-green-500/30 rounded-full animate-pulse blur-md"></div>}
                        </div>
                    ) : (
                        // Train / Shelf / Generic Target
                        <div className="bg-white p-6 rounded-3xl shadow-xl border-4 border-slate-200 min-w-[300px] min-h-[150px] flex flex-col items-center justify-center">
                            {/* Label */}
                            <div className="text-slate-400 font-bold mb-4 uppercase text-sm tracking-wider bg-slate-100 px-3 py-1 rounded-full">{targetZone.label}</div>

                            <div className="flex items-center justify-center space-x-4">
                                {Array.from({ length: slots }).map((_, i) => (
                                    <div key={i} className="relative w-32 h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center group overflow-hidden p-2">
                                        {/* Step Number Background */}
                                        {isOrdered && (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-200 text-6xl font-black pointer-events-none select-none">
                                                {i + 1}
                                            </div>
                                        )}

                                        {droppedItems[i] ? (
                                            <>
                                                {droppedItems[i].imageUrl && (
                                                    <img src={droppedItems[i].imageUrl} className="w-full flex-1 object-contain relative z-10 mb-1" />
                                                )}
                                                <span className="font-bold text-xs relative z-10 bg-white/90 px-1 rounded text-center line-clamp-1 w-full">{droppedItems[i].name}</span>
                                            </>
                                        ) : (
                                            <span className="text-slate-300 text-2xl relative z-10 opacity-0 group-hover:opacity-100 transition-opacity">⬇️</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Draggable Items Shelf (Use Shuffled shelfItems) */}
            <div className="h-48 w-full bg-white/80 backdrop-blur-md border-t-4 border-indigo-100 p-4 flex items-center justify-center gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-10">
                {shelfItems.map(item => {
                    const isDropped = droppedItems.find(i => i.id === item.id);
                    const isSelected = draggedItem?.id === item.id;

                    if (isDropped) return <div key={item.id} className="w-32 h-32 opacity-20 bg-slate-200 rounded-2xl"></div>;

                    return (
                        <button
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className={`w-32 h-32 bg-white rounded-2xl shadow-lg border-2 transition-all transform active:scale-95 flex flex-col items-center justify-center p-3 relative
                                ${isSelected ? 'border-green-500 -translate-y-4 scale-110 shadow-green-200' : 'border-slate-100 hover:border-indigo-300 hover:-translate-y-1'}
                            `}
                        >
                            {isSelected && <div className="absolute -top-3 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">SELECTED</div>}
                            {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain pointer-events-none mb-1" />
                            ) : null}
                            <span className="font-bold text-xs text-slate-700 text-center mt-1 line-clamp-2">{item.name}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    );
}
