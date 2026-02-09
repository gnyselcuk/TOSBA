import React, { useMemo } from 'react';
import { useUserStore } from '../../store/userStore';
import { AppStage } from '../../types';
import MyBag from './MyBag';
import BuddyWidget from '../buddy/BuddyWidget';
import { speakBuddyText } from '../../services/geminiService';

const HomeDashboard: React.FC = () => {
  const { profile, setStage, curriculum, completedModuleIds, setActiveModule, activeModule, tokens, inventory, puzzleAssets, shortTermHistory, moduleContents } = useUserStore();

  const handleParentClick = () => {
    setStage(AppStage.PARENT_DASHBOARD);
  };

  // Helper function to determine button className
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getButtonClassName = (curriculum: any, nextModule: any, isContentReady: boolean) => {
    if (curriculum && !nextModule) {
      return 'bg-amber-500 hover:bg-amber-400 text-white border-amber-700 active:border-b-0 active:translate-y-2 cursor-pointer';
    }
    if (curriculum && nextModule && isContentReady) {
      return 'bg-gradient-to-b from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 text-white border-green-800 group-active:scale-95 active:border-b-0 active:translate-y-2 cursor-pointer';
    }
    return 'bg-slate-300 text-slate-500 border-slate-400 cursor-not-allowed opacity-80';
  };

  // Logic to find the next playable module (fallback if no activeModule is set)
  const autoNextModule = useMemo(() => {
    if (!curriculum || !curriculum.weeklySchedule) return null;
    const allModules = curriculum.weeklySchedule.flatMap(day => day.modules || []);
    // Find the first module whose ID is NOT in completedModuleIds
    return allModules.find(m => !completedModuleIds.includes(m.id)) || null;
  }, [curriculum, completedModuleIds]);

  // Use activeModule from store if set (from CurriculumBuilder), otherwise use auto-calculated
  const nextModule = activeModule || autoNextModule;

  // Check if the next module has content ready
  const isContentReady = useMemo(() => {
    if (!nextModule) return false;
    return !!moduleContents[nextModule.id];
  }, [nextModule, moduleContents]);

  // RICH CONTEXT FOR AI (Ince Iscilik)
  const dashboardContext = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    let timeOfDay = "Evening";
    if (hours < 12) {
      timeOfDay = "Morning";
    } else if (hours < 18) {
      timeOfDay = "Afternoon";
    }

    // Determine mission status based on curriculum and content readiness
    let missionStatus = "";
    if (!curriculum) {
      missionStatus = "We're preparing your personalized adventure map! While I'm working on it, why not explore the Magic Art Studio or check out the Shop?";
    } else if (nextModule && !isContentReady) {
      missionStatus = `I'm preparing your next mission: '${nextModule.title}'. It'll be ready soon! In the meantime, let's explore the Art Studio, create stories, or visit the Shop!`;
    } else if (nextModule && isContentReady) {
      missionStatus = `The next mission is '${nextModule.title}'. Encouraging them to press the big PLAY button.`;
    } else {
      missionStatus = "All missions are done for today! Suggest visiting the Art Studio or Shop.";
    }

    // Inventory Analysis
    const shopItems = (inventory || []).map(i => i.name).join(', ');
    const artItems = (puzzleAssets || []).map(a => a.name).join(', ');
    const hasItems = (inventory && inventory.length > 0) || (puzzleAssets && puzzleAssets.length > 0);

    // Memory History Integration
    const conversationLog = (shortTermHistory || []).map(m => `${m.role === 'user' ? 'Child' : 'Buddy'}: "${m.text}"`).join('\n');

    return `
      SCENE: Main Home Dashboard.
      TIME: ${timeOfDay}.
      USER INFO:
      - Name: ${profile?.name || 'Friend'}
      - Tokens: ${tokens} ⭐
      
      RECENT CONVERSATION (Memory):
      ${conversationLog || "No recent conversation."}
      
      MY BAG (INVENTORY):
      - Shop Items (Toys/Stickers): ${shopItems || 'Empty'}
      - Art Collections: ${artItems || 'None'}
      ${hasItems ? `(If they ask about their bag, mention these cool items! e.g. "You have your ${shopItems} in your bag!")` : '(Bag is empty, maybe suggest buying something?)'}

      CURRENT STATE:
      - ${missionStatus}
      
      CAPABILITIES & MODULE DETAILS:
      1. "Magic Art Studio" (Creativity):
         - Modes: 
           * Magic Coloring (Endless coloring pages)
           * Magic Sketch (Turn drawings into art)
           * Scratch Reveal (Reveal hidden surprises)
           * Puzzle Time (Solve puzzles)
         - Encourage this if they want to relax or draw.

      2. "My Stories" (Daily Adventure):
         - Features:
           * Read existing magical stories from the library.
           * CREATE new stories by dragging items from their Backpack (Inventory) into the Magic Cauldron!
         - IMPORTANT: If they have items in their bag, suggest making a story with them.

      3. "Shop / Market" (Social & Math Practice):
         - This is a ROLEPLAY simulation. You get a wallet with play money ($1, $5 bills).
         - Practice buying toys and counting change (Math skills).
         - IT DOES NOT COST STARS. It is a fun activity to learn counting money.
         - Bought items go into the Backpack.

      4. "Fusion Workshop" (Spending Rewards):
         - HERE is where you spend your STARS (Tokens)!
         - Use Stars to fuse items and build cool projects.
         - Requires items from the Backpack (bought in Shop).
      
      GOAL:
      - Be a fun, helpful guide.
      - "Stars" are for being awesome in lessons (Game Arena). You earn them there!
      - "Shop" is for learning how to shop with money.
      - "Workshop" is for building things with your Stars and Items.
      - Example: "You have 5 Stars! Go earning more in the Game Arena!" OR "Let's go to the Shop to practice counting money!"
      - IMPORTANT: If content is being prepared, be encouraging and suggest other fun activities to explore while waiting!
    `;
  }, [profile, tokens, nextModule, isContentReady, curriculum, inventory, puzzleAssets, shortTermHistory]);

  const handleStartLesson = () => {
    if (!nextModule) return;
    setActiveModule(nextModule);
    setStage(AppStage.GAME_ARENA);
  };

  const handleSeeMap = () => {
    setStage(AppStage.CURRICULUM_GENERATION);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-white relative overflow-hidden font-fredoka">

      {/* Decorative Background Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-200 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-20 right-10 w-48 h-48 bg-sky-200 rounded-full blur-3xl opacity-50"></div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center min-h-screen p-6">

        {/* Header: User & Tokens */}
        <header className="w-full flex justify-between items-center mt-2 mb-4 max-w-4xl">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setStage(AppStage.ART_STUDIO)}
              className="flex items-center space-x-3 bg-white pl-2 pr-4 py-2 rounded-full border-2 border-purple-100 shadow-sm hover:border-purple-300 transition-all group"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center border border-purple-200 group-hover:scale-110 transition-transform">
                <span className="text-xl">🎨</span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-purple-900 font-bold leading-none text-sm">Magic Art</p>
                <p className="text-purple-400 text-[10px] font-bold uppercase tracking-wide">Studio</p>
              </div>
            </button>

            <button
              onClick={() => setStage(AppStage.DAILY_ADVENTURE)}
              className="flex items-center space-x-3 bg-white pl-2 pr-4 py-2 rounded-full border-2 border-orange-100 shadow-sm hover:border-orange-300 transition-all group"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center border border-orange-200 group-hover:scale-110 transition-transform">
                <span className="text-xl">📖</span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-orange-900 font-bold leading-none text-sm">My Stories</p>
                <p className="text-orange-400 text-[10px] font-bold uppercase tracking-wide">Library</p>
              </div>
            </button>

            <button
              onClick={() => setStage(AppStage.SHOP_MODULE)}
              className="flex items-center space-x-3 bg-white pl-2 pr-4 py-2 rounded-full border-2 border-emerald-100 shadow-sm hover:border-emerald-300 transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200 group-hover:scale-110 transition-transform">
                <span className="text-xl">🛒</span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-emerald-900 font-bold leading-none text-sm">Shop</p>
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wide">Market</p>
              </div>
            </button>

            <button
              onClick={() => setStage(AppStage.FUSION_WORKSHOP)}
              className="flex items-center space-x-3 bg-white pl-2 pr-4 py-2 rounded-full border-2 border-orange-100 shadow-sm hover:border-orange-300 transition-all group"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center border border-orange-200 group-hover:scale-110 transition-transform">
                <span className="text-xl">🔧</span>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-orange-900 font-bold leading-none text-sm">Workshop</p>
                <p className="text-orange-400 text-[10px] font-bold uppercase tracking-wide">Fusion</p>
              </div>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {/* Stars Display */}
            <div className="bg-white px-4 py-2 rounded-full shadow-md border-2 border-amber-200 flex items-center space-x-2">
              <span className="text-2xl">⭐</span>
              <span className="font-black text-slate-800 text-xl">{tokens}</span>
            </div>

            {/* My Bag Button */}
            <MyBag />

            <button
              onClick={handleParentClick}
              className="w-12 h-12 bg-white hover:bg-slate-50 transition-colors rounded-full text-slate-400 font-bold flex items-center justify-center border-2 border-slate-200 shadow-md"
            >
              🔒
            </button>
          </div>
        </header>

        {/* Buddy Interaction Area - Fully Interactive Live Buddy */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative">

          {/* Glow Effect behind Buddy */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full opacity-60 blur-3xl pointer-events-none"></div>

          {/* 
                THE NEW STANDARD BUDDY WIDGET 
                - Positioned relatively in the center 
                - Connected to Live API with 'dashboardContext'
            */}
          <BuddyWidget
            context={dashboardContext}
            className="relative z-20 flex flex-col items-center justify-center mb-8"
          />

          {/* STRATEGY 1: GIANT PLAY BUTTON (Trojan Horse) */}
          <div className="flex flex-col items-center mt-4">
            <div className="relative group">
              {/* Pulse effect only if ready */}
              {isContentReady && (
                <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse"></div>
              )}

              <button
                onClick={() => {

                  if (curriculum && !nextModule) {
                    setStage(AppStage.CURRICULUM_GENERATION);
                  } else if (curriculum && nextModule && isContentReady) {
                    handleStartLesson();
                  } else if (!curriculum) {
                    speakBuddyText("I'm still drawing your special map! Check out the Art Studio while you wait!");
                  } else {
                    speakBuddyText(`I'm getting the ${nextModule?.title || 'next mission'} ready for you! It will be super fun! Give me just a moment.`);
                  }
                }}
                className={`
                  relative w-64 h-24 rounded-3xl shadow-xl transform transition-all flex items-center justify-center space-x-4 border-b-8
                  ${getButtonClassName(curriculum, nextModule, isContentReady)}
                `}
              >
                {curriculum && !nextModule && (
                  <>
                    <span className="text-5xl drop-shadow-md">✨</span>
                    <span className="text-2xl font-black tracking-wider drop-shadow-md">NEW MAP</span>
                  </>
                )}
                {curriculum && nextModule && isContentReady && (
                  <>
                    <span className="text-5xl drop-shadow-md">▶️</span>
                    <span className="text-4xl font-black tracking-wider drop-shadow-md">PLAY</span>
                  </>
                )}
                {(!curriculum || !nextModule || !isContentReady) && !(curriculum && !nextModule) && (
                  <>
                    <span className="text-5xl opacity-50">⏳</span>
                    <span className="text-2xl font-black tracking-wider opacity-50">LOADING...</span>
                  </>
                )}
              </button>
            </div>
            {nextModule && (
              <div className="mt-4 text-slate-400 text-xs font-bold uppercase tracking-widest">
                Next: {nextModule.title}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Mission Map */}
        <div className="w-full max-w-lg mt-8 mb-4">
          <button
            onClick={handleSeeMap}
            className="w-full bg-gradient-to-br from-blue-50 to-sky-100 p-6 rounded-3xl shadow-lg border-b-4 border-blue-300 active:border-b-0 active:translate-y-1 transition-all hover:shadow-xl"
          >
            <div className="flex items-center justify-center space-x-4">
              <span className="text-5xl">🗺️</span>
              <span className="font-bold text-blue-600 text-2xl">Mission Map</span>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
};

export default HomeDashboard;