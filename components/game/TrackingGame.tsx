import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AssessmentItem } from '../../types';

// --- TEMPLATE H: TRACKING (Line Tracing / Motor Skills) ---
interface TrackingProps {
    items: AssessmentItem[];
    onComplete: (success: boolean) => void;
}

// Define available track shapes
const TRACK_PATHS = [
    { id: 'arch', d: "M 40 250 Q 200 50, 360 250", name: "The Rainbow Bridge" },
    { id: 'wave', d: "M 40 150 Q 120 50, 200 150 T 360 150", name: "The Wiggle Worm" },
    { id: 'hill', d: "M 40 200 C 100 200, 100 100, 200 100 S 300 200, 360 200", name: "The Rollercoaster" },
    { id: 'zigzag', d: "M 40 250 L 120 100 L 200 250 L 280 100 L 360 250", name: "The Lightning Bolt" }
];

export const TrackingTemplate: React.FC<TrackingProps> = ({ onComplete }) => {
    // --- 1. Game State ---
    const [currentShapeIdx, setCurrentShapeIdx] = useState(0);
    const [direction, setDirection] = useState<'LTR' | 'RTL'>('LTR');
    const [progress, setProgress] = useState(0); // 0.0 to 1.0
    const [isDragging, setIsDragging] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [deviationWarning, setDeviationWarning] = useState(false);

    // Refs
    const svgRef = useRef<SVGSVGElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const [pathPoints, setPathPoints] = useState<{ x: number, y: number, length: number }[]>([]);
    const lastIndexRef = useRef<number>(0);

    // Select styling based on items or random
    const themeColor = useMemo(() => {
        const colors = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b']; // Violet, Pink, Emerald, Amber
        // eslint-disable-next-line sonarjs/pseudo-random
        return colors[Math.floor(Math.random() * colors.length)];
    }, []);

    // Pick a shape and DIRECTION on mount
    useEffect(() => {
        /* eslint-disable sonarjs/pseudo-random */
        setCurrentShapeIdx(Math.floor(Math.random() * TRACK_PATHS.length));
        setDirection(Math.random() > 0.5 ? 'RTL' : 'LTR');
        /* eslint-enable sonarjs/pseudo-random */
    }, []);

    const currentPath = TRACK_PATHS[currentShapeIdx];

    // --- 2. Path Calculation ---
    useEffect(() => {
        if (!pathRef.current) return;

        const timer = setTimeout(() => {
            if (!pathRef.current) return;
            const len = pathRef.current.getTotalLength();
            const points = [];
            const resolution = 2; // 1 point every 2px

            for (let i = 0; i <= len; i += resolution) {
                const pt = pathRef.current.getPointAtLength(i);
                points.push({ x: pt.x, y: pt.y, length: i });
            }
            setPathPoints(points);
            setProgress(0);
            lastIndexRef.current = 0;
        }, 50);

        return () => clearTimeout(timer);
    }, [currentShapeIdx, direction]); // Re-calculate if direction changes (transform affects point coords if handled there or not)


    // --- 3. Interaction Logic ---
    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (completed) return;
        setIsDragging(true);
        handleMove(e);
    };

    const handleEnd = () => {
        setIsDragging(false);
        setDeviationWarning(false);

        if (progress > 0.95) {
            handleCompletion();
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || completed || !svgRef.current || pathPoints.length === 0) return;
        if (e.cancelable) e.preventDefault();

        let clientX, clientY;
        let isTouch = false;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
            isTouch = true;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const rect = svgRef.current.getBoundingClientRect();
        const scaleX = 400 / rect.width;
        const scaleY = 300 / rect.height;

        const touchOffsetPixels = isTouch ? 60 : 0;
        const svgOffsetY = touchOffsetPixels * scaleY;

        const rawSvgX = (clientX - rect.left) * scaleX;
        const svgY = ((clientY - rect.top) * scaleY) - svgOffsetY;

        // MIRROR LOGIC: If RTL, flip the Input X coordinate
        const svgX = direction === 'RTL' ? 400 - rawSvgX : rawSvgX;

        // Windowed Search
        const SEARCH_WINDOW = 60;
        const startIndex = Math.max(0, lastIndexRef.current - SEARCH_WINDOW);
        const endIndex = Math.min(pathPoints.length - 1, lastIndexRef.current + SEARCH_WINDOW);

        let closestPt = pathPoints[lastIndexRef.current];
        let minDist = Infinity;
        let foundIndex = lastIndexRef.current;

        for (let i = startIndex; i <= endIndex; i++) {
            const pt = pathPoints[i];
            const dx = pt.x - svgX;
            const dy = pt.y - svgY;
            const dist = dx * dx + dy * dy;

            if (dist < minDist) {
                minDist = dist;
                closestPt = pt;
                foundIndex = i;
            }
        }

        if (minDist > 3600) {
            setDeviationWarning(true);
            return;
        }
        setDeviationWarning(false);

        lastIndexRef.current = foundIndex;

        const currentTotalLen = pathRef.current?.getTotalLength() || 1;
        const newProgress = closestPt.length / currentTotalLen;

        setProgress(newProgress);

        if (newProgress >= 0.98) {
            handleCompletion();
        }
    };

    const handleCompletion = () => {
        if (completed) return;
        setCompleted(true);
        setIsDragging(false);
        setProgress(1); // Snap to end
        setShowConfetti(true);

        const audio = new Audio('/sounds/success.mp3');
        audio.play().catch(() => { });

        setTimeout(() => {
            onComplete(true);
        }, 2000);
    };

    const getAvatarPos = () => {
        if (!pathRef.current) return { x: 40, y: 150 };

        if (pathPoints.length > 0) {
            const idx = Math.min(Math.floor(progress * (pathPoints.length - 1)), pathPoints.length - 1);
            return pathPoints[idx];
        }

        const len = pathRef.current.getTotalLength();
        const pt = pathRef.current.getPointAtLength(progress * len);
        return { x: pt.x, y: pt.y };
    };

    const avatarPos = getAvatarPos();

    // Start/End Visuals
    const startX = 40;
    const startY = parseInt(currentPath.d.split(' ')[2]);
    const endX = pathPoints.length > 0 ? pathPoints[pathPoints.length - 1].x : 360;
    const endY = pathPoints.length > 0 ? pathPoints[pathPoints.length - 1].y : 150;

    return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50 relative overflow-hidden select-none touch-none rounded-3xl">

            {/* Header / Instructions */}
            <div className="absolute top-4 w-full text-center z-10 px-6 pointer-events-none">
                <h3 className="text-xl font-bold text-slate-700 opacity-90 backdrop-blur-sm bg-white/60 inline-block px-6 py-2 rounded-full shadow-sm border border-white/50">
                    {completed ? "Yummy! 🐛�" : "Help Hungry Caterpillar!"}
                </h3>
            </div>

            {/* Main Game Area */}
            <div className="relative w-full max-w-lg aspect-[4/3] bg-white rounded-3xl shadow-xl border-4 border-slate-100 flex items-center justify-center m-4 overflow-hidden">

                {/* SVG Canvas */}
                <svg
                    ref={svgRef}
                    viewBox="0 0 400 300"
                    className="w-full h-full cursor-pointer touch-none"
                    style={{ touchAction: 'none' }}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                >
                    <defs>
                        <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#e2e8f0" />
                            <stop offset="100%" stopColor="#cbd5e1" />
                        </linearGradient>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={themeColor} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={themeColor} />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* --- FLIPPABLE CONTAINER --- */}
                    {/* If RTL, we translate by 400 (width) and scale -1 on X to flip horizontally */}
                    <g transform={direction === 'RTL' ? "translate(400, 0) scale(-1, 1)" : ""}>

                        {/* 1. Track Background */}
                        <path
                            d={currentPath.d}
                            fill="none"
                            stroke="#f1f5f9"
                            strokeWidth="50"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* 2. Track Guide */}
                        <path
                            ref={pathRef}
                            d={currentPath.d}
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="4"
                            strokeDasharray="12, 12"
                            strokeLinecap="round"
                            opacity="0.5"
                        />

                        {/* 3. Progress Line */}
                        {pathRef.current && (
                            <path
                                d={currentPath.d}
                                fill="none"
                                stroke={`url(#progressGradient)`}
                                strokeWidth="50"
                                strokeLinecap="round"
                                strokeDasharray={pathRef.current.getTotalLength()}
                                strokeDashoffset={(1 - progress) * pathRef.current.getTotalLength()}
                                style={{ transition: isDragging ? 'none' : 'stroke-dashoffset 0.5s ease-out' }}
                            />
                        )}

                        {/* 4. Start Point Indicator */}
                        <circle cx={startX} cy={startY} r="15" fill={themeColor} opacity="0.5" />

                        {/* End Point (Leaf Goal) */}
                        <g transform={`translate(${endX}, ${endY})`}>
                            {/* NOTE: If container is flipped RTL, this image inside is ALSO flipped. 
                                Leaf orientation usually doesn't matter, but if we wanted to preserve it, we'd need another flip. 
                                For a leaf, flipping is fine/good variation. */}
                            <image
                                href="/assets/games/tracking/leaf.png"
                                x="-40" y="-40"
                                width="80" height="80"
                                className={`transition-all duration-500 ${completed ? 'scale-125' : 'scale-100 animate-pulse'}`}
                            />
                        </g>

                        {/* 5. The Avatar (Caterpillar) */}
                        <g
                            transform={`translate(${avatarPos.x}, ${avatarPos.y})`}
                            style={{ cursor: 'grab', transition: isDragging ? 'none' : 'transform 0.1s' }}
                        >
                            {/* Glow Ring */}
                            {isDragging && (
                                <circle r="40" fill={themeColor} opacity="0.2" className="animate-pulse" />
                            )}

                            {/* Deviation Warning */}
                            {deviationWarning && (
                                <circle r="50" fill="#ef4444" opacity="0.3" className="animate-ping" />
                            )}

                            {/* Character Image */}
                            {/* MIRROR FIX: If we are in RTL mode, the container <g> is flipping everything.
                                 A right-facing caterpillar will become Left-facing. This is CORRECT for RTL movement.
                                 So we don't need extra logic here unless the sprite native direction is wrong.
                                 Assuming sprite faces Right (standard).
                             */}
                            <image
                                href="/assets/games/tracking/caterpiller.png"
                                x="-35" y="-35"
                                width="70" height="70"
                                style={{
                                    filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.25))'
                                }}
                            />
                        </g>
                    </g>
                </svg>

                {/* Confetti */}
                {showConfetti && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className="absolute text-2xl animate-fall" style={{
                                /* eslint-disable sonarjs/pseudo-random */
                                left: `${Math.random() * 100}%`,
                                top: `-10%`,
                                animationDuration: `${1 + Math.random() * 2}s`,
                                animationDelay: `${Math.random() * 0.5}s`
                                /* eslint-enable sonarjs/pseudo-random */
                            }}>
                                {/* eslint-disable-next-line sonarjs/pseudo-random */}
                                {['🎉', '⭐', '✨', '🌈', '🍃'][Math.floor(Math.random() * 5)]}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Helper Text */}
            <p className={`text-slate-400 text-sm font-medium transition-opacity duration-300 ${isDragging ? 'opacity-0' : 'opacity-100 animate-pulse'}`}>
                {deviationWarning ? "Stay on the track!" : "Hold & Drag to Start"}
            </p>

            <style>{`
                @keyframes fall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(400px) rotate(360deg); opacity: 0; }
                }
                .animate-fall {
                    animation: fall forwards ease-in;
                }
            `}</style>
        </div>
    );
};
