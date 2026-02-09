
import { GamePayload, AssessmentItem, ModuleType, UserProfile, Curriculum, AssessmentQuestion, UserPhoto, StoryBook, ShopScenario, DetectedObject, Blueprint } from "../types";
import { JudgeService } from "./judgeService";
import { DragDropGenerator } from "./generators/DragDropGenerator";
import { TapTrackGenerator } from "./generators/TapTrackGenerator";
import { ChoiceGenerator } from "./generators/ChoiceGenerator";
import { SpeakingGenerator } from "./generators/SpeakingGenerator";
import { TileRevealGenerator } from "./generators/TileRevealGenerator";
import { storyBookGenerator } from "./generators/StoryBookGenerator";
import { adaptiveQuestionGenerator } from "./generators/AdaptiveQuestionGenerator";
import { shopScenarioGenerator } from "./generators/ShopScenarioGenerator";
import { fusionBlueprintGenerator } from "./generators/FusionBlueprintGenerator";
import { hiddenImageGenerator } from "./generators/HiddenImageGenerator";
import { coloringPageGenerator } from "./generators/ColoringPageGenerator";
import { sketchEnhancerGenerator } from "./generators/SketchEnhancerGenerator";

// Adding expanded module types to type definition hack if not exists in types.ts yet (Assuming string union or string)
// If explicit types are needed, user should update types.ts. For now string compatibility is assumed by API.

import { ai, TEXT_MODEL, IMAGE_MODEL, TTS_MODEL, parseJSON } from "./ai";
import { getMockImage, removeWhiteBackground } from "./imageService";


// Global Audio State (to prevent overlap)
let currentAudioSource: AudioBufferSourceNode | null = null;


// --- HELPERS ---

// Helper to handle Markdown code blocks in JSON responses
// parseJSON imported from ./ai

// Helper for delay/retry
// delay and getMockImage imported from ./imageService

// getStoryPlaceholder moved to StoryBookGenerator

// --- HOMEWORK ANALYSIS (NEW) ---

export type HomeworkAnalysis = {
    subject: 'MATH' | 'LITERACY' | 'ART' | 'SCIENCE' | 'OTHER';
    topic: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    extractedContent: Array<{
        question: string;
        answer: string;
        distractors?: string[];
        type: 'TEXT' | 'IMAGE';
    }>;
    suggestedGameTemplate: 'TAP_TRACK' | 'CHOICE' | 'MATCHING' | 'DRAG_DROP';
    summary: string;
    // NEW: Structured items for game generation
    gameItems: Array<{
        name: string; // e.g., "Mushroom"
        isCorrect: boolean;
        description?: string; // For image generation
    }>;
    visualStyle: string; // e.g., "Simple line drawing", "Cartoon", "Realistic"
    ageGroup: 'EARLY_CHILDHOOD' | 'SCHOOL_AGE' | 'ADOLESCENT';
};

