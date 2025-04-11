export class AgentPipeline {
    serverSelectionAgent;
    toolSelectionAgent;
    parameterGenerationAgent;
    clientManager;
    constructor(serverSelectionAgent, toolSelectionAgent, parameterGenerationAgent, clientManager) {
        this.serverSelectionAgent = serverSelectionAgent;
        this.toolSelectionAgent = toolSelectionAgent;
        this.parameterGenerationAgent = parameterGenerationAgent;
        this.clientManager = clientManager;
    }
    /**
     * Process a user command through the entire agent pipeline
     */
    async processCommand(userId, command) {
        try {
            // Step 1: Server Selection
            const serverSelection = await this.serverSelectionAgent.process({ userId, command });
            if (!serverSelection.success) {
                return serverSelection;
            }
            // Step 2: Tool Selection
            const toolSelection = await this.toolSelectionAgent.process({
                userId,
                command,
                context: { serverDetails: serverSelection.data }
            });
            if (!toolSelection.success) {
                return toolSelection;
            }
            // Step 3: Parameter Generation
            const parameterGeneration = await this.parameterGenerationAgent.process({
                userId,
                command,
                context: {
                    serverDetails: serverSelection.data,
                    toolDetails: toolSelection.data
                }
            });
            if (!parameterGeneration.success) {
                return parameterGeneration;
            }
            // Step 4: Execute Tool
            return this.executeTool(serverSelection.data.serverId, toolSelection.data.toolName, parameterGeneration.data.parameters);
        }
        catch (error) {
            return {
                success: false,
                error: `Pipeline error: ${error.message}`
            };
        }
    }
    /**
     * Execute a tool on an MCP server
     */
    async executeTool(serverId, toolName, parameters) {
        try {
            const result = await this.clientManager.executeTool(serverId, toolName, parameters);
            return {
                success: true,
                output: this.formatOutput(result),
                data: result
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Tool execution error: ${error.message}`
            };
        }
    }
    /**
     * Format the tool execution output for display
     */
    formatOutput(result) {
        if (!result) {
            return 'No result';
        }
        if (typeof result === 'string') {
            return result;
        }
        if (Array.isArray(result)) {
            return result.join('\n');
        }
        return JSON.stringify(result, null, 2);
    }
}
//# sourceMappingURL=AgentPipeline.js.map