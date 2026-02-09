
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { AppStage, Buddy, UserProfile, Curriculum, CurriculumModule, GamePayload, UserPhoto, StoryBook, ShopProduct, PuzzleAsset, Blueprint, ShopState } from '../types';
import { generateMemorySummary, HomeworkAnalysis } from '../services/geminiService';

export interface SessionLog {
  id: string;
  moduleId: string;
  moduleTitle: string;
  timestamp: string;
  durationSeconds: number;
  correctCount: number;
  mistakeCount: number;
  stressLevel: 'LOW' | 'MEDIUM' | 'HIGH'; // Derived from mistakes/time
}

interface UserState {
  stage: AppStage;
  returnStage: AppStage | null; // Where to return after preview/game
  profile: UserProfile | null;
  buddy: Buddy | null;
  gallery: UserPhoto[]; // New Gallery



  // Buddy Interaction State
  buddyState: {
    isTalking: boolean;
    currentMessage: string | null;
    mood: 'happy' | 'sad' | 'excited' | 'neutral' | 'curious';
    activity: 'idle' | 'talking' | 'listening' | 'thinking';
  };

  // NEW: Short Term Interaction History
  shortTermHistory: { role: 'user' | 'model'; text: string }[];
  addToShortTermHistory: (entry: { role: 'user' | 'model'; text: string }) => void;

  curriculum: Curriculum | null;

  // CACHED CONTENT (New)
  // Maps module.id -> GamePayload (images, logic, text)
  moduleContents: Record<string, GamePayload>;

  // Progress Tracking
  completedModuleIds: string[];
  activeModule: CurriculumModule | null;
  tokens: number;

  // PERFORMANCE TRACKING (Detailed Logs for Parent Dash)
  performanceLogs: SessionLog[];

  // AI Memory / Context
  globalContext: string;
  isSummarizing: boolean;

  // STORIES (Daily Adventure Log)
  stories: StoryBook[];

  // SHOP INVENTORY
  inventory: ShopProduct[];
  shopState: ShopState | null;

  // PUZZLE ASSETS (From Scratch Reveal)
  puzzleAssets: PuzzleAsset[];

  // FUSION WORKSHOP (Dynamic Blueprint based on interests)
  fusionBlueprint: Blueprint | null;

  setStage: (stage: AppStage) => void;
  setStageWithReturn: (stage: AppStage, returnTo: AppStage) => void;
  returnToPreviousStage: () => void;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  setBuddy: (buddy: Buddy) => void;
  setBuddyStatus: (status: { isTalking?: boolean, message?: string | null, mood?: 'happy' | 'sad' | 'excited' | 'neutral' | 'curious', activity?: 'idle' | 'talking' | 'listening' | 'thinking' }) => void;

  // Gallery Actions
  addPhoto: (photo: UserPhoto) => void;
  removePhoto: (photoId: string) => void;

  // REMOVED: Dynamic assessment actions - now using static assessment

  setCurriculum: (curriculum: Curriculum) => void;

  // Content Caching Action
  cacheModuleContent: (moduleId: string, payload: GamePayload) => void;

  // Progress Actions
  setActiveModule: (module: CurriculumModule | null) => void;
  markModuleComplete: (moduleId: string) => void;

  // Token Actions
  addToken: () => void;
  spendTokens: (amount: number) => void;

  // Performance Action
  logSessionPerformance: (log: SessionLog) => void;

  // Context Action
  appendContext: (log: string) => void;
  compressGlobalContext: () => Promise<void>;

  // Story Actions
  addStory: (story: StoryBook) => void;
  removeStory: (id: string) => void;

  // Shop Actions
  addToInventory: (item: ShopProduct) => void;
  removeFromInventory: (itemId: string) => void;
  setShopState: (state: ShopState | null) => void;

  // Puzzle Asset Actions
  addPuzzleAsset: (asset: PuzzleAsset) => void;
  removePuzzleAsset: (assetId: string) => void;

  // Fusion Workshop Actions
  setFusionBlueprint: (blueprint: Blueprint) => void;

  // Custom Content Injection (Homework)
  addCustomHomeworkModule: (module: CurriculumModule) => void;

