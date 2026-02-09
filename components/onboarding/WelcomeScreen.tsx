import React, { useState, useEffect, useRef } from 'react';
import { useUserStore } from '../../store/userStore';
import { AppStage } from '../../types';
import { GeminiLiveService } from '../../services/liveService';
import AudioVisualizer from '../shared/AudioVisualizer';
import { generateProfileAnalysis } from '../../services/geminiService';

const WelcomeScreen: React.FC = () => {
  const { setStage, setProfile, appendContext } = useUserStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Tap microphone to start");
  const liveServiceRef = useRef<GeminiLiveService | null>(null);

  // Accumulated transcript
  const transcriptRef = useRef<string>("");

  // Auto-process function
  const finishOnboarding = async () => {
    if (!liveServiceRef.current) return;

    await liveServiceRef.current.disconnect();
    setIsConnected(false);
    setStatus("Analyzing conversation...");

    const fullTranscript = transcriptRef.current;

    // SAVE TO MEMORY
    appendContext(`Initial Parent Interview Transcript:\n${fullTranscript}`);

    if (fullTranscript.length < 10) {
      console.warn("Transcript too short, using fallback.");
      const fallbackProfile = {
        name: "Hero",
        chronologicalAge: 10,
        developmentalAge: 5,
        interests: ["Space", "Rockets"],
        avoidances: ["Loud noises"],
        sensoryTriggers: ["Loud noises"]
      };
      setProfile(fallbackProfile);
      appendContext(`Profile Generated (Fallback): ${JSON.stringify(fallbackProfile)}`);
      setStage(AppStage.PHOTO_SETUP);
      return;
    }

    const profile = await generateProfileAnalysis(fullTranscript);
    if (profile) {
      setProfile(profile);
      appendContext(`Profile Generated (AI Analysis): ${JSON.stringify(profile)}`);
      setStage(AppStage.PHOTO_SETUP);
    } else {
      setStatus("Analysis failed. Please try again.");
    }
  };

  // --- BYPASS MECHANISM ---
  const handleQuickStart = () => {
    if (isProcessing) return;
    setIsProcessing(true);

    // Inject a robust mock profile
    const mockProfile = {
      name: "Marcel",
      chronologicalAge: 15,
      developmentalAge: 14,
      interests: ["Anime", "Space", "Football"],
      avoidances: ["Crowds"],
      sensoryTriggers: ["Loud Sirens"]
    };

    setProfile(mockProfile);
    appendContext(`Quick Start Used. Profile: ${JSON.stringify(mockProfile)}`);

    // Add a small delay for UX feel
    setStatus("Loading Demo Profile...");
    setTimeout(() => {
      setStage(AppStage.PHOTO_SETUP);
    }, 500);
  };
  // ------------------------

  const handleStart = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      setStatus("Connecting to AI...");
      // Initialize with callback to accumulate text
      liveServiceRef.current = new GeminiLiveService((text, isUser, isFinal) => {
        // Only log to transcript if the turn is complete (isFinal)
        // Prevents duplicate "streaming" logs
        if (isFinal) {
          const line = isUser ? `Parent: ${text}` : `AI: ${text}`;
          transcriptRef.current += `\n${line}`;

          // Check for completion signal from AI
          if (!isUser && text.includes("PROFILE_COMPLETED")) {
            finishOnboarding();
          }
        }
      });

      const systemPrompt = `
        You are 'TOSBA', a friendly, empathetic AI guide for autistic children and their parents.
        Your goal is to interview the parent to build a comprehensive profile for their child.
        
        Step 1: Introduce yourself warmly and explain that knowing the child better helps you create perfect games.
        
        Step 2: Ask these questions naturally (one by one, wait for answer). Do not overwhelm the parent:
          1. Child's Name & Age (Chronological and Developmental level).
          2. **Communication Style:** Is the child verbal, non-verbal, using PECS/signs, or mixed?
          3. **Special Interests:** What does the child LOVE? (e.g. trains, dinosaurs, logos).
          4. **Sensory Profile:** Any sensitivities (loud noises, textures) or seeking behaviors?
          5. **Strengths / Superpowers:** What is the child really good at? (e.g. puzzles, memory, music).
          6. **Current Goals:** Is there a specific skill you or their therapist is working on right now?

        Step 3: Once you have gathered sufficient info, summarize it briefly to confirm.
        
        Step 4: Ask: "Do you have any questions for me before we start?"
        
        Step 5: If the parent is ready, you MUST say exactly:
        "Great! Let's go create your buddy now. PROFILE_COMPLETED"
        
        (The phrase PROFILE_COMPLETED is a secret code. Use it ONLY when the interview is fully done).
      `;

      await liveServiceRef.current.connect(systemPrompt);

      // Kickstart the model to speak first
      await liveServiceRef.current.sendText("Hello, please introduce yourself.");

      setIsConnected(true);
      setIsProcessing(false);
      setStatus("Listening... (Tosba is speaking)");
    } catch (e) {
      console.error(e);
      setStatus("Connection failed. Check API Key.");
      setIsProcessing(false);
    }
  };

  const handleStop = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    finishOnboarding();
  };

  useEffect(() => {
    return () => {
      liveServiceRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-sky-600 mb-2">TOSBA</h1>
        <p className="text-slate-500">Parent Onboarding</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
        <div className="mb-6 h-32 flex items-center justify-center">
          {isConnected ? (
            <AudioVisualizer isActive={true} />
          ) : (
            <div className="text-6xl">🎙️</div>
          )}
        </div>

        <h2 className="text-2xl font-semibold text-slate-700 mb-4">
          {isConnected ? "Conversation Active" : "Let's get to know you"}
        </h2>

        <p className="text-slate-500 mb-8 h-12">
          {status}
        </p>

        {!isConnected ? (
          <div className="space-y-3">
            <button
              onClick={handleStart}
              disabled={isProcessing}
              className="w-full py-4 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-2xl text-xl font-bold transition-transform active:scale-95 shadow-lg shadow-sky-200"
            >
              {isProcessing ? 'Connecting...' : 'Start Conversation'}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold uppercase">Development</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <button
              onClick={handleQuickStart}
              disabled={isProcessing}
              className="w-full py-3 bg-white border-2 border-slate-100 hover:bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed text-slate-500 rounded-2xl text-sm font-bold transition-colors"
            >
              ⚡ Quick Start (Skip Interview)
            </button>
          </div>
        ) : (
          <button
            onClick={handleStop}
            disabled={isProcessing}
            className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-2xl text-xl font-bold transition-transform active:scale-95 shadow-lg shadow-rose-200"
          >
            {isProcessing ? 'Processing...' : 'Finish Manually'}
          </button>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;