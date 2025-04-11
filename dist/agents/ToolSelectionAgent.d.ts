import { BaseAgent } from './Agent.js';
import { AgentRequest, AgentResponse } from '../types/index.js';
import { MCPClientManager } from '../core/MCPClientManager.js';
export declare class ToolSelectionAgent extends BaseAgent {
    private clientManager;
    constructor(clientManager: MCPClientManager);
    process(request: AgentRequest): Promise<AgentResponse>;
    /**
     * Select the most appropriate tool for the command
     */
    private selectTool;
}
