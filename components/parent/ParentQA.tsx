import React, { useState, useRef, useEffect } from 'react';
import { useUserStore } from '../../store/userStore';
import { AppStage, ChatMessage } from '../../types';
import { GoogleGenAI } from "@google/genai";

const ParentQA: React.FC = () => {
  const { setStage, profile, globalContext, performanceLogs, curriculum } = useUserStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `Hello. I am TOSBA's AI Support Guide. I can share insights about ${profile?.name}'s progress or suggest strategies. Please remember I am an AI, not a doctor.` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      // 1. Calculate Real-time Context
      const completedIds = useUserStore.getState().completedModuleIds;
      const totalModules = curriculum?.weeklySchedule?.flatMap(d => d.modules || []).length || 0;
      const completionRate = totalModules > 0 ? Math.round((completedIds.length / totalModules) * 100) : 0;

      const systemPrompt = `
        You are an expert Special Education Consultant and Child Psychologist specializing in Autism Spectrum Disorder (ASD).
        
        CHILD PROFILE:
        Name: ${profile?.name}
        Age: ${profile?.chronologicalAge} (Dev: ${profile?.developmentalAge})
        Interests: ${profile?.interests.join(', ')}
        Sensitivities: ${profile?.avoidances.join(', ')}
        
        CURRICULUM STATUS:
        Theme: ${curriculum?.theme}
        Branch: ${curriculum?.branchTitle}
        Progress: ${completionRate}% (${completedIds.length}/${totalModules} modules completed)
        
        PERFORMANCE METRICS (Last 7 Days):
        - High Stress Events: ${performanceLogs.filter(l => l.stressLevel === 'HIGH').length}
        - Total Sessions: ${performanceLogs.length}

        FULL SYSTEM HISTORY (Context Memory):
        ${globalContext}
        
        RECENT SESSION LOGS (Last 10):
        ${JSON.stringify(performanceLogs.slice(0, 10))}

        Guidelines:
        1. Be empathetic, professional, and evidence-based (ABA, ESDM based).
        2. Keep answers concise (under 100 words) but helpful.
        3. Use the SYSTEM HISTORY to provide specific, context-aware answers (e.g. "I saw he struggled with the matching game...").
        4. REFER SPECIFICALLY to the performance logs and interaction data if relevant.
        5. If the parent asks about "Meltdowns" or "Safety", prioritize calming strategies and safety first.
        6. You are talking to the PARENT, not the child.
      `;

      // Simplified chat history for the prompt
      const chatHistory = messages.map(m => `${m.role === 'user' ? 'Parent' : 'AI Guide'}: ${m.text}`).join('\n');
      const finalPrompt = `${systemPrompt}\n\nCurrent Session Chat:\n${chatHistory}\nParent: ${userMsg.text}\nAI Guide:`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: finalPrompt,
      });

      const text = response.text || "I apologize, I'm having trouble connecting to my knowledge base right now.";

      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white">
            🎓
          </div>
          <div>
            <h1 className="font-bold text-slate-700 leading-tight">AI Parent Support</h1>
            <p className="text-xs text-slate-500">Intelligent Guide (Powered by Gemini)</p>
          </div>
        </div>
        <button
          onClick={() => setStage(AppStage.PARENT_DASHBOARD)}
          className="text-slate-400 hover:text-slate-600 font-bold text-sm"
        >
          ✕ Close
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
              ? 'bg-indigo-600 text-white rounded-br-none'
              : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
              }`}>
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex space-x-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t border-slate-200">
        <div className="max-w-4xl mx-auto flex space-x-2">
          <input
            type="text"
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ask about curriculum, behavior, or strategies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 px-4 py-2 text-[10px] text-amber-800 text-center border-t border-amber-100">
        ⚠️ <strong>Disclaimer:</strong> This is an AI system, not a human expert. It may generate incorrect information. Always consult with a qualified medical professional for diagnosis or treatment.
      </div>
    </div >
  );
};

export default ParentQA;