import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { MCPRegistry } from '../registry/MCPRegistry.js';
import { MCPServerConfig, MCPServerStatus } from '../types/index.js';
export declare class MCPClientManager {
    private registry;
    private activeClients;
    constructor(registry: MCPRegistry);
    /**
     * Prompt the user for credentials
     */
    private promptForCredentials;
    /**
     * Convert NodeJS.ProcessEnv to Record<string, string> by removing undefined values
     */
    private sanitizeEnv;
    /**
     * Install an MCP server if not already installed
     */
    installServer(serverId: string): Promise<boolean>;
    /**
     * Start an MCP server and create a client connection
     */
    connectToServer(serverId: string): Promise<Client>;
    /**
     * Disconnect from an MCP server
     */
    disconnectFromServer(serverId: string): Promise<void>;
    /**
     * Get an active client for a server, starting it if necessary
     */
    getClient(serverId: string): Promise<Client>;
    /**
     * Check if a server is running and healthy
     */
    checkServerHealth(serverId: string): Promise<boolean>;
    /**
     * Execute a tool on an MCP server
     */
    executeTool(serverId: string, toolName: string, parameters: Record<string, any>): Promise<any>;
    /**
     * List available tools on an MCP server
     */
    listTools(serverId: string): Promise<any[]>;
    /**
     * Get the server configuration
     */
    getServerConfig(serverId: string): MCPServerConfig | undefined;
    /**
     * Get the server status
     */
    getServerStatus(serverId: string): MCPServerStatus | undefined;
    /**
     * Check if credentials exist for the server
     */
    hasCredentials(serverId: string): boolean;
}
