import React, { useRef, useState, useEffect, useCallback } from 'react';
import { generateHiddenImage, speakBuddyText } from '../../services/geminiService';
import { useUserStore } from '../../store/userStore';
import { PuzzleAsset } from '../../types';

// Confetti particle
interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
}

const THEMES = ["Space", "Dinosaurs", "Under Water", "Candy Land", "Super Heroes", "Jungle", "Pirates", "Robots"];

interface ScratchRevealProps {
    onComplete?: () => void;
}

const ScratchReveal: React.FC<ScratchRevealProps> = ({ onComplete }) => {
    const [hiddenImage, setHiddenImage] = useState<string | null>(null);
    const [imageLabel, setImageLabel] = useState<string>('');
    const [currentTheme, setCurrentTheme] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
    const [canvasReady, setCanvasReady] = useState(false);
    const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
    const [revealedPercent, setRevealedPercent] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);

    const isDrawing = useRef(false);
    const particles = useRef<Particle[]>([]);
    const animationFrame = useRef<number | null>(null);

    const { addPuzzleAsset } = useUserStore();

    // Calculate revealed percentage
    const calculateRevealedPercent = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let transparentPixels = 0;

        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] === 0) {
                transparentPixels++;
            }
        }

        const total = canvas.width * canvas.height;
        const percent = Math.round((transparentPixels / total) * 100);
        setRevealedPercent(percent);

        // Check completion
        if (percent >= 100 && !isCompleted && hiddenImage) {
            handleCompletion();
        }
    }, [isCompleted, hiddenImage]);

    // Handle completion - confetti, fullscreen, save
    const handleCompletion = useCallback(() => {
        setIsCompleted(true);

        // Start confetti
        startConfetti();

        // Show fullscreen after a short delay
        setTimeout(() => {
            setShowFullscreen(true);
        }, 500);

        // Save to puzzle assets
        if (hiddenImage && currentTheme && imageLabel) {
            const asset: PuzzleAsset = {
                id: `puzzle_${Date.now()}`,
                name: imageLabel,
                theme: currentTheme,
                imageUrl: hiddenImage,
                label: imageLabel,
                unlockedAt: new Date().toISOString()
            };
            addPuzzleAsset(asset);
            speakBuddyText(`Wow! You found a ${imageLabel}! I saved it to your puzzle collection!`, 'Puck');
        }
    }, [hiddenImage, currentTheme, imageLabel, addPuzzleAsset]);

    // Confetti animation
    const startConfetti = useCallback(() => {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#9400d3'];
        particles.current = [];

        // Create particles
        /* eslint-disable sonarjs/pseudo-random */
        for (let i = 0; i < 150; i++) {
            particles.current.push({
                x: Math.random() * window.innerWidth,
                y: -20 - Math.random() * 100,
                vx: (Math.random() - 0.5) * 8,
                vy: Math.random() * 5 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 10 + 5,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        }
        /* eslint-enable sonarjs/pseudo-random */

        const animate = () => {
            const canvas = confettiCanvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let activeParticles = 0;
            particles.current.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // gravity
                p.rotation += p.rotationSpeed;

                if (p.y < canvas.height + 50) {
                    activeParticles++;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation * Math.PI / 180);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                    ctx.restore();
                }
            });

            if (activeParticles > 0) {
                animationFrame.current = requestAnimationFrame(animate);
            }
        };

        animate();
    }, []);

    // Initialize Canvas with exact image dimensions
    const initCanvas = useCallback((displayWidth: number, displayHeight: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = displayWidth;
        canvas.height = displayHeight;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#475569';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Instruction text
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        const fontSize = Math.min(displayWidth, displayHeight) * 0.08;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✨ Scratch Me! ✨", canvas.width / 2, canvas.height / 2);
        ctx.restore();

        setCanvasReady(true);
        setRevealedPercent(0);
        setIsCompleted(false);
    }, []);

    const scratch = useCallback((clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d', { willReadFrequently: true });

        if (!canvas || !ctx || isCompleted) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        // Age-based brush size for difficulty adjustment
        const { profile } = useUserStore.getState();
        const age = profile?.developmentalAge || profile?.chronologicalAge || 4;

        let brushSizeMultiplier = 0.12; // Default for preschool
        if (age >= 13) {
            brushSizeMultiplier = 0.06; // Adolescents - smallest brush (hardest)
        } else if (age >= 6) {
            brushSizeMultiplier = 0.09; // School age - medium brush
        }

        const brushSize = Math.min(canvas.width, canvas.height) * brushSizeMultiplier;

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, brushSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }, [isCompleted]);

    const throttledCalculate = useCallback(() => {
        requestAnimationFrame(calculateRevealedPercent);
    }, [calculateRevealedPercent]);

    // Event Handlers
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !canvasSize) return;

        const handleStart = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();

            isDrawing.current = true;

            let clientX: number, clientY: number;
            if (e instanceof MouseEvent) {
                clientX = e.clientX;
                clientY = e.clientY;
            } else {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
            scratch(clientX, clientY);
            throttledCalculate();
        };

        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDrawing.current) return;

            e.preventDefault();
            e.stopPropagation();

            let clientX: number, clientY: number;
            if (e instanceof MouseEvent) {
                clientX = e.clientX;
                clientY = e.clientY;
            } else {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            }
            scratch(clientX, clientY);
        };

        const handleEnd = () => {
            if (isDrawing.current) {
                throttledCalculate();
            }
            isDrawing.current = false;
        };

        canvas.addEventListener('mousedown', handleStart, { capture: true });
        canvas.addEventListener('touchstart', handleStart, { passive: false, capture: true });

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove, { passive: false });

        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchend', handleEnd);

        return () => {
            canvas.removeEventListener('mousedown', handleStart);
            canvas.removeEventListener('touchstart', handleStart);
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [scratch, throttledCalculate, canvasSize]);

    // Cleanup confetti on unmount
    useEffect(() => {
        return () => {
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
        };
    }, []);

    // Auto-load random image on mount
    useEffect(() => {
        loadNewSecret();
    }, []);

    // Load image and get its dimensions
    const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        // Use MORE of the viewport - bigger image
        const maxWidth = window.innerWidth * 0.9;
        const maxHeight = window.innerHeight * 0.75;

        // Scale to fit - allow up to 2x scaling
        const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 2);
        const displayWidth = naturalWidth * scale;
        const displayHeight = naturalHeight * scale;

        setCanvasSize({ width: displayWidth, height: displayHeight });

        setTimeout(() => initCanvas(displayWidth, displayHeight), 50);
    }, [initCanvas]);

    const loadNewSecret = async () => {
        // Clean up previous state
        setIsLoading(true);
        setHiddenImage(null);
        setCanvasReady(false);
        setCanvasSize(null);
        setRevealedPercent(0);
        setIsCompleted(false);
        setShowFullscreen(false);

        // Pick random theme
        // eslint-disable-next-line sonarjs/pseudo-random
        const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
        setCurrentTheme(randomTheme);

        try {
            const { imageUrl, label } = await generateHiddenImage(randomTheme);

            if (!imageUrl) return;

            setHiddenImage(imageUrl);
            setImageLabel(label);
            speakBuddyText(`I have a surprise for you! Scratch to find out what's hiding!`, 'Puck');
        } catch (error) {
            console.error('Error generating image:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getProgressColor = () => {
        if (revealedPercent < 30) return 'from-red-500 to-orange-500';
        if (revealedPercent < 60) return 'from-orange-500 to-yellow-500';
        if (revealedPercent < 90) return 'from-yellow-500 to-green-500';
        return 'from-green-500 to-emerald-400';
    };

    const closeFullscreen = () => {
        setShowFullscreen(false);
        // Return to Art Studio menu instead of loading new image
        if (onComplete) {
            onComplete();
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-800 rounded-3xl p-4 shadow-2xl text-white relative overflow-hidden">
            {/* Confetti Canvas - Fixed overlay */}
            <canvas
                ref={confettiCanvasRef}
                className="fixed inset-0 pointer-events-none"
                style={{ zIndex: 100 }}
            />

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-4 z-20 relative">
                <button
                    onClick={loadNewSecret}
                    disabled={isLoading}
                    className="bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                >
                    {isLoading ? '🎁 Preparing Surprise...' : '🎁 New Surprise!'}
                </button>

                {/* Theme indicator */}
                {currentTheme && (
                    <span className="text-slate-400 text-sm">Theme: {currentTheme}</span>
                )}

                {/* Progress Display - Only when image loaded */}
                {hiddenImage && canvasSize && (
                    <div className="flex-1 flex items-center gap-3 ml-4">
                        <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                            <div
                                className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-300 ease-out`}
                                style={{ width: `${revealedPercent}%` }}
                            />
                        </div>
                        <div className="text-lg font-bold min-w-[60px] text-right">
                            <span className={revealedPercent >= 100 ? 'text-green-400' : 'text-white'}>
                                {revealedPercent}%
                            </span>
                        </div>
                        {revealedPercent >= 100 && (
                            <span className="text-2xl animate-bounce">🎉</span>
                        )}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex items-center justify-center">

                {/* Loading State */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                        <span className="text-7xl animate-bounce">🎁</span>
                        <span className="text-2xl">Buddy is hiding a surprise...</span>
                    </div>
                )}

                {/* Card - Only shown when image is loaded */}
                {hiddenImage && canvasSize && (
                    <div
                        className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-600"
                        style={{
                            width: canvasSize.width,
                            height: canvasSize.height
                        }}
                    >
                        {/* Hidden Image */}
                        <img
                            src={hiddenImage}
                            alt="Hidden Secret"
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ zIndex: 1 }}
                            onLoad={handleImageLoad}
                        />

                        {/* Scratch Canvas (Fog) */}
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 touch-none"
                            style={{
                                width: '100%',
                                height: '100%',
                                cursor: isCompleted ? 'default' : 'crosshair',
                                touchAction: 'none',
                                zIndex: 10,
                                pointerEvents: isCompleted ? 'none' : 'auto'
                            }}
                        />

                        {/* Visual Cue */}
                        {!isCompleted && (
                            <div
                                className="absolute top-3 right-3 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg"
                                style={{ zIndex: 20, pointerEvents: 'none' }}
                            >
                                {canvasReady ? '✨ Scratch to Reveal!' : '⏳ Setting up...'}
                            </div>
                        )}
                    </div>
                )}

                {/* Hidden image loader */}
                {hiddenImage && !canvasSize && (
                    <img
                        src={hiddenImage}
                        alt="Loading..."
                        className="opacity-0 absolute"
                        onLoad={handleImageLoad}
                    />
                )}
            </div>

            {/* Fullscreen Reveal Modal */}
            {showFullscreen && hiddenImage && (
                <div
                    className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
                    onClick={closeFullscreen}
                >
                    <div className="relative max-w-4xl max-h-[90vh] p-4">
                        <img
                            src={hiddenImage}
                            alt={imageLabel}
                            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border-4 border-white/20"
                        />
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-6 py-3 rounded-full text-xl font-bold">
                            🎉 You found: {imageLabel}! 🎉
                        </div>
                        <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                            ✅ Saved to Puzzle Collection!
                        </div>
                        <div className="text-center mt-4 text-white/60 text-sm">
                            Tap anywhere for a new surprise!
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScratchReveal;
