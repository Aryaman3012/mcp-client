import { AgentRequest, AgentResponse } from '../types/index.js';
export interface Agent {
    /**
     * Process a request and produce a response
     */
    process(request: AgentRequest): Promise<AgentResponse>;
    /**
     * Get the agent's name/identifier
     */
    getName(): string;
}
/**
 * Base abstract class for all agents
 */
export declare abstract class BaseAgent implements Agent {
    protected name: string;
    constructor(name: string);
    abstract process(request: AgentRequest): Promise<AgentResponse>;
    getName(): string;
    /**
     * Utility method to create a successful response
     */
    protected createSuccessResponse(output: string, data?: Record<string, any>): AgentResponse;
    /**
     * Utility method to create an error response
     */
    protected createErrorResponse(error: string): AgentResponse;
}
