import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { GamePayload, CurriculumModule } from '../types';

interface UseGamePackLoaderProps {
    activeModule: CurriculumModule | null;
    moduleContents: Record<string, GamePayload>;
}

export const useGamePackLoader = ({ activeModule, moduleContents }: UseGamePackLoaderProps) => {
    const [questionPack, setQuestionPack] = useState<GamePayload[]>([]);
    const [loading, setLoading] = useState(true);

    // Helper to ensure robust IDs
    const sanitizePack = useCallback((pack: GamePayload[]): GamePayload[] => {
        return pack.map((q, qIdx) => ({
            ...q,
            id: q.id || `q_${Date.now()}_${qIdx}_${crypto.randomUUID()}`,
            items: q.items?.map((item, iIdx) => ({
                ...item,
                id: item.id || `item_${qIdx}_${iIdx}_${crypto.randomUUID()}`
            })) || []
        }));
    }, []);

    useEffect(() => {
        const loadPack = async () => {
            if (!activeModule) return;

            const activeModuleContent = moduleContents[activeModule.id];

            // A. Check RAM (Fast & Reacts to Worker finishing)
            if (activeModuleContent) {
                const rawPack = activeModuleContent.questions || [activeModuleContent];
                const pack = sanitizePack(rawPack);
                if (pack.length > 0) {
                    setQuestionPack([...pack]);
                    setLoading(false);
                    return;
                }
            }

            setLoading(true);

            try {
                // B. Check Disk Cache (PRIORITY for homework/photo games)
                const cachedData = await db.cache.getGame(activeModule.id);

                if (cachedData) {
                    if (cachedData.questions && cachedData.questions.length > 0) {
                        setQuestionPack(sanitizePack(cachedData.questions));
                    } else {
                        setQuestionPack(sanitizePack([cachedData]));
                    }
                    setLoading(false);
                } else {
                    // C. Cache Miss - Waiting for Worker
                    // Do NOT generate live here. Let the reactive listener catch the worker's update.
                }
            } catch (e) {
                console.error("[GamePackLoader] Pack load failed", e);
                setLoading(false);
            }
        };

        loadPack();
    }, [activeModule, moduleContents, sanitizePack]);

    return { questionPack, loading, setLoading };
};
