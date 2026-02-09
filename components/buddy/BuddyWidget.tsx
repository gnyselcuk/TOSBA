import React, { useState, useRef, useEffect } from 'react';
import { useUserStore } from '../../store/userStore';
import { GeminiLiveService } from '../../services/liveService';
import { setGlobalLiveService, getGlobalLiveService } from '../../services/geminiService';
import AudioVisualizer from '../shared/AudioVisualizer';
import TalkingBuddy from './TalkingBuddy';

interface BuddyWidgetProps {
  context?: string;
  className?: string; // Allow custom positioning if needed, defaulting to fixed
  imageClassName?: string; // Allow custom sizing for the buddy image
}

const BuddyWidget: React.FC<BuddyWidgetProps & { forceHighlight?: boolean; hideBubble?: boolean; disableVoiceChat?: boolean }> = ({ context, className, imageClassName, forceHighlight, hideBubble, disableVoiceChat }) => {
  const { buddy, profile, globalContext, buddyState, setBuddyStatus, addToShortTermHistory, shortTermHistory } = useUserStore();
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const liveServiceRef = useRef<GeminiLiveService | null>(null);

  if (!buddy) return null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (liveServiceRef.current) {
        liveServiceRef.current.disconnect();
        setGlobalLiveService(null); // Clear global reference
      }
    };
  }, []);

  // Helper: Disconnect voice chat
  const disconnectVoiceChat = async () => {
    await liveServiceRef.current?.disconnect();
    liveServiceRef.current = null;
    setGlobalLiveService(null);
    setIsLiveConnected(false);
    setBuddyStatus({ isTalking: false, message: null, activity: 'idle' });
  };

  // Helper: Clean up existing TTS service
  const cleanupExistingService = async () => {
    const existingService = getGlobalLiveService() as GeminiLiveService | null;
    if (existingService && existingService.isConnected) {
      // eslint-disable-next-line no-console
      console.log('🔄 Disconnecting auto-TTS service to upgrade to full conversation mode...');
      try {
        await existingService.disconnect();
      } catch (e) {
        console.warn('Cleanup of auto-service failed:', e);
      }
    }
  };

  // Helper: Build system prompt
  const buildSystemPrompt = () => {
    const historyLog = (shortTermHistory || []).map(m => `${m.role === 'user' ? 'Child' : 'Buddy'}: "${m.text}"`).join('\n');
    
    return `
      You are ${buddy.name}, a ${buddy.personality} companion for a child named ${profile?.name}.
      Your persona description: ${buddy.description}.
      
      PAST MEMORY (Long Term):
      ${globalContext}

      RECENT CONVERSATION HISTORY (Short Term):
      ${historyLog || "No recent conversation."}

      CURRENT CONTEXT / GAME:
      "${context || 'Just hanging out'}"
      
      INSTRUCTIONS:
      1. Keep responses SHORT (under 20 words) unless child asks a detailed question.
      2. Be encouraging and fun.
      3. If the child is silent, wait patiently or say "I'm here!" after 5+ seconds.
      4. Use the History to remember what you just talked about.
      5. DO NOT respond to [CONTEXT] updates unless the child explicitly asks.
      6. Be strategic - only speak when it adds value (encouragement, clarification, celebration).
    `;
  };

  // Helper: Connect voice chat
  const connectVoiceChat = async () => {
    setIsLiveConnected(true);
    setBuddyStatus({ isTalking: true, message: "I'm listening! Ask me anything.", mood: 'excited', activity: 'listening' });

    await cleanupExistingService();

    // Initialize NEW service with Transcription Handler
    liveServiceRef.current = new GeminiLiveService((text, isUser, isFinal) => {
      if (!isUser) {
        setBuddyStatus({ isTalking: true, message: text, activity: 'talking' });
      }
      if (isFinal) {
        addToShortTermHistory({
          role: isUser ? 'user' : 'model',
          text: text
        });
      }
    });

    const systemPrompt = buildSystemPrompt();

    try {
      await liveServiceRef.current.connect(systemPrompt, buddy.voiceName, false);
      setGlobalLiveService(liveServiceRef.current);

      if (context && liveServiceRef.current && typeof liveServiceRef.current.updateContext === 'function') {
        try {
          liveServiceRef.current.updateContext({
            currentModule: context,
            emotion: 'neutral'
          });
        } catch (ctxError) {
          console.warn("Context update failed:", ctxError);
        }
      }

      setTimeout(() => setBuddyStatus({ isTalking: false, message: null }), 3000);
    } catch (e) {
      console.error("Live connection failed", e);
      liveServiceRef.current = null;
      setGlobalLiveService(null);
      setIsLiveConnected(false);
      setBuddyStatus({ isTalking: false, message: "Oops, I can't hear you right now.", mood: 'sad', activity: 'idle' });
      setTimeout(() => setBuddyStatus({ isTalking: false, message: null }), 3000);
    }
  };

  const toggleVoiceChat = async (e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (disableVoiceChat) {
      // eslint-disable-next-line no-console
      console.log('[BuddyWidget] Voice chat disabled in this context');
      return;
    }

    if (isLiveConnected) {
      await disconnectVoiceChat();
    } else {
      await connectVoiceChat();
    }
  };

  // Determine container classes
  // Default is fixed bottom-right. Custom className can override this.
  const containerClass = className || "fixed bottom-0 right-2 md:right-8 z-[100] flex flex-col items-end pointer-events-none";

  // Helper for Mood Emoji
  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case 'happy': return '😊';
      case 'excited': return '🤩';
      case 'sad': return '😟';
      case 'curious': return '🧐';
      case 'neutral': return '😐';
      default: return '🤖';
    }
  };

  return (
    <div className={containerClass}>

      {/* 
          SPEECH BUBBLE & STATUS
          - Shows if buddyState.currentMessage is present (TTS or System message)
          - OR if Live Connected (Status indicator)
      */}
      <div className="pointer-events-auto mb-2 mr-4 flex flex-col items-end space-y-2">

        {/* TEXT BUBBLE (Highest Priority) */}
        {!hideBubble && buddyState.currentMessage && (
          <div className="bg-white p-4 rounded-3xl rounded-br-none shadow-xl border-2 border-indigo-100 max-w-xs animate-pop-in origin-bottom-right relative group">
            {/* Mood Emoji Badge */}
            <div className="absolute -top-3 -left-3 bg-white border-2 border-indigo-50 rounded-full w-8 h-8 flex items-center justify-center text-xl shadow-sm z-10 animate-bounce-slight">
              {getMoodEmoji(buddyState.mood)}
            </div>
            <p className="text-slate-700 font-bold text-sm md:text-base leading-snug pl-2">
              {buddyState.currentMessage}
            </p>
          </div>
        )}

        {/* LIVE STATUS BUBBLE (Only if no text message override) */}
        {isLiveConnected && !buddyState.currentMessage && (
          <div className="bg-white/90 backdrop-blur pl-4 pr-2 py-2 rounded-2xl shadow-xl border-2 border-indigo-100 flex items-center gap-3 animate-fade-in text-indigo-800">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">BUDDY</span>
              <span className="text-sm font-bold text-slate-700">Listening...</span>
            </div>
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <AudioVisualizer isActive={true} color="bg-gradient-to-t from-indigo-400 to-purple-400" />
            <button
              onClick={(e) => toggleVoiceChat(e)}
              className="ml-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            >
              <span className="sr-only">Stop</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 
          BUDDY CHARACTER 
          - Always clickable to toggle Live Mode
          - Animated via TalkingBuddy
      */}
      <div
        className="pointer-events-auto cursor-pointer relative group transition-transform active:scale-95 origin-bottom"
        onClick={toggleVoiceChat}
        title="Click to talk!"
      >
        {/* Hover Hint Bubble (Only when NOT connected and NO message and voice NOT disabled) */}
        {!disableVoiceChat && !isLiveConnected && !buddyState.currentMessage && (
          <div className="absolute -top-12 right-0 bg-white px-4 py-2 rounded-2xl rounded-br-none shadow-lg border border-slate-100 transform scale-0 group-hover:scale-100 transition-transform origin-bottom-right duration-200 pointer-events-none">
            <p className="text-sm font-bold text-slate-600 whitespace-nowrap">Chat with me! 🎙️</p>
          </div>
        )}

        {/* The Character */}
        <div className={`transition-transform duration-300 ${isLiveConnected || forceHighlight ? 'scale-110 translate-y-0' : 'translate-y-4 hover:translate-y-0'}`}>
          <TalkingBuddy
            imageUrl={buddy.imageUrl}
            liveService={liveServiceRef.current}
            // Pass buddyState.isTalking to force animation if TTS is active but maybe voiceAnalyser is acting up? 
            // Currently TalkingBuddy mainly relies on Analyser, which works for both TTS and Live because both output audio.
            className={imageClassName || "w-40 h-40 md:w-56 md:h-56 drop-shadow-2xl filter"}
          />
        </div>
      </div>

    </div>
  );
};

export default BuddyWidget;
