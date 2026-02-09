import React, { useRef, useState, useEffect } from 'react';
import { enhanceSketch, speakBuddyText } from '../../services/geminiService';
import { useUserStore } from '../../store/userStore';

// Helper function to determine result display content
const getResultContent = (isLoading: boolean, resultImage: string | null) => {
    if (isLoading) {
        return <div className="animate-bounce text-6xl">🪄</div>;
    }
    
    if (resultImage) {
        return <img src={resultImage} alt="Result" className="w-full h-full object-contain" />;
    }
    
    return (
        <div className="text-purple-300 text-center px-8">
            <div className="text-4xl mb-2">🖼️</div>
            Draw something related to your prompt, then click &quot;Make it Real!&quot;
        </div>
    );
};

const SketchToImage: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [brushSize, setBrushSize] = useState(5);

    // Setup Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, 512, 512);
                ctx.lineWidth = brushSize;
                ctx.lineCap = 'round';
                ctx.strokeStyle = 'black';
            }
        }
    }, []);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.lineWidth = brushSize;
    }, [brushSize]);

    const startDrawing = (e: React.MouseEvent) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.beginPath(); // Reset path
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setResultImage(null);
        }
    };

    const handleMagic = async () => {
        if (!prompt) {
            alert("What fits matches your drawing? Tell Buddy!");
            return;
        }
        setIsLoading(true);
        speakBuddyText("Wow! Let me see... I'll use my magic!", 'Puck');

        // Age-based complexity adjustment
        const { profile } = useUserStore.getState();
        const age = profile?.developmentalAge || profile?.chronologicalAge || 4;

        let styleHint = '';
        if (age >= 13) {
            styleHint = ', realistic style with detailed textures and shading';
        } else if (age >= 6) {
            styleHint = ', colorful illustration style with good detail';
        } else {
            styleHint = ', simple cartoon style with bright colors and bold shapes';
        }

        const enhancedPrompt = prompt + styleHint;

        const canvas = canvasRef.current;
        if (canvas) {
            const base64 = canvas.toDataURL('image/png');
            const enhanced = await enhanceSketch(base64, enhancedPrompt);
            setResultImage(enhanced);
            speakBuddyText(`Look! Your ${prompt} came to life!`, 'Puck');
        }
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl p-4 shadow-inner">
            <div className="flex space-x-2 mb-4">
                <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="This is a... (e.g. Robot, fast car)"
                    className="flex-1 border-2 border-purple-200 rounded-xl px-4 py-2 text-lg focus:border-purple-500"
                />
                <button
                    onClick={handleMagic}
                    disabled={isLoading}
                    className="bg-purple-500 text-white rounded-xl px-6 font-bold disabled:opacity-50 flex items-center space-x-2"
                >
                    <span>✨</span>
                    <span>{isLoading ? 'Magic working...' : 'Make it Real!'}</span>
                </button>
            </div>

            <div className="flex-1 flex space-x-4 overflow-hidden">
                {/* Drawing Area */}
                <div className="w-1/2 flex flex-col space-y-2">
                    <div className="bg-slate-100 rounded-xl p-2 flex justify-between items-center">
                        <span className="font-bold text-slate-500 text-sm">YOUR DRAWING</span>
                        <div className="flex space-x-2">
                            <input
                                type="range" min="2" max="20"
                                value={brushSize}
                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                className="w-24"
                            />
                            <button onClick={handleClear} className="text-red-500 font-bold text-xs bg-white px-2 rounded hover:bg-red-50">CLEAR</button>
                        </div>
                    </div>
                    <div className="flex-1 border-4 border-dashed border-slate-300 rounded-2xl bg-white relative shadow-sm overflow-hidden flex items-center justify-center">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseUp={stopDrawing}
                            onMouseMove={draw}
                            onMouseLeave={stopDrawing}
                            className="bg-white cursor-crosshair w-full h-full object-contain"
                        />
                        <div className="absolute bottom-2 left-2 text-slate-300 text-xs pointer-events-none">Draw black lines here</div>
                    </div>
                </div>

                {/* Result Area */}
                <div className="w-1/2 flex flex-col space-y-2">
                    <div className="bg-purple-100 rounded-xl p-2 text-center text-purple-600 font-bold text-sm">
                        AI MAGIC RESULT
                    </div>
                    <div className="flex-1 rounded-2xl bg-purple-50 relative shadow-inner flex items-center justify-center overflow-hidden border-4 border-purple-100">
                        {getResultContent(isLoading, resultImage)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SketchToImage;
