
import React, { useEffect, useState } from 'react';

interface LiveSpeechBubbleProps {
  text: string;
  isUser: boolean;
  isVisible: boolean;
}

const LiveSpeechBubble: React.FC<LiveSpeechBubbleProps> = ({ text, isUser, isVisible }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
     setDisplayedText(text);
  }, [text]);

  if (!isVisible || !text) return null;

  return (
    <div 
        className={`absolute z-20 p-4 rounded-2xl shadow-xl border-2 backdrop-blur-sm animate-fade-in-up transition-all duration-300 min-w-[140px]
        ${isUser 
            ? 'bg-blue-600 text-white border-blue-700 rounded-tr-none right-0 -top-12 md:-right-12 md:top-0 transform translate-x-0 md:translate-x-full md:-translate-y-full' 
            : 'bg-white text-slate-800 border-indigo-100 rounded-tl-none left-0 -top-16 md:left-full md:top-1/4 md:ml-6 transform -translate-y-0'
        }
        w-auto max-w-[240px] md:max-w-xs
        `}
    >
        {/* Tail */}
        <div className={`absolute w-4 h-4 transform rotate-45 border-2 
            ${isUser 
                ? 'bg-blue-600 border-blue-700 border-l-0 border-t-0 -right-2 top-4 hidden md:block' // Desktop Tail
                : 'bg-white border-indigo-100 border-r-0 border-b-0 -left-2.5 top-6 hidden md:block' // Desktop Tail
            }`} 
        ></div>
        
        {/* Mobile Tail (Bottom/Top positions) */}
        <div className={`absolute w-4 h-4 transform rotate-45 border-2 md:hidden
            ${isUser
                ? 'bg-blue-600 border-blue-700 border-l-0 border-t-0 right-4 -bottom-2'
                : 'bg-white border-indigo-100 border-r-0 border-b-0 left-4 -bottom-2'
            }
        `}></div>

        <p className={`text-lg md:text-xl font-bold leading-snug ${isUser ? 'font-medium' : 'font-fredoka'}`}>
           {displayedText}
           {/* Blinking Cursor for AI stream feeling */}
           {!isUser && <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle"></span>}
        </p>
    </div>
  );
};

export default LiveSpeechBubble;
