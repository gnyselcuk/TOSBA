

export interface UserProfile {
  name: string;
  chronologicalAge: number;
  developmentalAge?: number;
  interests: string[];
  avoidances: string[];
  sensoryTriggers: string[];
  // New Enhanced Fields
  communicationStyle?: 'Verbal' | 'Non-Verbal' | 'Mixed' | 'PECS';
  therapyGoals?: string[];
  strengths?: string[];
  // Static Assessment Result
  assessedLevel?: 0 | 1 | 2 | 3; // 0=Pre-School, 1=Başlangıç, 2=Orta, 3=İleri
}

export type PhotoCategory = 'KITCHEN' | 'BEDROOM' | 'FAMILY' | 'OTHER';


export interface DetectedObject {
  name: string;
  label: string;
  score?: number;
  box?: number[];
  box2d?: [number, number, number, number]; // ymin, xmin, ymax, xmax (0-1000)
}

export interface UserPhoto {
  id: string;
  category: PhotoCategory;
  base64: string;
  detectedObjects?: DetectedObject[]; // Cached analysis from Gemini
  timestamp: number;
}

export interface Buddy {
  name: string;
  description: string;
  imageUrl: string;
  personality: 'happy' | 'cool' | 'smart' | 'funny';
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
}

export enum AppStage {
  ONBOARDING = 'ONBOARDING',
  PHOTO_SETUP = 'PHOTO_SETUP', // New AR-Lite Onboarding
  BUDDY_CREATION = 'BUDDY_CREATION',
  BUDDY_ACTIVATION = 'BUDDY_ACTIVATION',
  DASHBOARD = 'DASHBOARD',
  GAME_ARENA = 'GAME_ARENA',
  ASSESSMENT_SESSION = 'ASSESSMENT_SESSION', // UNIFIED STATIC PLACEMENT TEST
  CURRICULUM_GENERATION = 'CURRICULUM_GENERATION',
  PARENT_DASHBOARD = 'PARENT_DASHBOARD',
  PARENT_QA = 'PARENT_QA',
  ART_STUDIO = 'ART_STUDIO',
  DAILY_ADVENTURE = 'DAILY_ADVENTURE',
  SHOP_MODULE = 'SHOP_MODULE',
  FUSION_WORKSHOP = 'FUSION_WORKSHOP'
}

export interface ShopProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string; // Base64 or URL
}

// Puzzle assets from Scratch Reveal game
export interface PuzzleAsset {
  id: string;
  name: string; // Add name property
  theme: string;
  imageUrl: string;
  label: string;
  unlockedAt: string; // ISO date string
}

// Fusion Workshop - Item crafting system
export interface BlueprintSlot {
  id: string;
  label: string; // "Head", "Body", "Arms", etc.
  requiredItems: number; // How many items needed
  filledItems: string[]; // IDs of shop items placed here
  emoji: string; // Visual representation
}

export interface Blueprint {
  id: string;
  name: string; // "Giant Mech", "Space Rocket", etc.
  interest: string; // "Robots", "Space", "Dinosaurs"
  slots: BlueprintSlot[];
  starsPerFusion: number; // Stars needed to fuse an item
  completionReward: string; // Description of reward
  imageUrl?: string; // Final completed image
}

export interface ShopScenario {
  difficulty: 'L1' | 'L2' | 'L3';
  theme: string; // e.g. "Summer Ice Cream", "School Supplies"
  products: ShopProduct[];
  walletAmount: number; // For L2 and L3
  requiredItems: string[]; // For L3 (Shopping List)
  dialogue: {
    welcome: string;
    success: string;
    failure: string; // Not enough money, wrong amount
  };
}

