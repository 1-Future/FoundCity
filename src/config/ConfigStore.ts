import fs from 'fs';
import path from 'path';

/**
 * Generic configuration store that loads typed configs from JSON files.
 * Replaces lostcity-ref's binary .dat/.idx cache decode system.
 *
 * Each config type (NPC, Obj, Loc, etc.) has its own ConfigStore<T> instance.
 * Configs are indexed by numeric ID and optionally by debugname string.
 */
export default class ConfigStore<T extends { id: number; debugname?: string }> {
    private configs: T[] = [];
    private configNames: Map<string, number> = new Map();

    get count(): number {
        return this.configs.length;
    }

    get(id: number): T | undefined {
        return this.configs[id];
    }

    getByName(name: string): T | undefined {
        const id = this.configNames.get(name);
        if (id === undefined) return undefined;
        return this.configs[id];
    }

    getId(name: string): number {
        return this.configNames.get(name) ?? -1;
    }

    getAll(): T[] {
        return this.configs;
    }

    set(id: number, config: T): void {
        this.configs[id] = config;
        if (config.debugname) {
            this.configNames.set(config.debugname, id);
        }
    }

    /**
     * Load configs from a JSON file. The file should contain an array of config objects,
     * each with an `id` field.
     */
    load(filePath: string): void {
        if (!fs.existsSync(filePath)) {
            console.log(`[ConfigStore] No config file at ${filePath}, skipping`);
            return;
        }
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const arr: T[] = JSON.parse(raw);
            for (const config of arr) {
                this.set(config.id, config);
            }
            console.log(`[ConfigStore] Loaded ${arr.length} configs from ${path.basename(filePath)}`);
        } catch (err) {
            console.error(`[ConfigStore] Failed to load ${filePath}:`, err);
        }
    }

    /**
     * Load configs from a directory of individual JSON files (one per config).
     * Each file should be named {id}.json or {debugname}.json.
     */
    loadDir(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            console.log(`[ConfigStore] No config dir at ${dirPath}, skipping`);
            return;
        }
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
        for (const file of files) {
            try {
                const raw = fs.readFileSync(path.join(dirPath, file), 'utf-8');
                const config: T = JSON.parse(raw);
                this.set(config.id, config);
            } catch (err) {
                console.error(`[ConfigStore] Failed to load ${file}:`, err);
            }
        }
        console.log(`[ConfigStore] Loaded ${files.length} configs from ${path.basename(dirPath)}/`);
    }
}
