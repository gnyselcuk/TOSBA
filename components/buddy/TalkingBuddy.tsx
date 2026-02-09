
import React, { useEffect, useState } from 'react';
import { GeminiLiveService } from '../../services/liveService';
import { voiceAnalyser } from '../../services/geminiService';

interface TalkingBuddyProps {
  imageUrl: string;
  liveService: GeminiLiveService | null;
  className?: string;
}

const TalkingBuddy: React.FC<TalkingBuddyProps> = ({ imageUrl, liveService, className }) => {
  const [transformStyle, setTransformStyle] = useState({ y: 0, rotate: 0, scaleY: 1 });

  useEffect(() => {
    let animationFrameId: number;
    let currentY = 0;
    let currentRot = 0;
    let currentScaleY = 1;

    // Helper to get volume from standard AnalyserNode
    const getGlobalVolume = (): number => {
      if (!voiceAnalyser) return 0;
      const array = new Uint8Array(voiceAnalyser.frequencyBinCount);
      voiceAnalyser.getByteFrequencyData(array);
      let sum = 0;
      for (let i = 0; i < array.length; i++) {
        sum += array[i];
      }
      return (sum / array.length) / 255;
    };

    const animate = () => {
      let volume = 0;

      // 1. Check Live Service (Gemini Live)
      if (liveService && liveService.outputAnalyser) {
        volume = liveService.getOutputVolume();
      }
      // 2. Check Global TTS (Standard Game Audio)
      else if (voiceAnalyser) {
        volume = getGlobalVolume();
      }

      // Smooth Animation Logic
      if (volume > 0.005) {
        // TARGET VALUES
        // 1. Hop Up: Move up based on volume (Max 30px up)
        // Note: Negative Y is UP
        const targetY = -Math.min(volume * 80, 40);

        // 2. Wobble: Rotate left/right
        const wobble = Math.sin(Date.now() / 80) * (volume * 10);

        // 3. Squash/Stretch: Stretch UP when loud
        const targetScaleY = 1 + (volume * 0.2);

        // Smooth Interpolation (LERP)
        currentY = currentY + (targetY - currentY) * 0.3;
        currentRot = currentRot + (wobble - currentRot) * 0.2;
        currentScaleY = currentScaleY + (targetScaleY - currentScaleY) * 0.3;
      } else {
        // Decay to rest
        currentY = currentY * 0.8;
        currentRot = currentRot * 0.8;
        currentScaleY = 1 + (currentScaleY - 1) * 0.8;
      }

      setTransformStyle({
        y: currentY,
        rotate: currentRot,
        scaleY: currentScaleY
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [liveService]);

  return (
    <div className={`relative ${className} flex items-end justify-center`}>
      <img
        src={imageUrl}
        alt="Talking Buddy"
        className="object-contain w-full h-full transition-transform will-change-transform"
        style={{
          // Apply the transform
          // translateY: Hops up/down
          // rotate: Wiggles
          // scaleY: Adds a bit of rubbery stretch
          transform: `translateY(${transformStyle.y}px) rotate(${transformStyle.rotate}deg) scaleY(${transformStyle.scaleY})`,

          // CRITICAL: Set origin to bottom-center so it pivots from the feet, not the middle.
          transformOrigin: 'bottom center'
        }}
      />
      {/* Optional Debug Indicator (remove in prod) */}
      {/* <div className="absolute top-0 right-0 text-xs bg-black text-white">{isTalking ? '🔊' : '🔇'}</div> */}
    </div>
  );
};

export default TalkingBuddy;
