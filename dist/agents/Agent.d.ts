import { AgentRequest, AgentResponse } from '../types/index.js';
/**
 * Base interface for all MCP agents
 */
export interface Agent {
    /**
     * Process a request and return a response
     */
    process(request: AgentRequest): Promise<AgentResponse>;
}
