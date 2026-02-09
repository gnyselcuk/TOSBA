import { UserProfile, ModuleType } from '../types';

export type TaskType =
    | 'GENERATE_CURRICULUM_STRUCTURE'
    | 'GENERATE_MODULE_CONTENT'
    | 'GENERATE_BUDDY_IMAGE';

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface CurriculumGenerationPayload {
    profile: UserProfile;
    assessedLevel: 0 | 1 | 2 | 3;
}

export interface ModuleContentGenerationPayload {
    moduleId: string;
    moduleType: ModuleType;
    description: string;
    interest?: string;
}

export interface BuddyImageGenerationPayload {
    prompt?: string; // Placeholder for future extensibility
}

interface TaskBase {
    id: string;
    priority: TaskPriority;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    retries: number;
    createdAt: number;
    result?: unknown;
    error?: string;
}

export type ContentTask =
    | (TaskBase & { type: 'GENERATE_CURRICULUM_STRUCTURE'; payload: CurriculumGenerationPayload })
    | (TaskBase & { type: 'GENERATE_MODULE_CONTENT'; payload: ModuleContentGenerationPayload })
    | (TaskBase & { type: 'GENERATE_BUDDY_IMAGE'; payload: BuddyImageGenerationPayload });
