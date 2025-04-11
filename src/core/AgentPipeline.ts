import { AgentResponse } from '../types/index.js';
import { MCPClientManager } from './MCPClientManager.js';
import { MCPIdentificationAgent, CommandIntentAgent, ParameterExtractionAgent } from '../agents/AIAgents.js';

export class AgentPipeline {
  constructor(
    private serverSelectionAgent: MCPIdentificationAgent,
    private toolSelectionAgent: CommandIntentAgent,
    private parameterGenerationAgent: ParameterExtractionAgent,
    private clientManager: MCPClientManager
  ) {}

  /**
   * Process a user command through the entire agent pipeline
   */
  async processCommand(userId: string, command: string): Promise<AgentResponse> {
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
      return this.executeTool(
        serverSelection.data.serverId,
        toolSelection.data.toolName,
        parameterGeneration.data.parameters
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
    parameters: Record<string, any>
  ): Promise<AgentResponse> {
    try {
      const result = await this.clientManager.executeTool(serverId, toolName, parameters);
      return {
        success: true,
        output: this.formatOutput(result),
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: `Tool execution error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Format the tool execution output for display
   */
  private formatOutput(result: any): string {
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