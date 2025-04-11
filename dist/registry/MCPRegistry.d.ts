import { MCPServerConfig, MCPServerCredentials, MCPServerStatus } from '../types/index.js';
export declare class MCPRegistry {
    private configPath;
    private credentialsPath;
    private configs;
    private credentials;
    private serverStatus;
    constructor(storagePath?: string);
    /**
     * Initialize the registry by loading configs and credentials from storage
     */
    initialize(): Promise<void>;
    /**
     * Save registry state to disk
     */
    private saveState;
    /**
     * Register a new MCP server configuration
     */
    registerServer(config: MCPServerConfig): Promise<void>;
    /**
     * Get server configuration by ID
     */
    getServerConfig(id: string): MCPServerConfig | undefined;
    /**
     * Get all server configurations
     */
    getAllServerConfigs(): MCPServerConfig[];
    /**
     * Update server status
     */
    updateServerStatus(id: string, status: Partial<MCPServerStatus>): Promise<void>;
    /**
     * Get status of a server
     */
    getServerStatus(id: string): MCPServerStatus | undefined;
    /**
     * Store credentials for a server
     */
    storeCredentials(credentials: MCPServerCredentials): Promise<void>;
    /**
     * Get credentials for a server
     */
    getCredentials(serverId: string): MCPServerCredentials | undefined;
    /**
     * Find servers by capability
     */
    findServersByCapability(capability: string): MCPServerConfig[];
}