  // Homework Preview State (persist across navigation)
  homeworkPreview: {
    analysis: HomeworkAnalysis | null;
    moduleId: string | null;
    module: CurriculumModule | null;
    isReady: boolean;
  };
  setHomeworkPreview: (preview: Partial<UserState['homeworkPreview']>) => void;
  clearHomeworkPreview: () => void;

  reset: () => void;
}

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof indexedDB === 'undefined') return null;
    return new Promise((resolve) => {
      const request = indexedDB.open('TOSBA_DB', 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval');
        }
      };
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction('keyval', 'readonly');
        const store = transaction.objectStore('keyval');
        const getReq = store.get(name);
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    });
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof indexedDB === 'undefined') return;
    return new Promise((resolve) => {
      const request = indexedDB.open('TOSBA_DB', 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval');
        }
      };
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction('keyval', 'readwrite');
        const store = transaction.objectStore('keyval');
        store.put(value, name);
        transaction.oncomplete = () => resolve();
      };
    });
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof indexedDB === 'undefined') return;
    return new Promise((resolve) => {
      const request = indexedDB.open('TOSBA_DB', 1);
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction('keyval', 'readwrite');
        const store = transaction.objectStore('keyval');
        store.delete(name);
        transaction.oncomplete = () => resolve();
      };
    });
  },
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      stage: AppStage.ONBOARDING,
      returnStage: null,
      profile: null,
      buddy: null,

      curriculum: null,
      moduleContents: {}, // Initialize empty
      completedModuleIds: [],
      activeModule: null,
      tokens: 0,
      performanceLogs: [],

      globalContext: "SESSION START. Interaction Log:",
      isSummarizing: false,
      gallery: [], // Initialize gallery
      stories: [], // Initialize stories
      inventory: [], // Initialize inventory
      shopState: null,
      puzzleAssets: [], // Initialize puzzle assets
      fusionBlueprint: null, // Initialize fusion blueprint

      setStage: (stage) => set({ stage }),
      setStageWithReturn: (stage, returnTo) => set({ stage, returnStage: returnTo }),
      returnToPreviousStage: () => {
        const returnTo = get().returnStage || AppStage.DASHBOARD;
        set({ stage: returnTo, returnStage: null });
      },
      setProfile: (profile) => set({ profile }),
      updateProfile: (partial) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...partial } : null
      })),
      setBuddy: (buddy) => set({ buddy }),

      buddyState: { isTalking: false, currentMessage: null, mood: 'happy', activity: 'idle' },
      setBuddyStatus: (newStatus) => set((state) => ({
        buddyState: { ...state.buddyState, ...newStatus }
      })),

      // SHORT TERM MEMORY (New)
      shortTermHistory: [],
      addToShortTermHistory: (entry) => set((state) => {
        const newHistory = [...state.shortTermHistory, entry];
        // Keep only last 10 entries to provide context without overloading
        if (newHistory.length > 10) newHistory.shift();
        return { shortTermHistory: newHistory };
      }),


      addPhoto: (photo) => set((state) => ({
        gallery: [...(state.gallery || []), photo]
      })),

      removePhoto: (photoId) => set((state) => ({
        gallery: (state.gallery || []).filter(p => p.id !== photoId)
      })),

      setCurriculum: (curriculum) => set({ curriculum }),

      cacheModuleContent: (moduleId, payload) => set((state) => {
        // Force new object reference to trigger React re-renders
        const newContents = { ...state.moduleContents };
        newContents[moduleId] = payload;
        return { moduleContents: newContents };
      }),

      setActiveModule: (module) => set({ activeModule: module }),
      markModuleComplete: (moduleId) => set((state) => ({
        completedModuleIds: [...state.completedModuleIds, moduleId]
      })),

      addToken: () => set((state) => ({ tokens: state.tokens + 1 })),
      spendTokens: (amount) => set((state) => ({ tokens: Math.max(0, state.tokens - amount) })),

      logSessionPerformance: (log) => set((state) => ({
        performanceLogs: [log, ...state.performanceLogs]
      })),

      appendContext: (log) => {
        const timestamp = new Date().toISOString();
        set((state) => ({
          globalContext: `${state.globalContext}\n[${timestamp}] ${log}`
        }));

        const { globalContext, isSummarizing, compressGlobalContext } = get();
        if (globalContext.length > 8000 && !isSummarizing) {
          compressGlobalContext();
        }
      },

      compressGlobalContext: async () => {
        set({ isSummarizing: true });
        const { globalContext } = get();
        try {
          const cutOffIndex = Math.max(0, globalContext.length - 2000);
          const textToSummarize = globalContext.substring(0, cutOffIndex);
          const recentText = globalContext.substring(cutOffIndex);
          if (textToSummarize.length < 500) {
            set({ isSummarizing: false });
            return;
          }
          const summary = await generateMemorySummary(textToSummarize);
          const newContext = `[MEMORY ARCHIVE]\n${summary}\n\n[RECENT LOGS]\n${recentText}`;
          set({ globalContext: newContext, isSummarizing: false });
        } catch (e) {
          console.error("Context compression failed", e);
          set({ isSummarizing: false });
        }
      },

      addStory: (story) => set((state) => ({
        stories: [story, ...(state.stories || [])]
      })),

      removeStory: (id) => set((state) => ({
        stories: (state.stories || []).filter(s => s.id !== id)
      })),

      setShopState: (shopState) => set({ shopState }),

      addToInventory: (item) => set((state) => ({
        inventory: [...(state.inventory || []), item]
      })),

      removeFromInventory: (itemId) => set((state) => {
        const inv = state.inventory || [];
        const idx = inv.findIndex(i => i.id === itemId);
        if (idx > -1) {
          const newInv = [...inv];
          newInv.splice(idx, 1);
          return { inventory: newInv };
        }
        return {};
      }),

      addPuzzleAsset: (asset) => set((state) => ({
        puzzleAssets: [...(state.puzzleAssets || []), asset]
      })),

      removePuzzleAsset: (assetId) => set((state) => ({
        puzzleAssets: (state.puzzleAssets || []).filter(a => a.id !== assetId)
      })),

      setFusionBlueprint: (blueprint) => set({ fusionBlueprint: blueprint }),

      // Homework Preview State
      homeworkPreview: {
        analysis: null,
        moduleId: null,
        module: null,
        isReady: false
      },
      
      setHomeworkPreview: (preview) => set((state) => ({
        homeworkPreview: { ...state.homeworkPreview, ...preview }
      })),
      
      clearHomeworkPreview: () => set({
        homeworkPreview: {
          analysis: null,
          moduleId: null,
          module: null,
          isReady: false
        }
      }),

      addCustomHomeworkModule: (module) => set((state) => {
        if (!state.curriculum || !state.curriculum.weeklySchedule) return {};

        // Add to the FIRST day of the schedule for immediate visibility
        const newSchedule = [...state.curriculum.weeklySchedule];
        if (newSchedule.length > 0) {
          // Add to the END of the modules list (so it appears as the last mission of the day)
          newSchedule[0].modules = [...(newSchedule[0].modules || []), module];
        }

        return {
          curriculum: {
            ...state.curriculum,
            weeklySchedule: newSchedule
          }
        };
      }),

      reset: () => set({
        stage: AppStage.ONBOARDING,
        profile: null,
        buddy: null,
        curriculum: null,
        moduleContents: {},
        completedModuleIds: [],
        activeModule: null,
        tokens: 0,
        performanceLogs: [],
        globalContext: "SESSION START. Interaction Log:",
        isSummarizing: false
      }),
    }),
    {
      name: 'tosba-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        stage: state.stage,
        profile: state.profile,
        buddy: state.buddy,
        curriculum: state.curriculum,
        completedModuleIds: state.completedModuleIds,
        tokens: state.tokens,
        performanceLogs: state.performanceLogs, // Consider limiting this if it gets too big
        globalContext: state.globalContext,
        gallery: state.gallery, // Warning: Large if contains base64
        stories: state.stories,
        inventory: state.inventory,
        shopState: state.shopState,
        puzzleAssets: state.puzzleAssets,
        fusionBlueprint: state.fusionBlueprint,
        homeworkPreview: state.homeworkPreview // Persist homework preview state
        // EXCLUDED:
        // - moduleContents (Huge cache, better to re-fetch or use dedicated DB)
        // - buddyState (Volatile, changes every frame during speech)
        // - activeModule (Volatile)
        // - shortTermHistory (Volatile)
        // - isSummarizing (Volatile)
      }),
    }
  )
);
