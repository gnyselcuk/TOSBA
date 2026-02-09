
import React from 'react';
import { useUserStore } from './store/userStore';
import { AppStage } from './types';
import WelcomeScreen from './components/onboarding/WelcomeScreen';
import PhotoSetupScreen from './components/onboarding/PhotoSetupScreen'; // New
import BuddyCreator from './components/buddy/BuddyCreator';
import BuddyActivation from './components/buddy/BuddyActivation';
import HomeDashboard from './components/dashboard/HomeDashboard';
import StaticAssessmentSession from './components/assessment/StaticAssessmentSession';
import CurriculumBuilder from './components/curriculum/CurriculumBuilder';
import ParentDashboard from './components/parent/ParentDashboard';
import ParentQA from './components/parent/ParentQA';
import GameArena from './components/game/GameArena';

import ArtStudio from './components/art/ArtStudio';
import DailyAdventureLog from './components/story/DailyAdventureLog';
import ShopModule from './components/shop/ShopModule';
import FusionWorkshop from './components/fusion/FusionWorkshop';

import { useGamePrefetch } from './hooks/useGamePrefetch';
import { useContentWorkerHook } from './hooks/useContentWorker';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const App: React.FC = () => {
  const { stage } = useUserStore();

  // Background Prefetching Service
  useGamePrefetch(); // Legacy (Will remove/disable if worker takes over fully, keeping for safety for moment or removing?)
  // Let's replace the legacy one with the new one
  useContentWorkerHook();

  const renderStage = () => {
    switch (stage) {
      case AppStage.ONBOARDING:
        return <WelcomeScreen />;
      case AppStage.PHOTO_SETUP:
        return <PhotoSetupScreen />;
      case AppStage.BUDDY_CREATION:
        return <BuddyCreator />;
      case AppStage.BUDDY_ACTIVATION:
        return <BuddyActivation />;
      case AppStage.DASHBOARD:
        return <HomeDashboard />;
      case AppStage.GAME_ARENA:
        return <GameArena />;
      case AppStage.ASSESSMENT_SESSION:
        return <StaticAssessmentSession />;
      case AppStage.CURRICULUM_GENERATION:
        return <CurriculumBuilder />;
      case AppStage.PARENT_DASHBOARD:
        return <ParentDashboard />;
      case AppStage.PARENT_QA:
        return <ParentQA />;
      case AppStage.ART_STUDIO:
        return <ArtStudio />;
      case AppStage.DAILY_ADVENTURE:
        return <DailyAdventureLog />;
      case AppStage.SHOP_MODULE:
        return <ShopModule />;
      case AppStage.FUSION_WORKSHOP:
        return <FusionWorkshop />;
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="antialiased text-slate-900">
        {renderStage()}
      </div>
    </DndProvider>
  );
};

export default App;