export const analyzeHomeworkMaterial = async (base64Image: string): Promise<HomeworkAnalysis | null> => {
    const prompt = `
    Analyze this image of a child's homework or educational material. 
    Role: Special Education Expert & Game Designer.
    
    Task:
    1. Identify the subject (Math, Literacy, etc.).
    2. EXTRACT the content precisely:
       - If word list → extract words
       - If math → extract equations
       - If matching → extract items to match
    3. Determine age group (EARLY_CHILDHOOD: 3-6, SCHOOL_AGE: 7-12, ADOLESCENT: 13+)
    4. Suggest the BEST game template
    5. Create structured game items with descriptions for image generation
    
    IMPORTANT: For each item, provide a clear description for AI image generation.
    Example: "Mushroom" → "A red mushroom with white spots, simple cartoon style"
    
    Output JSON:
    {
      "subject": "MATH" | "LITERACY" | "ART" | "SCIENCE" | "OTHER",
      "topic": "Short Title (e.g., Same & Different)",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "ageGroup": "EARLY_CHILDHOOD" | "SCHOOL_AGE" | "ADOLESCENT",
      "extractedContent": [
        { 
          "question": "What is this?", 
          "answer": "Mushroom", 
          "distractors": ["Acorn", "Cloud", "Pinecone"],
          "type": "TEXT"
        }
      ],
      "gameItems": [
        { "name": "Mushroom", "isCorrect": true, "description": "A red mushroom with white spots, cartoon style" },
        { "name": "Acorn", "isCorrect": false, "description": "A brown acorn with cap, cartoon style" },
        { "name": "Cloud", "isCorrect": false, "description": "A white fluffy cloud, cartoon style" },
        { "name": "Pinecone", "isCorrect": false, "description": "A brown pinecone, cartoon style" }
      ],
      "visualStyle": "Simple cartoon line drawing",
      "suggestedGameTemplate": "CHOICE" | "TAP_TRACK" | "MATCHING" | "DRAG_DROP",
      "summary": "Brief description of the activity"
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL, // Using TEXT_MODEL because it supports both vision and JSON mode
            contents: [
                { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/png', data: base64Image } }] }
            ],
            config: { responseMimeType: "application/json" }
        });

        return parseJSON(response.text);
    } catch (error) {
        console.error("Homework Analysis Failed:", error);
        return null;
    }
};

// removeWhiteBackground and sliceGridImage imported from ./imageService

// --- IMPLEMENTATIONS ---

export const generateProfileAnalysis = async (transcript: string): Promise<UserProfile | null> => {
    const prompt = `
    Analyze this parent interview transcript and extract a UserProfile JSON.
    Transcript: "${transcript}"
    
    Return JSON matching:
    {
      "name": "Child Name",
      "chronologicalAge": number,
      "developmentalAge": number,
      "interests": ["trains", "music"],
      "avoidances": ["loud noises"],
      "sensoryTriggers": ["bright lights"]
    }
    `;
    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        return parseJSON(response.text);
    } catch (error) {
        console.error("Profile Analysis Failed", error);
        return null;
    }
};

export const generateBuddyImage = async (description: string, style: string, refImage?: string): Promise<string> => {
    try {
        const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
        const promptSuffix = `
            Isolated on a pure white background. 
            Full body character. 
            Friendly and cute.
            IMPORTANT: Do NOT include any text, letters, titles, names, or watermarks in the image. Just the character.
        `;

        if (refImage && typeof refImage === 'string' && refImage.includes(',')) {
            const split = refImage.split(',');
            if (split.length > 1) {
                const b64 = split[1];
                parts.push({ inlineData: { mimeType: 'image/png', data: b64 } });
                parts.push({ text: `Transform this toy into a ${style} character. Description: ${description}. ${promptSuffix}` });
            } else {
                parts.push({ text: `Create a ${style} character of: ${description}. ${promptSuffix}` });
            }
        } else {
            parts.push({ text: `Create a ${style} character of: ${description}. ${promptSuffix}` });
        }

        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: { parts },
            config: { imageConfig: { aspectRatio: "1:1" } }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const rawImage = `data:image/png;base64,${part.inlineData.data}`;
                return await removeWhiteBackground(rawImage);
            }
        }
        return getMockImage(description);
    } catch {
        return getMockImage(description);
    }
};

// Helper to stop any playing audio
export const stopBuddySpeech = () => {
    if (currentAudioSource) {
        try {
            currentAudioSource.stop();
        } catch {
            // Ignore errors when stopping audio
        }
        currentAudioSource = null;
    }
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
};

// EXPORT ANALYSER FOR ANIMATION
export let voiceAnalyser: AnalyserNode | null = null;

import { useUserStore } from '../store/userStore';

// Helper to speak locally
const speakLocal = (text: string) => {
    try {
        // UI UPDATE: Start Talking
        useUserStore.getState().setBuddyStatus({ isTalking: true, message: text, activity: 'talking' });

        const u = new SpeechSynthesisUtterance(text);
        // Attempt to find a decent English voice if available, otherwise default
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) || voices.find(v => v.lang.includes('en'));
        if (preferredVoice) u.voice = preferredVoice;
        u.volume = 1;
        u.rate = 1;

        u.onend = () => {
            // UI UPDATE: Stop Talking
            useUserStore.getState().setBuddyStatus({ isTalking: false, message: null, activity: 'idle' });
        };

        u.onerror = () => {
            useUserStore.getState().setBuddyStatus({ isTalking: false, message: null, activity: 'idle' });
        };

        window.speechSynthesis.speak(u);
    } catch (error) {
        console.error("Local speech failed", error);
        useUserStore.getState().setBuddyStatus({ isTalking: false, message: null, activity: 'idle' });
    }
};

// Global Live Service Reference
// This will be set by BuddyWidget when Live API connects
let globalLiveServiceRef: unknown = null;

export const setGlobalLiveService = (service: unknown) => {
    globalLiveServiceRef = service;
};

export const getGlobalLiveService = () => {
    return globalLiveServiceRef;
};

// Helper to play raw PCM audio from Gemini
let sharedAudioContext: AudioContext | null = null;
export const playAudioData = async (base64Audio: string) => {
    try {
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const buffer = new ArrayBuffer(len);
        const view = new DataView(buffer);
        for (let i = 0; i < len; i++) {
            view.setUint8(i, binaryString.charCodeAt(i));
        }

        if (!sharedAudioContext) {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            sharedAudioContext = new AudioContextClass();
        }
        const audioCtx = sharedAudioContext;
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        // Setup Analyser
        voiceAnalyser = audioCtx.createAnalyser();
        voiceAnalyser.fftSize = 256;

        const sampleRate = 24000;
        const numSamples = Math.floor(len / 2);
        const float32Data = new Float32Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
            const int16 = view.getInt16(i * 2, true);
            float32Data[i] = int16 / 32768.0;
        }
        const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
        audioBuffer.copyToChannel(float32Data, 0);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;

        // Connect Pipeline: Source -> Analyser -> Destination
        source.connect(voiceAnalyser);
        voiceAnalyser.connect(audioCtx.destination);

        // Track source
        currentAudioSource = source;
        source.onended = () => {
            if (currentAudioSource === source) {
                currentAudioSource = null;
                // UI UPDATE: Stop Talking (Async audio finished)
                useUserStore.getState().setBuddyStatus({ isTalking: false, message: null, activity: 'idle' });
            }
        };

        source.start(0);
        return { source, duration: audioBuffer.duration };

    } catch (error) {
        console.error("Audio Playback Error", error);
        // Ensure UI resets on error
        useUserStore.getState().setBuddyStatus({ isTalking: false, message: null, activity: 'idle' });
        throw error;
    }
};

// --- AUDIO HELPERS ---

let ttsAudioContext: AudioContext | null = null;

async function playRawAudio(base64Data: string) {
    if (!ttsAudioContext) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ttsAudioContext = new AudioContextClass({ sampleRate: 24000 });
    }

    // Resume context if needed
    if (ttsAudioContext.state === 'suspended') {
        try {
            await ttsAudioContext.resume();
        } catch (error) {
            console.warn('Audio resume blocked (autoplay policy)', error);
        }
    }

    try {
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = ttsAudioContext.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) {
            channelData[i] = dataInt16[i] / 32768.0;
        }

        const source = ttsAudioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(ttsAudioContext.destination);
        source.start();
    } catch (error) {
        console.error('Audio playback failed:', error);
    }
}

/**
 * PURE TTS: Stateless REST implementation
 * Uses specified TTS model via generateContent
 */
export const speakBuddyText = async (
    text: string,
    voiceName?: string,
    // _priority parameter reserved for future use
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _priority: 'low' | 'medium' | 'high' = 'medium',
    mood: 'happy' | 'sad' | 'excited' | 'neutral' | 'curious' = 'happy'
) => {
    // UI Update
    useUserStore.getState().setBuddyStatus({ isTalking: true, message: text, activity: 'talking', mood: mood });

    try {
        // Use standard Flash Model with Audio capabilities via REST
        const result = await ai.models.generateContent({
            model: TTS_MODEL,
            contents: [{
                role: 'user',
                parts: [{ text: `Read this text aloud exactly as written: "${text}"` }]
            }],
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName || "Kore" } }
                }
            }
        });

        // Check for audio data in candidates
        const audioPart = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (audioPart && audioPart.inlineData?.data) {
            await playRawAudio(audioPart.inlineData.data);
        } else {
            speakLocal(text);
        }

    } catch (error) {
        console.error('Cloud TTS failed:', error);
        speakLocal(text);
    } finally {
        setTimeout(() => {
            useUserStore.getState().setBuddyStatus({ isTalking: false, message: null, activity: 'idle' });
        }, 1000);
    }
};


// --- STORYBOOK GENERATOR ---
// Delegated to StoryBookGenerator module
export const generateStoryBook = async (
    childName: string,
    buddyName: string,
    interest: string,
    lesson: string,
    age: number,
    profileContext?: { avoidances: string[], inventoryItems?: string[] }
): Promise<StoryBook | null> => {
    return storyBookGenerator.generate(childName, buddyName, interest, lesson, age, profileContext);
};


// generateAssessmentImage and generateAssessmentGrid imported from ./imageService

export const generateMemorySummary = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: `Summarize this interaction history for a long-term memory store. Retain key facts about the child, preferences, and important events.\n\n${text}`,
        });
        return response.text || "Summary unavailable.";
    } catch {
        return "Summary failed.";
    }
};

// --- JUDGE / SAFETY LAYER ---

interface JudgeResult {
    isSafe: boolean;
    isRelevant: boolean;
    reason: string;
}

/**
 * Validates text content against user profile constraints (Sensitivity, Age).
 * WRAPPER around JudgeService for backward compatibility if needed locally
 */
export const validateTextContent = async (
    content: unknown,
    profileContext: string,
    taskDescription: string
): Promise<JudgeResult> => {
    return JudgeService.validateContent(content, {
        profile: profileContext,
        task: taskDescription
    });
};

/**
 * Validates generated images against the intended prompt (Visual Grounding).
 * Passes profile to Judge for Age-Appropriate Style enforcement.
 */
export const validateVisualContent = async (
    base64Image: string,
    expectedContentDescription: string,
    profile?: UserProfile
): Promise<JudgeResult> => {
    return JudgeService.validateImage(base64Image, expectedContentDescription, profile);
};

// --- NEW ADAPTIVE ASSESSMENT GENERATOR ---

// --- ADAPTIVE QUESTION GENERATOR ---
// Delegated to AdaptiveQuestionGenerator module
export const generateAdaptiveQuestion = async (
    level: 'L1' | 'L2' | 'L3',
    interest: string,
    avoidItems: string[] = [],
    profileStub?: { avoidances: string[], age: number }
): Promise<AssessmentQuestion | null> => {
    return adaptiveQuestionGenerator.generate(level, interest, avoidItems, profileStub);
};

export const generateCurriculum = async (profile: UserProfile, results: unknown, assessedLevel?: number): Promise<Curriculum | null> => {
    // 1. STEP: Branch determined purely by BIOLOGICAL AGE (To preserve dignity)
    // We use chronologicalAge if available, otherwise fallback to age, development age or default 5.
    let branch: 'EarlyChildhood' | 'SchoolAge' | 'Adolescent' = 'EarlyChildhood';
    const biologicalAge = profile.chronologicalAge || 5;

    if (biologicalAge >= 6) branch = 'SchoolAge';
    if (biologicalAge >= 13) branch = 'Adolescent';

    // 2. STEP: Level determined by ASSESSMENT (To set comparison difficulty)
    const currentLevel = assessedLevel ?? 1;

    // 3. STEP: Extract weaknesses from results
    // We try to use 'target' or 'concept' if available, otherwise fallback to questionId if meaningful, or "General Task" 
    const failedConcepts = Array.isArray(results)
        ? results
            .filter((r: { correct?: boolean }) => !r.correct)
            .map((r: { target?: string; concept?: string }) => r.target || r.concept || "General Task")
            .slice(0, 5)
        : [];

    const weaknessSummary = failedConcepts.length > 0
        ? `PRIORITY FOCUS AREAS: The student recently struggled with these specific concepts: [${failedConcepts.join(', ')}]. You MUST include specific modules to reinforce these exact concepts this week.`
        : 'PRIORITY FOCUS AREAS: Focus on reinforcing general foundational skills appropriate for this level.';

    const branchRules = {
        'EarlyChildhood': {
            allowed: "'FEEDING', 'MATCHING', 'POP_BALLOON', 'SIGHT_WORDS', 'OFFLINE_TASK', 'SOCIAL_STORY', 'SEQUENCING'",
            style: "Visual Style MUST be 'Cartoon' or 'Bright Illustration'.",
            focus: "Focus on basic motor skills, simple matching. Requests (Mands) like 'I want water' are acceptable. Sequencing should be simple 2-3 step routines."
        },
        'SchoolAge': {
            allowed: "'PHONICS', 'SENTENCE_TRAIN', 'I_SPY', 'COMPREHENSION', 'SIGHT_WORDS', 'OFFLINE_TASK', 'SEQUENCING', 'SOCIAL_STORY'",
            style: "Visual Style should be '2D Game Art' or 'Cartoon'.",
            focus: "Focus on literacy, reading comprehension (5N1K - Why/How are critical). USE DECLARATIVE SENTENCES (e.g., 'The robot is red'). AVOID simple mands."
        },
        'Adolescent': {
            allowed: "'SOCIAL_SIM', 'MARKET', 'SIGNS', 'SAFETY_SIGNS', 'COMPREHENSION', 'SIGHT_WORDS', 'OFFLINE_TASK', 'SEQUENCING', 'SOCIAL_STORY'",
            style: "Visual Style MUST be 'Realistic Photos' or 'High-Fidelity Icons'. NO childish cartoons.",
            focus: "Focus on independent life skills, functional reading (menus, signs), and safety. Dignity is key."
        }
    };

    const currentRule = branchRules[branch];

    const prompt = `
      You are an expert special education curriculum designer. Create a comprehensive 5-DAY weekly curriculum for an autistic student.
      
      **OUTPUT LANGUAGE:** ENGLISH (Titles/Descriptions).
      
      --- STUDENT PROFILE ---
      - Biological Age Group: ${branch} (Determines Visual Style & Dignity)
      - Functional Level: ${currentLevel} (Determines Complexity: 0=Sensory, 3=Advanced)
      - Interests: ${profile.interests.join(', ')}
      - ${weaknessSummary}
      
      --- RULES FOR ${branch} ---
      - Allowed Modules: ${currentRule.allowed}
      - Visual Style Rule: ${currentRule.style}
      - Pedagogical Focus: ${currentRule.focus}
      
      --- CRITICAL INSTRUCTIONS ---
      1. **ADAPT DIFFICULTY:**
         - Level 0: Sensory focus, simple cause-and-effect.
         - Level 1: Single word/concept matching.
         - Level 2: Sentence building, simple logic.
         - Level 3: Complex social scenarios, multi-step problems.
         
      2. **NO DUPLICATES:** Do NOT repeat the same "Target Word" or "Subject" across different days.
      
      3. **PROGRESSIVE DIFFICULTY:**
         - Mon/Tue: Recognition (Easy)
         - Wed/Thu: Discrimination (Medium)
         - Fri: Generalization (Hard)
         
      4. **MANDATORY INCLUSIONS:**
         - Include exactly 5 days (Monday to Friday).
         - Include at least 1 'SOCIAL_STORY' module.
         - Include at least 1 'SEQUENCING' module.

      Return strictly valid JSON matching this structure:
      {
        "branch": "${branch}",
        "branchTitle": "Creative Title",
        "theme": "Theme Name",
        "weeklySchedule": [
           {
             "day": "Monday",
             "modules": [
                {
                   "id": "m1",
                   "title": "Module Title",
                   "description": "Pedagogical description",
                   "type": "ONE_OF_ALLOWED_TYPES", 
                   "targetWord": "Specific Target (e.g. 'APPLE')",
                   "durationMinutes": 15,
                   "icon": "Emoji",
                   "visualStyle": "As per rules"
                }
             ]
           }
           // ... Ensure Tue, Wed, Thu, Fri are included
        ]
      }
    `;

    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.4
            }
        });
        return parseJSON(response.text);
    } catch (error) {
        console.error("Curriculum Gen Error:", error);
        return null;
    }
};

// --- IMAGE ANALYSIS (New AR-Lite Feature) ---

export const detectObjectsInImage = async (base64Image: string): Promise<DetectedObject[]> => {
    try {
        const prompt = `
        Detect distinct household objects in this image. 
        
        IMPORTANT RULES:
        1. Each unique object should appear ONLY ONCE in the list
        2. If you see multiple instances of the same object type (e.g., multiple apples), list each separately with position info
        3. For the SAME object, provide only ONE bounding box (the most accurate one)
        4. Bounding boxes should be reasonably sized (at least 5% of image area)
        5. Focus on clear, identifiable objects that a child can recognize
        
        Return a JSON list with bounding boxes in [ymin, xmin, ymax, xmax] format (0-1000 scale).
        
        JSON Structure:
        {
          "objects": [
            { "name": "apple", "box2d": [500, 300, 600, 400], "label": "Apple" }
          ]
        }
        `;

        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] || base64Image } }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        const data = parseJSON(response.text);
        let objects = data?.objects || [];

        // POST-PROCESSING: Deduplicate and filter
        const MIN_BOX_SIZE = 50; // Minimum area = 50 (out of 1000x1000 = 1000000, so ~0.005% of image)

        // 1. Filter out very small boxes
        objects = objects.filter((obj: DetectedObject) => {
            const [ymin, xmin, ymax, xmax] = obj.box2d;
            const width = xmax - xmin;
            const height = ymax - ymin;
            const area = width * height;
            return area >= MIN_BOX_SIZE;
        });

        // 2. Deduplicate: Keep only largest bbox for each unique label
        const uniqueMap = new Map<string, DetectedObject>();

        objects.forEach((obj: DetectedObject) => {
            const label = (obj.label || obj.name).toLowerCase().trim();
            const [ymin, xmin, ymax, xmax] = obj.box2d;
            const area = (xmax - xmin) * (ymax - ymin);

            const existing = uniqueMap.get(label);
            if (!existing) {
                uniqueMap.set(label, obj);
            } else {
                // Keep the larger one
                const [eymin, exmin, eymax, exmax] = existing.box2d;
                const existingArea = (exmax - exmin) * (eymax - eymin);
                if (area > existingArea) {
                    uniqueMap.set(label, obj);
                }
            }
        });

        return Array.from(uniqueMap.values());

    } catch (error) {
        console.error("Object Detection Failed", error);
        return [];
    }
};

// --- REAL WORLD VERIFICATION (SCAVENGER HUNT) ---

export const verifyImageContent = async (base64Image: string, targetObject: string, userAge: number): Promise<{ success: boolean; feedback: string }> => {
    try {
        let toneCheck: string;
        if (userAge < 7) {
            toneCheck = "very simple, enthusiastic, and encouraging (Toddler/Pre-school level)";
        } else if (userAge < 13) {
            toneCheck = "friendly, clear, and cool (School Age level)";
        } else {
            toneCheck = "respectful, helpful, and supportive (Teen/Adult level)";
        }

        const prompt = `
        Look at this photo. The user (Age: ${userAge}) is trying to show you a "${targetObject}".
        
        Task:
        1. Identify the main object in the photo.
        2. Determine if it matches "${targetObject}" (be generous but accurate).
        3. ACT AS A BUDDY: Write a short feedback message to be spoken aloud. Tone should be ${toneCheck}.
        
        Return JSON:
        {
          "match": boolean,
          "feedback": "Spoken feedback message here."
        }
        `;

        const response = await ai.models.generateContent({
            model: TEXT_MODEL, // Vision model via text-multimodal
            contents: {
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] || base64Image } }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        const data = parseJSON(response.text);
        return {
            success: data?.match || false,
            feedback: data?.feedback || "Great try!"
        };
    } catch (error) {
        console.error("Verification Error", error);
        return { success: false, feedback: "I couldn't quite see that. Can you try again?" };
    }
};

// --- ART STUDIO GENERATORS ---

// --- COLORING PAGE GENERATOR ---
// Delegated to ColoringPageGenerator module
export const generateColoringPage = async (promptText: string): Promise<string> => {
    return coloringPageGenerator.generate(promptText);
};

// --- SKETCH ENHANCER ---
// Delegated to SketchEnhancerGenerator module
export const enhanceSketch = async (base64Sketch: string, userPrompt: string): Promise<string> => {
    return sketchEnhancerGenerator.enhance(base64Sketch, userPrompt);
};

// --- HIDDEN IMAGE GENERATOR ---
// Delegated to HiddenImageGenerator module
export const generateHiddenImage = async (interest: string): Promise<{ imageUrl: string, label: string }> => {
    return hiddenImageGenerator.generate(interest);
};


// --- GAME CONTENT GEN ---

export const generateGameContent = async (
    moduleType: ModuleType,
    interest: string,
    context?: string,
    gallery?: UserPhoto[],
    avoidItems?: string[],
    profileContext?: { name?: string; buddyName?: string; age?: number; avoidances?: string[] }
    // eslint-disable-next-line sonarjs/cognitive-complexity
): Promise<GamePayload> => {
    // 0. AR-LITE SHORTCUT: If PHOTO_HUNT and we have a photo, use it directly!
    if (moduleType === 'PHOTO_HUNT' && gallery && gallery.length > 0) {
        // Try to find a photo with detected objects
        const validPhotos = gallery.filter(p => p.detectedObjects && p.detectedObjects.length > 0);

        if (validPhotos.length > 0) {
            // eslint-disable-next-line sonarjs/pseudo-random
            const photo = validPhotos[Math.floor(Math.random() * validPhotos.length)];
            const targets = photo.detectedObjects as DetectedObject[];

            // Pick a random target
            // eslint-disable-next-line sonarjs/pseudo-random
            const correctObj = targets[Math.floor(Math.random() * targets.length)];

            // Map objects to items
            const items: AssessmentItem[] = targets.map((obj, idx) => ({
                id: `obj_${idx}_${Date.now()}`,
                name: obj.label || obj.name,
                isCorrect: (obj.label === correctObj.label && obj.box2d[0] === correctObj.box2d[0]),
                boundingBox: obj.box2d
            }));

            return {
                template: 'TAP_TRACK',
                backgroundTheme: 'Real World Photo',
                backgroundImage: photo.base64,
                instruction: `Find the ${correctObj.label || correctObj.name}!`,
                spawnMode: 'STATIC',
                items: items
            };
        }
    }

    // 1. SOCIAL_STORY SHORTCUT: Generate a real StoryBook for this module
    if (moduleType === 'SOCIAL_STORY') {
        try {
            // Extract social lesson from context (e.g., "Sharing", "Taking Turns", "Handling Emotions")
            const socialLesson = context || 'Being a good friend';

            // Use profile info for personalization if available
            const childName = profileContext?.name || 'Child';
            const buddyName = profileContext?.buddyName || 'Buddy';
            const age = profileContext?.age || 7;
            const avoidances = profileContext?.avoidances || [];

            // Generate a social story using the existing generator
            const story = await generateStoryBook(
                childName,
                buddyName,
                interest,          // Use the child's interest as theme
                socialLesson,      // The social skill being taught
                age,
                { avoidances, inventoryItems: [] }
            );

            if (story && story.pages && story.pages.length > 0) {
                return {
                    template: 'STORY',
                    instruction: story.title,
                    backgroundTheme: 'Social Story',
                    items: [], // No items needed for story template
                    story: story
                };
            }
        } catch (error) {
            console.error('[GameContent] SOCIAL_STORY generation failed, falling back to Choice', error);
            // Fall through to default CHOICE behavior
        }
    }

    // Strategy Pattern Implementation
    const generators = [
        new DragDropGenerator(),
        new TapTrackGenerator(),
        new ChoiceGenerator(),
        new SpeakingGenerator(),
        new TileRevealGenerator()
    ];

    const generator = generators.find(g => g.canHandle(moduleType));
    if (generator) {
        try {
            const result = await generator.generate(moduleType, interest, context, gallery, avoidItems, profileContext);
            if (result) return result;
        } catch (e) {
            console.error("Strategy Generation Failed, falling back", e);
        }
    } else {
        console.warn(`No generator found for ${moduleType}, using fallback.`);
    }

    // FINAL FALLBACK IF ALL RETRIES FAIL
    return {
        template: 'CHOICE',
        instruction: "Let's find the Star!",
        backgroundTheme: "Safe Room",
        items: [
            { id: '1', name: 'Star', isCorrect: true, imageUrl: getMockImage('Star') },
            { id: '2', name: 'Circle', isCorrect: false, imageUrl: getMockImage('Circle') }
        ]
    };
};

// -- HELPERS --
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const generateFluencyTask = async (_interest: string, _context?: string): Promise<{ sentence: string; emotion: string; instruction: string }> => {
    return { sentence: "I love playing games!", emotion: "Happy", instruction: "Say it!" };
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const generateWritingTask = async (_interest: string, _context?: string): Promise<{ scenario: string; recipient: string; correctParts: string[]; distractors: string[] }> => {
    return {
        scenario: "Ask for a snack",
        recipient: "Dad",
        correctParts: ["I", "want", "apple"],
        distractors: ["Red", "Big"]
    };
};

// --- LEGACY ADAPTERS (For old Matching/Reading/Comprehension Games) ---

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const generateAssessmentLevel1 = async (interest: string, _age: number, _context?: string) => {
    const q = await generateAdaptiveQuestion('L1', interest);
    if (!q) return { question: "Find the Object", correctItem: "Object", distractors: ["A", "B", "C"] };

    const correct = q.items.find(i => i.isCorrect);
    const distractors = q.items.filter(i => !i.isCorrect).map(i => i.name);

    return {
        question: q.questionText,
        correctItem: correct?.name || "Item",
        distractors
    };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const generateAssessmentLevel2 = async (interest: string, _context?: string) => {
    const q = await generateAdaptiveQuestion('L2', interest);
    if (!q) return { question: "Read this", correctItem: "Word", distractors: ["A", "B", "C"] };

    const correct = q.items.find(i => i.isCorrect);
    const distractors = q.items.filter(i => !i.isCorrect).map(i => i.name);

    return {
        question: q.questionText,
        correctItem: correct?.name || "Word",
        distractors
    };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const generateAssessmentLevel3 = async (interest: string, _age: number, _context?: string) => {
    const q = await generateAdaptiveQuestion('L3', interest);
    if (!q) return { question: "Why?", correctItem: "Because", distractors: ["No", "Yes", "Maybe"] };

    const correct = q.items.find(i => i.isCorrect);
    const distractors = q.items.filter(i => !i.isCorrect).map(i => i.name);

    return {
        question: q.questionText,
        correctItem: correct?.name || "Reason",
        distractors
    };
};



// --- SHOP SCENARIO GENERATOR ---
// Delegated to ShopScenarioGenerator module
export const generateShopScenario = async (
    difficulty: 'L1' | 'L2' | 'L3',
    interests: string[],
    age: number
): Promise<ShopScenario | null> => {
    return shopScenarioGenerator.generate(difficulty, interests, age);
};

// Utility function for shuffling arrays (used in generators)
export const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        // eslint-disable-next-line sonarjs/pseudo-random
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};



// --- FUSION BLUEPRINT GENERATOR ---
// Delegated to FusionBlueprintGenerator module
export const generateFusionBlueprint = async (interest: string): Promise<Blueprint | null> => {
    return fusionBlueprintGenerator.generate(interest);
};
