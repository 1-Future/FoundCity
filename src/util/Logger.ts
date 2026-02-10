const Logger = {
    log(message: string, ...args: unknown[]): void {
        console.log(`[${new Date().toISOString()}] ${message}`, ...args);
    },

    error(message: string, ...args: unknown[]): void {
        console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, ...args);
    },

    warn(message: string, ...args: unknown[]): void {
        console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, ...args);
    },

    debug(message: string, ...args: unknown[]): void {
        if (process.env.NODE_DEBUG === 'true') {
            console.debug(`[${new Date().toISOString()}] [DEBUG] ${message}`, ...args);
        }
    }
};

export default Logger;