export interface ShopState {
  scenario: ShopScenario | null;
  wallet: number[];
  lastUpdated: number;
  restockTime: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AssessmentItem {
  id: string;
  name: string;
  imageUrl?: string; // Loaded async
  isCorrect: boolean;
  boundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 scale
}

// Updated to hold a full question definition
export interface AssessmentQuestion {
  id: string;
  type: 'MATCHING' | 'READING' | 'COMPREHENSION';
  difficulty: 'L1' | 'L2' | 'L3';
  questionText: string;
  items: AssessmentItem[];
}

export interface StoryPage {
  text: string;
  imageUrl: string;
  audioBase64?: string;
  // Adaptive interaction elements (age-specific)
  question?: {
    text: string;
    options: { label: string; isCorrect: boolean }[];
  };
  decisionPoint?: {
    prompt: string;
    choices: { label: string; consequence: string; isOptimal: boolean }[];
  };
}

// Interaction modes based on developmental age
export type StoryInteractionMode =
  | 'READ_ALONG'      // EarlyChildhood: Word highlighting, speech recognition
  | 'QUIZ'            // SchoolAge: Questions after each page
  | 'DECISION_MAKING' // Adolescent: Social decision points
  | 'LISTEN_ONLY';    // Passive listening (any age, for relaxation)

export interface StoryBook {
  id: string;
  title: string;
  coverImage?: string;
  pages: StoryPage[];
  date: string;
  // Adaptive properties
  interactionMode?: StoryInteractionMode;
  targetAgeGroup?: 'EarlyChildhood' | 'SchoolAge' | 'Adolescent';
  socialLesson?: string; // The skill being taught (e.g., "Sharing", "Handling Rejection")
}

// Queue for the adaptive test
export interface AssessmentState {
  queue: AssessmentQuestion[];
  results: { questionId: string; correct: boolean; difficulty: string }[];
  isGenerating: boolean;
}

export type ModuleType =
  | 'MATCHING'
  | 'PECS'
  | 'RECEPTIVE'
  | 'PHONICS'
  | 'SIGHT_WORDS'
  | 'COMPREHENSION'
  | 'FLUENCY'
  | 'SAFETY_SIGNS'
  | 'SOCIAL_SIM'
  | 'INFORMATIONAL'
  | 'WRITING_SRSD'
  | 'FEEDING'
  | 'SENTENCE_TRAIN'
  | 'MARKET'
  | 'POP_BALLOON'
  | 'I_SPY'
  | 'SIGNS'
  | 'VERBAL' // New: Speech Therapy
  | 'OFFLINE_TASK' // New: Generalization to real world
  | 'PHOTO_HUNT' // New: AR-Lite Home Object Finding
  | 'SEQUENCING' // New: Logic ordering (Step 1-2-3)
  | 'SOCIAL_STORY' // New: Emotional intelligence & social scenarios
  | 'TRACKING' // New: Motor Skills
  | 'DRAG_DROP'
  | 'CHOICE'
  | 'SPEAKING'
  | 'CAMERA';

export interface CurriculumModule {
  id: string;
  title: string;
  description: string;
  type: ModuleType;
  durationMinutes: number;
  icon: string;
  visualStyle: 'Cartoon' | 'Realistic' | 'Symbolic';
}

export interface Curriculum {
  branch: 'EarlyChildhood' | 'SchoolAge' | 'Adolescent';
  branchTitle: string;
  theme: string;
  weeklySchedule: {
    day: string;
    modules: CurriculumModule[];
  }[];
}

export interface GamePayload {
  id?: string;
  template: 'DRAG_DROP' | 'TAP_TRACK' | 'CHOICE' | 'SPEAKING' | 'CAMERA' | 'FEEDING' | 'TRACKING' | 'STORY' | 'WRITING' | 'FLASHCARD';
  backgroundTheme: string;
  backgroundImage?: string; // Custom BG (e.g. User Photo)
  instruction: string;
  isBreak?: boolean;
  targetZone?: { label: string, image?: string };
  dropSlots?: number;
  spawnMode?: 'FALLING' | 'FLOATING' | 'STATIC';
  scenarioText?: string;
  targetWord?: string; // For Speaking Template (Expected Answer)
  items: AssessmentItem[];
  questions?: GamePayload[]; // Wrapper for Question Packs (5 questions per module)
  isOrdered?: boolean; // For Sequencing/Sentence Train
  story?: StoryBook; // For STORY template
}