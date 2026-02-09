import React, { useState, useRef } from 'react';
import { generateColoringPage, speakBuddyText } from '../../services/geminiService';
import { useUserStore } from '../../store/userStore';

const COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#brown',  // Brown (Hex needed) ->
    '#8B4513',
    '#000000', // Black
    '#ffffff'  // Eraser/White
];

const InfiniteColoring: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [outlineImage, setOutlineImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedColor, setSelectedColor] = useState('#ef4444');

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // ROBUST FLOOD FILL
    // eslint-disable-next-line sonarjs/cognitive-complexity
    const performFloodFill = (startX: number, startY: number, fillColor: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;

        // Save history
        // setHistory(prev => [...prev.slice(-5), ctx.getImageData(0,0,w,h)]);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data; // Uint8ClampedArray
        const pixelStack = [[startX, startY]];

        const startPos = (startY * w + startX) * 4;
        const startR = data[startPos];
        const startG = data[startPos + 1];
        const startB = data[startPos + 2];

        // Parse fill color
        const tempCtx = document.createElement('canvas').getContext('2d');
        if (!tempCtx) return;
        tempCtx.fillStyle = fillColor;
        tempCtx.fillRect(0, 0, 1, 1);
        const fillData = tempCtx.getImageData(0, 0, 1, 1).data;
        const [fillR, fillG, fillB] = fillData;

        if (startR === fillR && startG === fillG && startB === fillB) return;

        const matchStartColor = (pos: number) => {
            const r = data[pos];
            const g = data[pos + 1];
            const b = data[pos + 2];
            // 100 threshold is high, but for "White" background vs Black lines it is fine.
            // We assume Black lines are < 50, White is > 200.
            // So filling white: match anything > 150?
            // Let's be closer to start color.
            return Math.abs(r - startR) < 90 && Math.abs(g - startG) < 90 && Math.abs(b - startB) < 90;
        };

        const colorPixel = (pos: number) => {
            data[pos] = fillR;
            data[pos + 1] = fillG;
            data[pos + 2] = fillB;
            data[pos + 3] = 255;
        };

        while (pixelStack.length) {
            const newPos = pixelStack.pop() as [number, number];
            const x = newPos[0];
            let y = newPos[1];

            let pixelPos = (y * w + x) * 4;

            while (y-- >= 0 && matchStartColor(pixelPos)) {
                pixelPos -= w * 4;
            }

            pixelPos += w * 4;
            ++y;

            let reachLeft = false;
            let reachRight = false;

            while (y++ < h - 1 && matchStartColor(pixelPos)) {
                colorPixel(pixelPos);

                if (x > 0) {
                    if (matchStartColor(pixelPos - 4)) {
                        if (!reachLeft) {
                            pixelStack.push([x - 1, y]);
                            reachLeft = true;
                        }
                    } else if (reachLeft) {
                        reachLeft = false;
                    }
                }

                if (x < w - 1) {
                    if (matchStartColor(pixelPos + 4)) {
                        if (!reachRight) {
                            pixelStack.push([x + 1, y]);
                            reachRight = true;
                        }
                    } else if (reachRight) {
                        reachRight = false;
                    }
                }

                pixelPos += w * 4;
            }
        }

        ctx.putImageData(imgData, 0, 0);
    };

    const drawImageOnCanvas = (b64: string) => {
        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                canvas.width = 512;
                canvas.height = 512;
                if (ctx) ctx.drawImage(img, 0, 0, 512, 512);
            }
        };
        img.src = b64;
    };

    const handleCreate = async () => {
        if (!prompt) return;
        setIsLoading(true);

        // Age-based complexity adjustment
        const { profile } = useUserStore.getState();
        const age = profile?.developmentalAge || profile?.chronologicalAge || 4;

        let complexityHint = '';
        if (age >= 13) {
            complexityHint = ' with intricate details and complex patterns';
        } else if (age >= 6) {
            complexityHint = ' with moderate detail';
        } else {
            complexityHint = ' with simple, bold shapes and minimal details';
        }

        const enhancedPrompt = prompt + complexityHint;
        const b64 = await generateColoringPage(enhancedPrompt);
        setOutlineImage(b64);
        drawImageOnCanvas(b64);
        speakBuddyText(`Here is a ${prompt} for you to color!`, 'Puck');
        setIsLoading(false);
    };

    const onCanvasClick = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        // Scale coordinates if canvas style size differs from attribute size
        const dataX = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
        const dataY = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

        performFloodFill(dataX, dataY, selectedColor);
        speakBuddyText(getAudioFeedback(selectedColor), 'Puck');
    };

    const getAudioFeedback = (color: string) => {
        if (color === '#ef4444') return "Red! Like an apple!";
        if (color === '#22c55e') return "Green! Like the grass!";
        if (color === '#3b82f6') return "Blue! Like the sky!";
        return "Nice color!";
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl p-4 shadow-inner">
            {/* Controls */}
            <div className="flex space-x-2 mb-4">
                <input
                    value={prompt}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
                    placeholder="What do you want to color? (e.g. Cat)"
                    className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2 text-lg"
                />
                <button
                    onClick={handleCreate}
                    disabled={isLoading}
                    className="bg-pink-500 text-white rounded-xl px-6 font-bold disabled:opacity-50"
                >
                    {isLoading ? 'Creating...' : 'Create Magic Page'}
                </button>
            </div>

            {/* Workspace */}
            <div className="flex flex-1 space-x-4 overflow-hidden">
                {/* Palette */}
                <div className="flex flex-col space-y-2 overflow-y-auto pr-2">
                    {COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => setSelectedColor(c)}
                            className={`w-12 h-12 rounded-full border-4 shadow-sm transition-transform ${selectedColor === c ? 'border-slate-800 scale-110' : 'border-white'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                {/* Canvas Area */}
                <div className="flex-1 bg-slate-100 rounded-2xl flex items-center justify-center p-4 shadow-inner relative">
                    {!outlineImage && !isLoading && (
                        <div className="text-slate-400 text-center">
                            <span className="text-4xl block mb-2">🎨</span>
                            Type something above to start!
                        </div>
                    )}
                    {isLoading && (
                        <div className="animate-pulse flex flex-col items-center text-pink-400">
                            <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                            Making magic...
                        </div>
                    )}
                    <canvas
                        ref={canvasRef}
                        className={`bg-white shadow-xl rounded-lg cursor-crosshair ${(!outlineImage || isLoading) ? 'hidden' : ''}`}
                        onClick={onCanvasClick}
                        style={{ maxHeight: '100%', maxWidth: '100%' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default InfiniteColoring;
