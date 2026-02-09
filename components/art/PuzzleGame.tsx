import React, { useState, useEffect, useRef } from 'react';
import { useUserStore } from '../../store/userStore';
import { speakBuddyText } from '../../services/geminiService';

interface PuzzlePiece {
    id: number;
    currentIndex: number;
    correctIndex: number;
    x: number;
    y: number;
}

interface PuzzleGameProps {
    onComplete?: () => void;
}

const PuzzleGame: React.FC<PuzzleGameProps> = () => {
    const { puzzleAssets, profile, removePuzzleAsset } = useUserStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
    const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
    const [gridSize, setGridSize] = useState<number>(3); // Default 3x3
    const [draggedPiece, setDraggedPiece] = useState<number | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    // Calculate grid size based on age
    useEffect(() => {
        if (!profile?.chronologicalAge && !profile?.developmentalAge) {
            setGridSize(3); // Default
            return;
        }

        const age = profile.developmentalAge || profile.chronologicalAge || 4;

        if (age <= 4) {
            setGridSize(2); // 2x2 = 4 pieces (Very Easy)
        } else if (age <= 6) {
            setGridSize(3); // 3x3 = 9 pieces (Easy)
        } else if (age <= 9) {
            setGridSize(4); // 4x4 = 16 pieces (Medium)
        } else if (age <= 12) {
            setGridSize(5); // 5x5 = 25 pieces (Hard)
        } else {
            setGridSize(6); // 6x6 = 36 pieces (Expert)
        }
    }, [profile]);

    // Load image and initialize puzzle
    useEffect(() => {
        if (!selectedAsset) return;

        const asset = puzzleAssets.find(a => a.id === selectedAsset);
        if (!asset) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            setLoadedImage(img);
            initializePuzzle(img);
            speakBuddyText(`Let's solve this ${asset.label} puzzle! Put the pieces in the right place!`, 'Puck');
        };
        img.src = asset.imageUrl;
    }, [selectedAsset, gridSize]);

    const initializePuzzle = (img: HTMLImageElement) => {
        const totalPieces = gridSize * gridSize;
        const newPieces: PuzzlePiece[] = [];

        // Create pieces array
        for (let i = 0; i < totalPieces; i++) {
            newPieces.push({
                id: i,
                currentIndex: i,
                correctIndex: i,
                x: 0,
                y: 0
            });
        }

        // Shuffle pieces (Math.random is acceptable for game shuffling)
        for (let i = newPieces.length - 1; i > 0; i--) {
            // eslint-disable-next-line sonarjs/pseudo-random
            const j = Math.floor(Math.random() * (i + 1));
            const temp = newPieces[i].currentIndex;
            newPieces[i].currentIndex = newPieces[j].currentIndex;
            newPieces[j].currentIndex = temp;
        }

        setPieces(newPieces);
        setIsCompleted(false);
        drawPuzzle(newPieces, img);
    };

    const drawPuzzle = (piecesArray: PuzzlePiece[], img: HTMLImageElement) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match container
        const containerWidth = Math.min(window.innerWidth * 0.85, 800);
        const containerHeight = Math.min(window.innerHeight * 0.65, 800);

        canvas.width = containerWidth;
        canvas.height = containerHeight;

        const pieceWidth = canvas.width / gridSize;
        const pieceHeight = canvas.height / gridSize;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw each piece
        piecesArray.forEach((piece) => {
            const gridX = piece.currentIndex % gridSize;
            const gridY = Math.floor(piece.currentIndex / gridSize);

            const sourceX = piece.correctIndex % gridSize;
            const sourceY = Math.floor(piece.correctIndex / gridSize);

            const sx = (sourceX * img.width) / gridSize;
            const sy = (sourceY * img.height) / gridSize;
            const sw = img.width / gridSize;
            const sh = img.height / gridSize;

            const dx = gridX * pieceWidth;
            const dy = gridY * pieceHeight;
            const dw = pieceWidth;
            const dh = pieceHeight;

            // Draw piece
            ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

            // Highlight selected piece with glow
            if (draggedPiece === piece.id) {
                ctx.shadowColor = '#10b981';
                ctx.shadowBlur = 20;
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 6;
                ctx.strokeRect(dx, dy, dw, dh);
                ctx.shadowBlur = 0;
            } else {
                // Simple border for unselected pieces
                ctx.strokeStyle = '#e2e8f0';
                ctx.lineWidth = 2;
                ctx.strokeRect(dx, dy, dw, dh);
            }

            // Subtle green tint for correct placement
            if (piece.currentIndex === piece.correctIndex && draggedPiece !== piece.id) {
                ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
                ctx.fillRect(dx, dy, dw, dh);
            }
        });
    };

    useEffect(() => {
        if (loadedImage && pieces.length > 0) {
            drawPuzzle(pieces, loadedImage);
        }
    }, [pieces, draggedPiece, loadedImage, gridSize]);

    const checkCompletion = (piecesArray: PuzzlePiece[]) => {
        const allCorrect = piecesArray.every(p => p.currentIndex === p.correctIndex);
        if (allCorrect && !isCompleted) {
            setIsCompleted(true);
            setShowConfetti(true);

            const asset = puzzleAssets.find(a => a.id === selectedAsset);
            if (asset) {
                speakBuddyText(`Amazing! You completed the ${asset.label} puzzle! You're so smart!`, 'Puck');
                // Remove from inventory after completion
                setTimeout(() => {
                    removePuzzleAsset(asset.id);
                }, 2000);
            }

            setTimeout(() => {
                setShowConfetti(false);
            }, 3000);
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isCompleted) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const pieceWidth = canvas.width / gridSize;
        const pieceHeight = canvas.height / gridSize;

        const col = Math.floor(x / pieceWidth);
        const row = Math.floor(y / pieceHeight);
        const clickedIndex = row * gridSize + col;

        const clickedPiece = pieces.find(p => p.currentIndex === clickedIndex);
        if (!clickedPiece) return;

        if (draggedPiece === null) {
            // First click - select piece
            setDraggedPiece(clickedPiece.id);
        } else {
            // Second click - swap pieces
            const firstPiece = pieces.find(p => p.id === draggedPiece);
            if (firstPiece && firstPiece.id !== clickedPiece.id) {
                const newPieces = [...pieces];
                const temp = firstPiece.currentIndex;
                firstPiece.currentIndex = clickedPiece.currentIndex;
                clickedPiece.currentIndex = temp;
                setPieces(newPieces);
                checkCompletion(newPieces);
            }
            setDraggedPiece(null);
        }
    };

    const handleAssetSelect = (assetId: string) => {
        setSelectedAsset(assetId);
        setDraggedPiece(null);
        setIsCompleted(false);
        setShowConfetti(false);
    };

    const handleBackToMenu = () => {
        setSelectedAsset(null);
        setDraggedPiece(null);
        setIsCompleted(false);
        setShowConfetti(false);
        setPieces([]);
        setLoadedImage(null);
    };

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 rounded-3xl p-4 shadow-2xl text-slate-700 relative overflow-hidden">
            {/* Confetti */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-[fall_3s_ease-in-out_forwards]"
                            style={{
                                /* eslint-disable sonarjs/pseudo-random */
                                left: `${Math.random() * 100}%`,
                                top: '-20px',
                                animationDelay: `${Math.random() * 0.5}s`,
                                /* eslint-enable sonarjs/pseudo-random */
                            }}
                        >
                            <span className="text-3xl">
                                {/* eslint-disable-next-line sonarjs/pseudo-random */}
                                {['🎉', '✨', '🌟', '🎊', '🎈'][Math.floor(Math.random() * 5)]}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Header - Simplified for clarity */}
            {selectedAsset ? (
                <div className="flex items-center justify-center mb-4 z-10 relative">
                    <button
                        onClick={handleBackToMenu}
                        className="absolute left-0 bg-white/90 hover:bg-white text-slate-600 font-bold p-3 rounded-full shadow-lg transition-transform active:scale-95"
                        aria-label="Back to menu"
                    >
                        <span className="text-2xl">🏠</span>
                    </button>
                    <h2 className="text-3xl font-bold text-purple-600">🧩</h2>

                    {/* Shuffle button - moved to top right, less prominent */}
                    <button
                        onClick={() => loadedImage && initializePuzzle(loadedImage)}
                        className="absolute right-0 bg-white/70 hover:bg-white/90 text-slate-500 font-bold p-2 rounded-full shadow-md transition-transform active:scale-95"
                        aria-label="Shuffle puzzle"
                    >
                        <span className="text-xl">🔄</span>
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-center mb-4 z-10">
                    <h2 className="text-3xl font-bold text-purple-600">🧩</h2>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 flex items-center justify-center overflow-auto">
                {!selectedAsset ? (
                    // Asset Selection Grid - Minimal
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4 max-w-5xl">
                        {puzzleAssets.length === 0 ? (
                            <div className="col-span-full text-center p-12 bg-white/60 rounded-3xl shadow-lg">
                                <div className="text-8xl mb-6">🎁</div>
                                <p className="text-2xl font-bold text-slate-600">Play Scratch Reveal!</p>
                            </div>
                        ) : (
                            puzzleAssets.map((asset) => (
                                <button
                                    key={asset.id}
                                    onClick={() => handleAssetSelect(asset.id)}
                                    className="bg-white/90 backdrop-blur-sm p-3 rounded-3xl shadow-xl border-4 border-purple-200 hover:border-purple-400 hover:scale-105 transition-all"
                                >
                                    <img
                                        src={asset.imageUrl}
                                        alt={asset.label}
                                        className="w-full h-40 object-cover rounded-2xl"
                                    />
                                </button>
                            ))
                        )}
                    </div>
                ) : (
                    // Puzzle Canvas - Clean and focused
                    <div className="flex flex-col items-center gap-6">
                        <canvas
                            ref={canvasRef}
                            onClick={handleCanvasClick}
                            className="rounded-3xl shadow-2xl border-8 border-white cursor-pointer"
                            style={{
                                maxWidth: '85vw',
                                maxHeight: '70vh',
                            }}
                        />

                        {isCompleted && (
                            <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-12 py-6 rounded-full shadow-2xl">
                                <p className="text-4xl font-bold">🎉 🎉 🎉</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default PuzzleGame;
