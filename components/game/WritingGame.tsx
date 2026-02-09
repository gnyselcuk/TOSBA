import React, { useRef, useState, useEffect } from 'react';

// --- TEMPLATE I: WRITING / TRACING ---
interface WritingProps {
    targetWord: string;
    onComplete: (success: boolean) => void;
    traceMode?: boolean; // If true, shows the letter as a guide
}

export const WritingTemplate: React.FC<WritingProps> = ({ targetWord, onComplete, traceMode = true }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);

    // Initialize Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // High DPI setup
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const context = canvas.getContext('2d');
        if (context) {
            context.scale(dpr, dpr);
            context.lineCap = 'round';
            context.strokeStyle = '#4f46e5'; // Indigo-600
            context.lineWidth = 12;
            contextRef.current = context;
        }
    }, []);

    const startDrawing = ({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
        if (!contextRef.current) return;

        const { offsetX, offsetY } = getCoordinates(nativeEvent);
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const finishDrawing = () => {
        if (!contextRef.current) return;
        contextRef.current.closePath();
        setIsDrawing(false);
    };

    const draw = ({ nativeEvent }: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !contextRef.current) return;

        const { offsetX, offsetY } = getCoordinates(nativeEvent);
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
    };

    // Helper to get coordinates for both Mouse and Touch
    const getCoordinates = (event: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { offsetX: 0, offsetY: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ((event as TouchEvent).touches && (event as TouchEvent).touches.length > 0) {
            clientX = (event as TouchEvent).touches[0].clientX;
            clientY = (event as TouchEvent).touches[0].clientY;
        } else {
            clientX = (event as MouseEvent).clientX;
            clientY = (event as MouseEvent).clientY;
        }

        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (canvas && context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            setHasDrawn(false);
        }
    };

    const handleSubmit = () => {
        // NOTE: Gesture Recognition can be implemented in future iterations.
        // Currently validates that user has drawn something on the canvas.
        if (hasDrawn) {
            onComplete(true);
        } else {
            // Shake or warn - user needs to draw something
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-4">
            <div className="relative w-full max-w-md aspect-square bg-white rounded-3xl shadow-xl border-4 border-indigo-100 overflow-hidden">

                {/* 1. Underlying Text for Tracing */}
                {traceMode && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                        <span
                            className="text-[200px] font-mono text-slate-200"
                            style={{
                                fontFamily: '"Courier New", monospace', // Monospaced fonts are easier to trace usually
                                WebkitTextStroke: '2px #cbd5e1'
                            }}
                        >
                            {targetWord}
                        </span>

                    </div>
                )}

                {/* 2. Drawing Canvas */}
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseUp={finishDrawing}
                    onMouseMove={draw}
                    onMouseLeave={finishDrawing}
                    onTouchStart={startDrawing}
                    onTouchEnd={finishDrawing}
                    onTouchMove={draw}
                    className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                    style={{ touchAction: 'none' }}
                />
            </div>

            {/* Controls */}
            <div className="mt-8 flex gap-4 w-full max-w-md">
                <button
                    onClick={clearCanvas}
                    className="flex-1 py-3 px-6 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                    Clear
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!hasDrawn}
                    className={`flex-1 py-3 px-6 rounded-xl font-bold text-white transition-all transform
                        ${hasDrawn ? 'bg-green-500 hover:bg-green-400 hover:scale-105 shadow-lg' : 'bg-slate-300 cursor-not-allowed'}
                    `}
                >
                    Done!
                </button>
            </div>
        </div>
    );
};
