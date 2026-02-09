import React, { useState, useEffect } from 'react';
import { AssessmentItem } from '../../types';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

// --- TEMPLATE D: SPEAKING (Naming, Verbal Imitation) ---
interface SpeakingProps {
    targetWord: string;
    item: AssessmentItem;
    instruction: string;
    onComplete: (success: boolean) => void;
}

// Helper function to determine button class based on state
const getMicButtonClass = (success: boolean, isListening: boolean): string => {
    const baseClass = 'relative w-24 h-24 rounded-full shadow-xl flex items-center justify-center transition-all transform active:scale-95';
    
    if (success) {
        return `${baseClass} bg-green-500 text-white`;
    }
    
    if (isListening) {
        return `${baseClass} bg-red-500 text-white scale-110`;
    }
    
    return `${baseClass} bg-indigo-600 text-white hover:bg-indigo-500`;
};

export const SpeakingTemplate: React.FC<SpeakingProps> = ({ targetWord, item, instruction, onComplete }) => {
    const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!transcript) return;

        // Simple fuzzy match
        if (transcript.toLowerCase().includes(targetWord.toLowerCase())) {
            setSuccess(true);
            stopListening();
            setTimeout(() => onComplete(true), 1500);
        }
    }, [transcript, targetWord]);

    if (!isSupported) {
        return <div className="p-8 text-center text-red-500 font-bold">Browser does not support Speech Recognition. Please use Chrome.</div>;
    }

    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-6 space-y-8">

            {/* Visual Stimulus */}
            <div className={`transition-all duration-500 ${success ? 'scale-125 rotate-6' : 'scale-100'}`}>
                <div className="w-64 h-64 bg-white rounded-3xl shadow-2xl border-8 border-indigo-100 flex items-center justify-center p-6 relative overflow-hidden">
                    {success && <div className="absolute inset-0 bg-green-500/20 z-10 animate-pulse"></div>}
                    {item.imageUrl ? (
                        <img src={item.imageUrl} alt={targetWord} className="w-full h-full object-contain" />
                    ) : (
                        <span className="text-4xl font-black text-slate-700">{targetWord}</span>
                    )}
                </div>
            </div>

            {/* Instruction Text */}
            <h2 className="text-2xl font-bold text-slate-700 text-center animate-bounce-slow">
                {success ? "Great Job!" : instruction}
            </h2>

            {/* Microphone Interaction */}
            <div className="relative">
                {isListening && (
                    <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75"></div>
                )}
                <button
                    onMouseDown={() => !success && startListening()}
                    onMouseUp={stopListening}
                    // Touch support for mobile
                    onTouchStart={() => !success && startListening()}
                    onTouchEnd={stopListening}
                    className={getMicButtonClass(success, isListening)}
                >
                    <span className="text-4xl">
                        {success ? '✓' : '🎤'}
                    </span>
                </button>

                {/* Visual Hint */}
                {!isListening && !success && (
                    <div className="absolute -bottom-8 w-max left-1/2 -translate-x-1/2 text-xs text-slate-400 font-bold uppercase tracking-widest">
                        Hold to Speak
                    </div>
                )}
            </div>

            {/* Live Transcript Feedback */}
            <div className="h-12 flex items-center justify-center min-w-[200px]">
                {transcript ? (
                    <span className={`text-xl font-mono font-bold ${success ? 'text-green-600' : 'text-slate-500'}`}>
                        &quot;{transcript}&quot;
                    </span>
                ) : (
                    <span className="text-slate-300 italic">...</span>
                )}
            </div>
        </div>
    );
};
