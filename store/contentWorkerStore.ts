import { create, StoreApi } from 'zustand';
import { executeCurriculumGeneration, executeModuleContentGeneration } from './taskExecutors';
import {
    TaskType,
    TaskPriority,
    ContentTask,
    CurriculumGenerationPayload,
    ModuleContentGenerationPayload,
    BuddyImageGenerationPayload
} from './workerTypes';

// --- STORE ---

interface WorkerState {
    queue: ContentTask[];
    isProcessing: boolean;
    activeTaskId: string | null;

    // Actions
    addTask: {
        (type: 'GENERATE_CURRICULUM_STRUCTURE', payload: CurriculumGenerationPayload, priority?: TaskPriority): void;
        (type: 'GENERATE_MODULE_CONTENT', payload: ModuleContentGenerationPayload, priority?: TaskPriority): void;
        (type: 'GENERATE_BUDDY_IMAGE', payload: BuddyImageGenerationPayload, priority?: TaskPriority): void;
    };
    removeTask: (taskId: string) => void;
    startProcessing: () => void;
    stopProcessing: () => void;
    getTaskStatus: (taskId: string) => 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'NOT_FOUND';

    // Helpers
    clearQueue: () => void;
}

type SetState = StoreApi<WorkerState>['setState'];

// Priority Map (Lower number = Higher priority)
const PRIORITY_MAP: Record<TaskPriority, number> = {
    'CRITICAL': 0,
    'HIGH': 1,
    'MEDIUM': 2,
    'LOW': 3
};

export const useContentWorker = create<WorkerState>((set, get) => ({
    queue: [],
    isProcessing: false,
    activeTaskId: null,

    // Implementation of the overloaded function
    addTask: (
        type: TaskType,
        payload: CurriculumGenerationPayload | ModuleContentGenerationPayload | BuddyImageGenerationPayload,
        priority: TaskPriority = 'MEDIUM'
    ) => {
        const newTask: ContentTask = {
            id: `${type}_${crypto.randomUUID()}`,
            type,
            priority,
            status: 'PENDING',
            payload,
            retries: 0,
            createdAt: Date.now()
        } as ContentTask;

        set(state => {
            const isDuplicate = state.queue.some(t =>
                t.type === type &&
                JSON.stringify(t.payload) === JSON.stringify(payload) &&
                t.status !== 'FAILED'
            );

            if (isDuplicate) {
                return {};
            }

            const newQueue = [...state.queue, newTask].sort((a, b) => {
                const pDraft = PRIORITY_MAP[a.priority] - PRIORITY_MAP[b.priority];
                if (pDraft !== 0) return pDraft;
                return a.createdAt - b.createdAt;
            });

            return { queue: newQueue };
        });

        if (!get().isProcessing) {
            processQueueInternal(get, set);
        }
    },

    removeTask: (taskId) => set(state => ({
        queue: state.queue.filter(t => t.id !== taskId)
    })),

    startProcessing: () => {
        if (!get().isProcessing) {
            processQueueInternal(get, set);
        }
    },

    stopProcessing: () => set({ isProcessing: false }),

    getTaskStatus: (taskId) => {
        const task = get().queue.find(t => t.id === taskId);
        return task ? task.status : 'NOT_FOUND';
    },

    clearQueue: () => set({ queue: [], isProcessing: false, activeTaskId: null })
}));

// --- WORKER LOGIC ---

const processQueueInternal = async (get: () => WorkerState, set: SetState) => {
    if (get().isProcessing) return;

    set({ isProcessing: true });

    while (true) {
        const state = get();
        if (!state.isProcessing) break;

        const nextTask = state.queue.find(t => t.status === 'PENDING');

        if (!nextTask) {
            set({ isProcessing: false, activeTaskId: null });
            break;
        }

        // Mark as Running
        set(s => ({
            activeTaskId: nextTask.id,
            queue: s.queue.map(t => t.id === nextTask.id ? { ...t, status: 'RUNNING' } : t)
        }));

        await handleTaskExecution(nextTask, set);

        // Small delay
        await new Promise(r => setTimeout(r, 500));
    }
};

const handleTaskExecution = async (task: ContentTask, set: SetState) => {
    try {
        if (task.type === 'GENERATE_CURRICULUM_STRUCTURE') {
            await executeCurriculumGeneration(task.payload);
        } else if (task.type === 'GENERATE_MODULE_CONTENT') {
            await executeModuleContentGeneration(task.payload);
        }
        // else if (task.type === 'GENERATE_BUDDY_IMAGE') {
        //     await executeBuddyGeneration(task.payload);
        // }

        // Success
        set(s => ({
            queue: s.queue.filter(t => t.id !== task.id),
            activeTaskId: null
        }));

    } catch (error) {
        console.error(`[Worker] Failed: ${task.type}`, error);
        handleTaskFailure(task, set);
    }
};

const handleTaskFailure = (task: ContentTask, set: SetState) => {
    if (task.retries < 3) {
        set(s => ({
            activeTaskId: null,
            queue: s.queue.map(t => t.id === task.id ? {
                ...t,
                status: 'PENDING',
                retries: t.retries + 1,
                priority: 'LOW'
            } : t)
        }));
        // We can't await here easily without complicating the loop,
        // but the main loop has a delay which helps.
    } else {
        set(s => ({
            activeTaskId: null,
            queue: s.queue.filter(t => t.id !== task.id)
        }));
    }
};
