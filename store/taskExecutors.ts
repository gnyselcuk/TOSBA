import { db } from '../services/db';
import { generateCurriculum, generateGameContent } from '../services/geminiService';
import { useUserStore } from './userStore';
import { GamePayload } from '../types';
import { CurriculumGenerationPayload, ModuleContentGenerationPayload } from './workerTypes';

export const executeCurriculumGeneration = async (payload: CurriculumGenerationPayload) => {
    const userStore = useUserStore.getState();
    const { profile, assessedLevel } = payload;

    if (!profile) throw new Error("Missing profile for curriculum generation");

    const curriculum = await generateCurriculum(profile, [], assessedLevel);
    if (curriculum) {
        userStore.setCurriculum(curriculum);
    } else {
        throw new Error("Curriculum generation returned null");
    }
};

export const executeModuleContentGeneration = async (payload: ModuleContentGenerationPayload) => {
    const userStore = useUserStore.getState();
    const { moduleId, moduleType, description, interest } = payload;

    if (!moduleId || !moduleType || !description) {
        throw new Error("Missing required parameters for module generation");
    }

    const QUESTIONS_PER_MODULE = 5;

    // Get profile info for personalization
    const profile = userStore.profile;
    const buddy = userStore.buddy;
    const profileContext = {
        name: profile?.name,
        buddyName: buddy?.name,
        age: profile?.developmentalAge || profile?.chronologicalAge,
        avoidances: profile?.avoidances
    };

    // Check cache
    const isCached = await db.cache.hasGame(moduleId);
    if (isCached) {
        const cachedData = await db.cache.getGame(moduleId);
        if (cachedData && (Array.isArray(cachedData) || cachedData.questions)) {
            userStore.cacheModuleContent(moduleId, cachedData);
            return;
        }
    }

    const questionPack: GamePayload[] = [];
    const avoidList: string[] = [];

    for (let i = 0; i < QUESTIONS_PER_MODULE; i++) {
        const content = await generateGameContent(
            moduleType,
            interest || '',
            i === 0 ? description : `${description} (Variation ${i + 1})`,
            undefined,
            [...avoidList],
            profileContext
        );

        if (content) {
            questionPack.push(content);

            if (content.template === 'STORY') {
                break;
            }

            content.items.forEach(itm => avoidList.push(itm.name));
        }

        // Delay to respect API limits
        await new Promise(r => setTimeout(r, 500));
    }

    if (questionPack.length > 0) {
        const packPayload: GamePayload = {
            id: `pack_${moduleId}`,
            template: 'CHOICE',
            instruction: 'Lesson Pack',
            backgroundTheme: 'Pack',
            items: [],
            questions: questionPack
        };

        userStore.cacheModuleContent(moduleId, packPayload);
        await db.cache.setGame(moduleId, packPayload);
    } else {
        throw new Error("Game content generation returned empty");
    }
};
