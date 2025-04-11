import { BaseAgent } from './Agent.js';
import { AgentRequest, AgentResponse } from '../types/index.js';
export declare class ParameterGenerationAgent extends BaseAgent {
    constructor();
    process(request: AgentRequest): Promise<AgentResponse>;
    /**
     * Extract parameters from the command based on the tool's argument schema
     */
    private extractParameters;
    /**
     * Convert a string value to the appropriate type
     */
    private convertValue;
    /**
     * Validate parameters against the tool's argument schema
     */
    private validateParameters;
}
