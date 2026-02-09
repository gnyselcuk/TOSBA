import { useCallback } from 'react';

// Sound file paths
const SOUNDS = {
    POP: '/sounds/pop.mp3',
    EAT: '/sounds/eat.mp3',
    ERROR: '/sounds/error.mp3',
    SUCCESS: '/sounds/success.mp3',
} as const;

type SoundType = keyof typeof SOUNDS;

export const useSound = () => {
    const playSound = useCallback((type: SoundType) => {
        try {
            const audio = new Audio(SOUNDS[type]);
            audio.volume = 0.5; // Default volume

            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Auto-play was prevented or file not found
                    console.warn(`Sound playback failed for ${type}:`, error);
                });
            }
        } catch (e) {
            console.error("Audio playback error:", e);
        }
    }, []);

    return { playSound };
};
