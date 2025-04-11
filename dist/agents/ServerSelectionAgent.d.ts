import { BaseAgent } from './Agent.js';
import { AgentRequest, AgentResponse } from '../types/index.js';
import { MCPRegistry } from '../registry/MCPRegistry.js';
import { MCPClientManager } from '../core/MCPClientManager.js';
export declare class ServerSelectionAgent extends BaseAgent {
    private registry;
    private clientManager;
    private keywordToCapability;
    constructor(registry: MCPRegistry, clientManager: MCPClientManager);
    process(request: AgentRequest): Promise<AgentResponse>;
    /**
     * Extract potential capabilities from the command
     */
    private extractCapabilities;
}
