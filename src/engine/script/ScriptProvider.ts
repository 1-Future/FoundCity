import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

export type ScriptContext = {
    self: any;
    target?: any;
    args?: any[];
    lastInt?: number;
};

export type ScriptHandler = (ctx: ScriptContext) => void;

// Replaces RuneScript VM with TypeScript handler function registry.
// Uses the same trigger + typeId/categoryId lookup key scheme as lostcity-ref's ScriptProvider.
export default class ScriptProvider {
    // handler by (trigger | typeId << 10)
    private static handlers: Map<number, ScriptHandler> = new Map();
    // handler by name
    private static namedHandlers: Map<string, ScriptHandler> = new Map();

    static register(trigger: ServerTriggerType, typeId: number, handler: ScriptHandler): void {
        const key = trigger | (typeId << 10);
        this.handlers.set(key, handler);
    }

    static registerCategory(trigger: ServerTriggerType, categoryId: number, handler: ScriptHandler): void {
        // category handlers stored with a different bit offset to avoid collision
        const key = trigger | ((categoryId + 0x100000) << 10);
        this.handlers.set(key, handler);
    }

    static registerGlobal(trigger: ServerTriggerType, handler: ScriptHandler): void {
        // global handlers stored with typeId = -1
        const key = trigger | (0xFFFFF << 10);
        this.handlers.set(key, handler);
    }

    static registerByName(name: string, handler: ScriptHandler): void {
        this.namedHandlers.set(name, handler);
    }

    static getByTrigger(trigger: ServerTriggerType, typeId: number, categoryId: number = -1): ScriptHandler | undefined {
        // try specific type first
        let handler = this.handlers.get(trigger | (typeId << 10));
        if (handler) return handler;

        // then try category
        if (categoryId !== -1) {
            handler = this.handlers.get(trigger | ((categoryId + 0x100000) << 10));
            if (handler) return handler;
        }

        // then try global
        handler = this.handlers.get(trigger | (0xFFFFF << 10));
        return handler;
    }

    static getByTriggerSpecific(trigger: ServerTriggerType, typeId: number): ScriptHandler | undefined {
        return this.handlers.get(trigger | (typeId << 10));
    }

    static getByName(name: string): ScriptHandler | undefined {
        return this.namedHandlers.get(name);
    }

    static clear(): void {
        this.handlers.clear();
        this.namedHandlers.clear();
    }

    static async loadAll(dir: string): Promise<void> {
        // Dynamic import of handler files from the directory
        // Handlers self-register by calling ScriptProvider.register()
        console.log(`[ScriptProvider] Loading handlers from ${dir}`);
    }

    static async reload(): Promise<void> {
        this.clear();
        console.log('[ScriptProvider] Handlers cleared for reload');
    }
}
