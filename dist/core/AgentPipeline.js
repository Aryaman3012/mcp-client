export class AgentPipeline {
    serverSelectionAgent;
    toolSelectionAgent;
    parameterGenerationAgent;
    responseProcessingAgent;
    clientManager;
    constructor(serverSelectionAgent, toolSelectionAgent, parameterGenerationAgent, responseProcessingAgent, clientManager) {
        this.serverSelectionAgent = serverSelectionAgent;
        this.toolSelectionAgent = toolSelectionAgent;
        this.parameterGenerationAgent = parameterGenerationAgent;
        this.responseProcessingAgent = responseProcessingAgent;
        this.clientManager = clientManager;
    }
    /**
     * Process a user command through the entire agent pipeline
     * @param userId The user ID
     * @param command The command to process
     * @param progressHooks Optional hooks for tracking pipeline progress
     */
    async processCommand(userId, command, progressHooks) {
        try {
            // Step 1: Server Selection
            progressHooks?.onServerSelection?.('Identifying appropriate MCP server...');
            const serverSelection = await this.serverSelectionAgent.process({ userId, command });
            if (!serverSelection.success) {
                progressHooks?.onServerSelection?.(`Failed: ${serverSelection.error}`);
                return serverSelection;
            }
            progressHooks?.onServerSelection?.(`Selected server: ${serverSelection.data.serverName}`);
            // Step 2: Tool Selection
            progressHooks?.onToolSelection?.('Identifying appropriate tool...');
            const toolSelection = await this.toolSelectionAgent.process({
                userId,
                command,
                context: { serverDetails: serverSelection.data }
            });
            if (!toolSelection.success) {
                progressHooks?.onToolSelection?.(`Failed: ${toolSelection.error}`);
                return toolSelection;
            }
            progressHooks?.onToolSelection?.(`Selected tool: ${toolSelection.data.toolName}`);
            // Step 3: Parameter Generation
            progressHooks?.onParameterGeneration?.('Generating parameters...');
            const parameterGeneration = await this.parameterGenerationAgent.process({
                userId,
                command,
                context: {
                    serverDetails: serverSelection.data,
                    toolDetails: toolSelection.data
                }
            });
            if (!parameterGeneration.success) {
                progressHooks?.onParameterGeneration?.(`Failed: ${parameterGeneration.error}`);
                return parameterGeneration;
            }
            progressHooks?.onParameterGeneration?.(`Generated parameters: ${JSON.stringify(parameterGeneration.data.parameters)}`);
            // Step 4: Execute Tool
            progressHooks?.onToolExecution?.('Executing tool...');
            return this.executeTool(serverSelection.data.serverId, toolSelection.data.toolName, parameterGeneration.data.parameters, progressHooks);
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
    async executeTool(serverId, toolName, parameters, progressHooks) {
        try {
            // Check if server is installed, install if needed
            const serverConfig = this.clientManager.getServerConfig(serverId);
            const serverStatus = this.clientManager.getServerStatus(serverId);
            if (!serverStatus?.installed) {
                progressHooks?.onToolExecution?.(`Server ${serverId} not installed. Installing...`);
                const installedSuccessfully = await this.clientManager.installServer(serverId);
                if (!installedSuccessfully) {
                    progressHooks?.onToolExecution?.(`Failed to install server ${serverId}`);
                    return {
                        success: false,
                        error: `Failed to install server ${serverId}`
                    };
                }
                progressHooks?.onToolExecution?.(`Server ${serverId} installed successfully.`);
            }
            // Check if server requires credentials but doesn't have them
            if (serverConfig?.requiresAuth) {
                const hasCredentials = this.clientManager.hasCredentials(serverId);
                if (!hasCredentials) {
                    progressHooks?.onToolExecution?.(`Server ${serverId} requires authentication but credentials not found.`);
                    return {
                        success: false,
                        error: `Server ${serverId} requires authentication. Please provide credentials.`,
                        data: {
                            credentialsRequired: true,
                            serverId,
                            requiredCredentials: serverConfig.requiredCredentials
                        }
                    };
                }
            }
            // Execute the tool
            progressHooks?.onToolExecution?.(`Executing ${toolName} with parameters: ${JSON.stringify(parameters)}`);
            const result = await this.clientManager.executeTool(serverId, toolName, parameters);
            // Process the response
            progressHooks?.onResponseProcessing?.('Processing response...');
            const processedResponse = await this.responseProcessingAgent.process({
                command: toolName,
                result,
                context: {
                    serverId,
                    toolName,
                    parameters
                }
            });
            if (!processedResponse.success) {
                return processedResponse;
            }
            progressHooks?.onToolExecution?.('Execution completed successfully.');
            return {
                success: true,
                output: processedResponse.output,
                data: result
            };
        }
        catch (error) {
            progressHooks?.onToolExecution?.(`Error: ${error.message}`);
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