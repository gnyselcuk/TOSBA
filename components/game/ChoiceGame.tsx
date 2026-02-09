import React, { useState, useEffect } from 'react';
import { AssessmentItem } from '../../types';

// --- TEMPLATE C: CHOICE (Match Master, Chat Sim, Signs) ---
interface ChoiceProps {
    question: string;
    items: AssessmentItem[];
    scenarioText?: string;
    image?: string; // New Reference Image Support
    onComplete: (success: boolean) => void;
}

// Helper function to determine button class
const getChoiceButtonClass = (item: AssessmentItem, selectedId: string | null): string => {
    const baseClass = 'relative rounded-2xl border-4 transition-all duration-300 p-4 flex flex-col items-center justify-center shadow-sm group';
    
    if (selectedId === item.id) {
        if (item.isCorrect) {
            return `${baseClass} bg-green-100 border-green-500 scale-105`;
        }
        return `${baseClass} bg-red-100 border-red-500 animate-shake`;
    }
    
    return `${baseClass} bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md`;
};

export const ChoiceTemplate: React.FC<ChoiceProps> = ({ question, items, scenarioText, image, onComplete }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Reset state when items change (new question)
    useEffect(() => {
        setSelectedId(null);
    }, [items]);

    const handleChoice = (item: AssessmentItem) => {
        setSelectedId(item.id);
        if (item.isCorrect) {
            setTimeout(() => onComplete(true), 1000);
        } else {
            setTimeout(() => {
                setSelectedId(null);
            }, 1000);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-6">
            {/* Scenario / Question Card */}
            <div className="bg-white p-6 rounded-3xl shadow-lg border-l-8 border-indigo-500 mb-8 flex flex-col md:flex-row items-center gap-6">

                {/* Reference Image (Optional) */}
                {image && image.length > 5 && !image.includes('Reference') && (
                    <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0 bg-slate-100 rounded-2xl p-2 border-2 border-slate-200">
                        <img src={image} alt="Reference" className="w-full h-full object-contain" />
                    </div>
                )}

                <div className="flex-1">
                    {scenarioText && (
                        <div className="bg-slate-100 p-3 rounded-lg mb-4 text-sm text-slate-600 font-mono">
                            {scenarioText}
                        </div>
                    )}
                    <h2 className="text-2xl font-black text-slate-800">{question}</h2>
                </div>
            </div>

            {/* Choices Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {items.map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleChoice(item)}
                        className={getChoiceButtonClass(item, selectedId)}
                    >
                        {item.imageUrl && <img src={item.imageUrl} className="h-32 w-32 object-contain mb-4" />}
                        <span className="text-lg font-bold text-slate-700 group-hover:text-indigo-600">{item.name}</span>

                        {selectedId === item.id && item.isCorrect && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-xl">
                                <span className="text-6xl">✅</span>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
