import React, { useState } from 'react';
import { AssessmentItem } from '../../types';
import { useDrag, useDrop } from 'react-dnd';

// --- TEMPLATE G: FEEDING (Drag & Drop with React DnD) ---
interface FeedingProps {
    items: AssessmentItem[];
    targetZone: { label: string, image?: string };
    buddyImage?: string;
    onComplete: (success: boolean) => void;
}

// Helper Component for Feeding
const DraggableFood: React.FC<{ item: AssessmentItem, isDropped: boolean }> = ({ item, isDropped }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'FOOD',
        item: { id: item.id, isCorrect: item.isCorrect },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
        canDrag: !isDropped,
    }), [isDropped, item.id]);

    if (isDropped) {
        return <div className="w-24 h-24 opacity-0" />; // Invisible placeholder
    }

    return (
        <div
            ref={drag}
            className={`w-24 h-24 p-2 bg-white rounded-full shadow-lg border-2 border-orange-100 cursor-grab active:cursor-grabbing transition-transform hover:scale-105 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
        >
            {item.imageUrl ? (
                <img src={item.imageUrl} className="w-full h-full object-contain pointer-events-none" />
            ) : (
                <div className="flex items-center justify-center h-full font-bold text-slate-700">{item.name}</div>
            )}
        </div>
    );
};

export const FeedingTemplate: React.FC<FeedingProps> = ({ items, buddyImage, onComplete }) => {
    const requiredCount = items.filter(i => i.isCorrect).length || 1;
    const [droppedItems, setDroppedItems] = useState<string[]>([]); // IDs of fed items

    // Helper function to handle drop logic
    const handleDrop = (item: { id: string, isCorrect: boolean }) => {
        if (item.isCorrect) {
            // Yummy!
            const audio = new Audio('/sounds/eat.mp3');
            audio.play().catch(() => { });
            setDroppedItems(prev => {
                const newDropped = [...prev, item.id];
                if (newDropped.length >= requiredCount) {
                    setTimeout(() => onComplete(true), 1500);
                }
                return newDropped;
            });
            return undefined;
        } else {
            // Yuck!
            const audio = new Audio('/sounds/error.mp3');
            audio.play().catch(() => { });
            if (navigator.vibrate) navigator.vibrate(100);
            return undefined;
        }
    };

    // Drop Target (Buddy's Mouth)
    const [{ isOver }, drop] = useDrop(() => ({
        accept: 'FOOD',
        drop: handleDrop,
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    }));

    return (
        <div className="h-full w-full flex flex-col justify-between items-center p-4">
            {/* Buddy / Target */}
            <div ref={drop} className="flex-1 flex flex-col items-center justify-center w-full relative">
                <div className={`transition-all duration-300 transform ${isOver ? 'scale-110' : 'scale-100'}`}>
                    {/* If we have a buddy image, we try to use it, else generic */}
                    {buddyImage ? (
                        <div className="relative w-64 h-64">
                            <img src={buddyImage} className="w-full h-full object-contain" />
                            {/* Mouth Overlay - Simplified simulation */}
                            {isOver && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-black/80 rounded-full animate-pulse border-4 border-red-400">
                                    <span className="absolute inset-0 flex items-center justify-center text-2xl">😮</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`w-48 h-48 rounded-full border-8 border-dashed flex items-center justify-center bg-slate-100 ${isOver ? 'border-green-500 bg-green-50' : 'border-slate-300'}`}>
                            <span className="text-6xl">{isOver ? '😮' : '😐'}</span>
                        </div>
                    )}
                </div>
                {isOver && <div className="mt-4 text-2xl font-black text-green-500 animate-bounce">Feed Me!</div>}
            </div>

            {/* Food Tray */}
            <div className="h-48 w-full bg-orange-50 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] p-6 flex flex-wrap justify-center gap-4 border-t-4 border-orange-200 z-10">
                {items.map(item => (
                    <DraggableFood key={item.id} item={item} isDropped={droppedItems.includes(item.id)} />
                ))}
            </div>
        </div>
    );
};
