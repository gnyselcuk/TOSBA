import { useEffect, useRef } from 'react';
import { useUserStore } from '../store/userStore';
import { useContentWorker } from '../store/contentWorkerStore';
import { AppStage } from '../types';

// Helper function to determine task priority based on position
const getPriority = (position: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' => {
    if (position === 0) return 'CRITICAL';
    if (position === 1) return 'HIGH';
    return 'MEDIUM';
};

// Helper function to check if module should be prefetched
const shouldPrefetchModule = (
    mod: { id: string },
    completedModuleIds: string[],
    activeModuleId: string | undefined,
    moduleContents: Record<string, unknown>
): boolean => {
    // Skip if completed (unless active)
    if (completedModuleIds.includes(mod.id) && mod.id !== activeModuleId) {
        return false;
    }
    
    // Skip if cached in memory
    if (moduleContents[mod.id]) {
        return false;
    }
    
    return true;
};

export const useContentWorkerHook = () => {
    const {
        stage,
        curriculum,
        profile,
        completedModuleIds,
        moduleContents,
        activeModule
    } = useUserStore();

    const { addTask, queue } = useContentWorker();

    // Track added tasks to avoid redundant adds in the same render cycle (though store handles dupes too)
    const processedRef = useRef<{ lastCheck: number }>({ lastCheck: 0 });

    // REMOVED: Dynamic assessment generation - now using static assessment


    // 2. CURRICULUM GENERATION
    useEffect(() => {
        // Trigger if in Curriculum Generation OR Dashboard (post-assessment)
        const shouldTrigger = (stage === AppStage.CURRICULUM_GENERATION || stage === AppStage.DASHBOARD) && !curriculum && profile;

        if (shouldTrigger) {
            // Check if already queued
            const isQueued = queue.some(t => t.type === 'GENERATE_CURRICULUM_STRUCTURE');
            if (!isQueued) {
                // eslint-disable-next-line no-console
                console.log("[WorkerHook] Triggering Curriculum Structure Gen");
                addTask('GENERATE_CURRICULUM_STRUCTURE', {
                    profile,
                    assessedLevel: profile.assessedLevel // Use static assessment level
                }, 'CRITICAL');
            }
        }
    }, [stage, curriculum, profile]);


    // 3. GAME CONTENT PREFETCHING (Replacing useGamePrefetch)
    useEffect(() => {
        if (!curriculum || !curriculum.weeklySchedule || !profile) return;

        // Debounce slightly to avoid spamming on rapid changes
        const now = Date.now();
        if (now - processedRef.current.lastCheck < 2000) return;
        processedRef.current.lastCheck = now;

        const allModules = curriculum.weeklySchedule.flatMap(d => d.modules || []);

        // Find Index of current focus
        let startIndex = 0;
        if (activeModule) {
            startIndex = allModules.findIndex(m => m.id === activeModule.id);
        } else {
            startIndex = allModules.findIndex(m => !completedModuleIds.includes(m.id));
        }
        if (startIndex === -1) startIndex = 0;

        // Look ahead Window
        const WINDOW_SIZE = 4;

        for (let i = 0; i < WINDOW_SIZE; i++) {
            const idx = startIndex + i;
            if (idx >= allModules.length) break;

            const mod = allModules[idx];

            // Check if module should be prefetched
            if (!shouldPrefetchModule(mod, completedModuleIds, activeModule?.id, moduleContents)) {
                continue;
            }

            // Check if task exists
            const inQueue = queue.some(t => t.type === 'GENERATE_MODULE_CONTENT' && t.payload.moduleId === mod.id);
            if (inQueue) continue;

            const priority = getPriority(i);

            // Add Task
            addTask('GENERATE_MODULE_CONTENT', {
                moduleId: mod.id,
                moduleType: mod.type,
                description: mod.description,
                interest: profile.interests[0]
            }, priority);
        }

    }, [curriculum, activeModule, completedModuleIds, moduleContents, queue.length]);

};
