import { MCPRegistry } from '../registry/MCPRegistry.js';
export declare class APIServer {
    private app;
    private server;
    private io;
    private registry;
    private clientManager;
    private pipeline;
    private port;
    constructor(registry: MCPRegistry, port?: number);
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandling;
    start(): void;
    stop(): void;
}
