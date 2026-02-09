import React, { useState, useEffect, useRef } from 'react';

// --- TEMPLATE E: CAMERA VERIFY (Real World Scavenger Hunt) ---
interface CameraVerifyProps {
    targetItem: string;
    instruction: string;
    onVerify: (image: string) => Promise<{ success: boolean; feedback: string }>;
    onComplete: (success: boolean) => void;
}

export const CameraVerifyTemplate: React.FC<CameraVerifyProps> = ({ instruction, onVerify, onComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [cameraActive, setCameraActive] = useState(false);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Rear camera preferred
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setCameraActive(true);
            }
        } catch (e) {
            console.error("Camera Error", e);
            setFeedback("Please allow camera access.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setCameraActive(false);
        }
    };

    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current || isCapturing) return;

        setIsCapturing(true);
        setFeedback("Analyzing...");

        // Set dimensions match video
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;

        const context = canvasRef.current.getContext('2d');
        if (context) {
            context.drawImage(videoRef.current, 0, 0);

            const imageData = canvasRef.current.toDataURL('image/png');

            // Send to parent for verification
            const result = await onVerify(imageData);

            setFeedback(result.feedback);

            if (result.success) {
                // Keep image frozen on canvas? Not needed, just stop camera maybe
                setTimeout(() => onComplete(true), 2000);
            } else {
                setIsCapturing(false);
            }
        }
    };

    return (
        // Use fixed inset-0 to break out of any padding restrictions and ensure full screen
        // z-0 ensures it sits behind the top bar (z-20) and buddy (z-50)
        <div className="fixed inset-0 w-full h-full bg-black z-0 flex flex-col items-center justify-center overflow-hidden">

            {/* Camera Feed */}
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                {cameraActive ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center animate-pulse">
                        <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 border border-zinc-700">
                            <span className="text-4xl">📸</span>
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2">Starting Camera...</h3>
                        <p className="text-zinc-400 text-sm">Please allow access if asked.</p>
                    </div>
                )}
            </div>

            {/* Target Area Guide (Visual only) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[80%] h-[50%] border-2 border-white/40 border-dashed rounded-3xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-2xl -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-2xl -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-2xl -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-2xl -mb-1 -mr-1"></div>
                </div>
            </div>

            {/* UI Layer: Controls */}
            <div className="absolute bottom-0 w-full z-10 p-6 pb-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center">

                {/* Status Message Bubble */}
                {feedback && (
                    <div className="mb-8 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-white font-black text-lg text-center shadow-lg animate-fade-in-up">
                        {feedback}
                    </div>
                )}

                {/* Capture Button */}
                <button
                    onClick={handleCapture}
                    disabled={isCapturing || !cameraActive}
                    className={`group relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
                        ${isCapturing ? 'scale-90 opacity-80' : 'hover:scale-105 active:scale-95'}
                    `}
                >
                    {/* Ring */}
                    <div className="absolute inset-0 rounded-full border-4 border-white opacity-80 group-hover:opacity-100 group-hover:border-[6px] transition-all"></div>

                    {/* Inner Circle */}
                    <div className={`w-20 h-20 rounded-full transition-colors duration-300 shadow-inner
                         ${isCapturing ? 'bg-indigo-500 animate-pulse' : 'bg-red-500 group-hover:bg-red-400'}
                    `}></div>

                    {/* Icon/Text */}
                    {isCapturing && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-white/50 border-t-white rounded-full animate-spin"></div>
                        </div>
                    )}
                </button>

                <div className="mt-4 text-white/70 text-xs font-bold tracking-widest uppercase bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                    {instruction || "Tap to Snap"}
                </div>
            </div>

            {/* Hidden Canvas for Capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Animations */}
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
