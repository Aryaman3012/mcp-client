import { AgentResponse } from '../types/index.js';
import { MCPClientManager } from './MCPClientManager.js';
import { MCPIdentificationAgent, CommandIntentAgent, ParameterExtractionAgent, ResponseProcessingAgent } from '../agents/AIAgents.js';
export interface ProgressHooks {
    onServerSelection?: (details: string) => void;
    onToolSelection?: (details: string) => void;
    onParameterGeneration?: (details: string) => void;
    onToolExecution?: (details: string) => void;
    onResponseProcessing?: (details: string) => void;
}
export declare class AgentPipeline {
    private serverSelectionAgent;
    private toolSelectionAgent;
    private parameterGenerationAgent;
    private responseProcessingAgent;
    private clientManager;
    constructor(serverSelectionAgent: MCPIdentificationAgent, toolSelectionAgent: CommandIntentAgent, parameterGenerationAgent: ParameterExtractionAgent, responseProcessingAgent: ResponseProcessingAgent, clientManager: MCPClientManager);
    /**
     * Process a user command through the entire agent pipeline
     * @param userId The user ID
     * @param command The command to process
     * @param progressHooks Optional hooks for tracking pipeline progress
     */
    processCommand(userId: string, command: string, progressHooks?: ProgressHooks): Promise<AgentResponse>;
    /**
     * Execute a tool on an MCP server
     */
    private executeTool;
    /**
     * Format the tool execution output for display
     */
    private formatOutput;
}
