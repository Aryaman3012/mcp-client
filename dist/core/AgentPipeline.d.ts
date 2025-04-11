import { AgentResponse } from '../types/index.js';
import { MCPClientManager } from './MCPClientManager.js';
import { MCPIdentificationAgent, CommandIntentAgent, ParameterExtractionAgent } from '../agents/AIAgents.js';
export declare class AgentPipeline {
    private serverSelectionAgent;
    private toolSelectionAgent;
    private parameterGenerationAgent;
    private clientManager;
    constructor(serverSelectionAgent: MCPIdentificationAgent, toolSelectionAgent: CommandIntentAgent, parameterGenerationAgent: ParameterExtractionAgent, clientManager: MCPClientManager);
    /**
     * Process a user command through the entire agent pipeline
     */
    processCommand(userId: string, command: string): Promise<AgentResponse>;
    /**
     * Execute a tool on an MCP server
     */
    private executeTool;
    /**
     * Format the tool execution output for display
     */
    private formatOutput;
}
