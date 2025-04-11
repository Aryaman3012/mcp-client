import { MCPRegistry } from '../registry/MCPRegistry.js';
import { AgentResponse } from '../types/index.js';
interface MCPCredential {
    name: string;
    description: string;
    isSecret: boolean;
    required: boolean;
}
interface MCPServerIdentification {
    mcpId: string | undefined;
    mcpName: string | undefined;
    isInstalled: boolean;
    requiresInstallation: boolean;
    requiredCredentials: MCPCredential[];
}
interface ToolIdentification {
    toolName: string;
    description: string;
    requiredParameters: string[];
}
interface ParameterGeneration {
    parameters: Record<string, any>;
    missingRequired?: string[];
}
/**
 * Agent 1: MCP Server Identification and Installation Agent
 */
export declare class MCPIdentificationAgent {
    private client;
    private mcpRegistry;
    constructor(mcpRegistry: MCPRegistry);
    get registry(): MCPRegistry;
    private getMCPServerTools;
    private validateMCPServerTool;
    identifyAndPrepareServer(command: string): Promise<MCPServerIdentification>;
    validateServer(mcpId: string | undefined, mcpName: string | undefined): Promise<MCPServerIdentification>;
    process(request: any): Promise<any>;
}
/**
 * Agent 2: Tool Identification Agent
 */
export declare class CommandIntentAgent {
    private client;
    private mcpRegistry;
    constructor(mcpRegistry: MCPRegistry);
    private getMCPServerTools;
    private validateMCPServerTool;
    identifyTool(command: string, mcpId: string): Promise<ToolIdentification>;
    process(request: any): Promise<any>;
}
/**
 * Agent 3: Parameter Generation Agent
 */
export declare class ParameterExtractionAgent {
    private client;
    private mcpRegistry;
    constructor(mcpRegistry: MCPRegistry);
    generateParameters(command: string, mcpId: string, toolName: string): Promise<ParameterGeneration>;
    process(request: any): Promise<any>;
}
/**
 * Agent 4: Response Processing Agent
 * Converts MCP server responses into natural language
 */
export declare class ResponseProcessingAgent {
    private client;
    private mcpRegistry;
    constructor(mcpRegistry: MCPRegistry);
    process(request: {
        command: string;
        result: any;
        context: {
            serverId: string;
            toolName: string;
            parameters: Record<string, any>;
        };
    }): Promise<AgentResponse>;
    private fallbackFormatting;
    private formatItem;
    private humanizeKey;
}
export {};
