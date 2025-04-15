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

export class AgentPipeline {
  constructor(
    private serverSelectionAgent: MCPIdentificationAgent,
    private toolSelectionAgent: CommandIntentAgent,
    private parameterGenerationAgent: ParameterExtractionAgent,
    private responseProcessingAgent: ResponseProcessingAgent,
    private clientManager: MCPClientManager
  ) {}

  /**
   * Process a user command through the entire agent pipeline
   * @param userId The user ID
   * @param command The command to process
   * @param progressHooks Optional hooks for tracking pipeline progress
   */
  async processCommand(
    userId: string, 
    command: string, 
    progressHooks?: ProgressHooks
  ): Promise<AgentResponse> {
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
      return this.executeTool(
        serverSelection.data.serverId,
        toolSelection.data.toolName,
        parameterGeneration.data.parameters,
        progressHooks
      );
    } catch (error) {
      return {
        success: false,
        error: `Pipeline error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Execute a tool on an MCP server
   */
  private async executeTool(
    serverId: string,
    toolName: string,
    parameters: Record<string, any>,
    progressHooks?: ProgressHooks
  ): Promise<AgentResponse> {
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
        progressHooks?.onResponseProcessing?.(`Failed to process response: ${processedResponse.error}`);
        return processedResponse;
      }
      
      progressHooks?.onResponseProcessing?.(`Response processed successfully: ${processedResponse.output?.substring(0, 50)}...`);
      progressHooks?.onToolExecution?.('Execution completed successfully.');
      // Return the processed response with original data attached
      return {
        success: true,
        output: processedResponse.output,
        data: result,
        rawResult: result,
        processedResponse: true
      };
    }    catch (error) {
      progressHooks?.onToolExecution?.(`Error: ${(error as Error).message}`);
      return {
        success: false,
        error: `Tool execution error: ${(error as Error).message}`
      };
    }
  }
} 