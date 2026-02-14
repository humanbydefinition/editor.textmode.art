import type { EngineId, IEngine } from '@/core/engine.types';

/**
 * Registry for runtime engines.
 */
class EngineRegistry {
    private readonly engines = new Map<EngineId, IEngine>();

    /**
     * Register an engine.
     */
    register(engine: IEngine): void {
        if (this.engines.has(engine.id)) {
            console.warn(`Engine with id "${engine.id}" is already registered. Overwriting.`);
        }
        this.engines.set(engine.id, engine);
    }

    /**
     * Get an engine by ID.
     */
    get(id: EngineId): IEngine | undefined {
        return this.engines.get(id);
    }

    /**
     * Get all registered engines.
     */
    getAll(): IEngine[] {
        return Array.from(this.engines.values());
    }
}

export const registry = new EngineRegistry();
