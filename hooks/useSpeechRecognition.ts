
import { useState, useEffect, useRef } from 'react';

// Browser Compatibility - Type definitions for Speech Recognition API
interface SpeechRecognitionEvent {
    resultIndex: number;
    results: {
        [index: number]: {
            [index: number]: {
                transcript: string;
            };
        };
    };
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: () => void;
    onend: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    start: () => void;
    stop: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeechRecognition = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(true);

    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    useEffect(() => {
        if (!SpeechRecognition) {
            setIsSupported(false);
            console.error("Browser does not support Speech Recognition.");
            return;
        }

        const recognition = new SpeechRecognition() as SpeechRecognitionInstance;
        recognition.continuous = false; // Stop after first result
        recognition.interimResults = false;
        recognition.lang = 'en-US'; // Default, logic can handle dynamic

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const current = event.resultIndex;
            const transcript = event.results[current][0].transcript;
            // eslint-disable-next-line no-console
            console.log("Heard:", transcript);
            setTranscript(transcript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("Speech Error:", event.error);
            setError(event.error);
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    }, []);

    const startListening = (lang: string = 'en-US') => {
        if (!recognitionRef.current || !isSupported) return;
        try {
            recognitionRef.current.lang = lang;
            recognitionRef.current.start();
            setError(null);
            setTranscript("");
        } catch (e) {
            console.warn("Recognition already started or failed", e);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        isSupported,
        error
    };
};
