import { GamePayload, ModuleType, UserPhoto } from "../../types";

export interface GameContentGenerator {
    canHandle(moduleType: ModuleType): boolean;
    generate(
        moduleType: ModuleType,
        interest: string,
        context?: string,
        gallery?: UserPhoto[],
        avoidItems?: string[],
        profileContext?: { name?: string, buddyName?: string, age?: number, avoidances?: string[] }
    ): Promise<GamePayload | null>;
}
