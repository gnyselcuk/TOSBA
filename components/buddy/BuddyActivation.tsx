
import React, { useEffect, useState, useRef } from 'react';
import { useUserStore } from '../../store/userStore';
import { GeminiLiveService } from '../../services/liveService';
import AudioVisualizer from '../shared/AudioVisualizer';
import TalkingBuddy from './TalkingBuddy';
import LiveSpeechBubble from '../shared/LiveSpeechBubble';
import { AppStage } from '../../types';

const BuddyActivation: React.FC = () => {
  const { buddy, profile, setStage } = useUserStore();
  const [isConnected, setIsConnected] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<{text: string, isUser: boolean}>({ text: "", isUser: false });
  
  const liveServiceRef = useRef<GeminiLiveService | null>(null);

  useEffect(() => {
    if (!buddy || !profile) return;

    const startInteraction = async () => {
      liveServiceRef.current = new GeminiLiveService((text, isUser) => {
         setLiveTranscript({ text, isUser });
      });
      
      const systemInstruction = `
        You are ${buddy.name}, a new digital friend for a child named ${profile.name}.
        You have the personality: ${buddy.personality}.
        
        TASK:
        1. Say hello enthusiastically to ${profile.name}.
        2. Introduce yourself in 1 short sentence.
        
        IMPORTANT: Keep your responses SHORT (under 15 words).
      `;

      try {
        await liveServiceRef.current.connect(systemInstruction, buddy.voiceName);
        setIsConnected(true);
        await liveServiceRef.current.sendText("Hello! I am awake!");
      } catch (e) {
        console.error("Failed to activate buddy:", e);
      }
    };

    startInteraction();

    return () => {
      liveServiceRef.current?.disconnect();
    };
  }, [buddy, profile]);

  const handleStartPlaying = () => {
    // ROUTE TO THE NEW UNIFIED ASSESSMENT
    setStage(AppStage.ASSESSMENT_SESSION);
  };

  if (!buddy) return null;

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-6 relative overflow-hidden text-slate-800">
      
      <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-200 rounded-full blur-3xl opacity-30"></div>
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-pink-200 rounded-full blur-3xl opacity-30"></div>

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-4xl">
        
        <h1 className="text-4xl md:text-5xl font-black mb-12 text-indigo-900 animate-fade-in-down drop-shadow-sm">
            Say Hello to {buddy.name}!
        </h1>

        <div className="relative mb-12 flex justify-center items-center w-full">
           
           <div className="relative w-64 h-64 md:w-96 md:h-96">
               <div className={`absolute inset-0 bg-indigo-500 rounded-full blur-3xl transition-opacity duration-1000 ${isConnected ? 'opacity-20 animate-pulse' : 'opacity-0'}`}></div>
               
               <TalkingBuddy 
                  imageUrl={buddy.imageUrl} 
                  liveService={liveServiceRef.current}
                  className="w-full h-full z-10 drop-shadow-2xl"
               />

               <LiveSpeechBubble 
                  text={liveTranscript.text} 
                  isUser={liveTranscript.isUser} 
                  isVisible={!!liveTranscript.text}
               />
           </div>

           {isConnected && (
             <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 z-20 w-full flex justify-center">
                <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-indigo-100 flex items-center space-x-3">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Listening</span>
                    <AudioVisualizer isActive={true} color="bg-indigo-500" />
                </div>
             </div>
           )}
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-indigo-50 max-w-md w-full mt-8 md:mt-12 z-20">
            <p className="text-xl font-bold mb-4 text-slate-700">
               {isConnected 
                 ? `${buddy.name} wants to talk!` 
                 : "Waking up..."}
            </p>

            <div className="flex justify-center mb-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all ${isConnected ? 'bg-green-500 text-white animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'bg-slate-100 text-slate-400'}`}>
                    🎙️
                </div>
            </div>

            <button
                onClick={handleStartPlaying}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xl shadow-lg shadow-indigo-200 transform transition-transform active:scale-95"
            >
                Let&apos;s Play Games! 🚀
            </button>
        </div>
      </div>
    </div>
  );
};

export default BuddyActivation;
