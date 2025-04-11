import { Agent } from '../agents/Agent.js';
import { AgentRequest, AgentResponse, ToolExecutionRequest, ToolExecutionResponse } from '../types/index.js';
import { MCPClientManager } from './MCPClientManager.js';

export class AgentPipeline {
  private serverSelectionAgent: Agent;
  private toolSelectionAgent: Agent;
  private parameterGenerationAgent: Agent;
  private clientManager: MCPClientManager;

  constructor(
    serverSelectionAgent: Agent,
    toolSelectionAgent: Agent,
    parameterGenerationAgent: Agent,
    clientManager: MCPClientManager
  ) {
    this.serverSelectionAgent = serverSelectionAgent;
    this.toolSelectionAgent = toolSelectionAgent;
    this.parameterGenerationAgent = parameterGenerationAgent;
    this.clientManager = clientManager;
  }

  /**
   * Process a user command through the entire agent pipeline
   */
  async processCommand(userId: string, command: string): Promise<AgentResponse> {
    try {
      // Step 1: Server Selection
      console.log(`[Pipeline] Processing with ${this.serverSelectionAgent.getName()}`);
      const serverSelectionRequest: AgentRequest = {
        userId,
        command
      };
      
      const serverSelectionResponse = await this.serverSelectionAgent.process(serverSelectionRequest);
      
      if (!serverSelectionResponse.success) {
        return serverSelectionResponse; // Return error from server selection
      }

      // Step 2: Tool Selection
      console.log(`[Pipeline] Processing with ${this.toolSelectionAgent.getName()}`);
      const toolSelectionRequest: AgentRequest = {
        userId,
        command,
        context: {
          serverDetails: serverSelectionResponse.data
        }
      };
      
      const toolSelectionResponse = await this.toolSelectionAgent.process(toolSelectionRequest);
      
      if (!toolSelectionResponse.success) {
        return toolSelectionResponse; // Return error from tool selection
      }

      // Step 3: Parameter Generation
      console.log(`[Pipeline] Processing with ${this.parameterGenerationAgent.getName()}`);
      const parameterGenerationRequest: AgentRequest = {
        userId,
        command,
        context: {
          serverDetails: serverSelectionResponse.data,
          toolDetails: toolSelectionResponse.data
        }
      };
      
      const parameterGenerationResponse = await this.parameterGenerationAgent.process(parameterGenerationRequest);
      
      if (!parameterGenerationResponse.success) {
        return parameterGenerationResponse; // Return error from parameter generation
      }

      // Step 4: Execute the tool with the generated parameters
      console.log(`[Pipeline] Executing tool on MCP server`);
      const toolExecutionRequest: ToolExecutionRequest = {
        serverId: serverSelectionResponse.data!.serverId,
        toolName: toolSelectionResponse.data!.toolName,
        parameters: parameterGenerationResponse.data!.parameters
      };
      
      const toolExecutionResult = await this.executeTool(toolExecutionRequest);
      
      // Return final result
      if (toolExecutionResult.success) {
        return {
          success: true,
          output: this.formatOutput(toolExecutionResult.content),
          data: {
            serverDetails: serverSelectionResponse.data,
            toolDetails: toolSelectionResponse.data,
            parameters: parameterGenerationResponse.data!.parameters,
            result: toolExecutionResult.content
          }
        };
      } else {
        return {
          success: false,
          error: `Tool execution failed: ${toolExecutionResult.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Pipeline execution failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Execute a tool on an MCP server
   */
  private async executeTool(request: ToolExecutionRequest): Promise<ToolExecutionResponse> {
    try {
      // Check server health before executing the tool
      const isHealthy = await this.clientManager.checkServerHealth(request.serverId);
      
      if (!isHealthy) {
        return {
          success: false,
          error: `Server ${request.serverId} is not healthy`
        };
      }

      // Execute the tool
      const result = await this.clientManager.executeTool(
        request.serverId,
        request.toolName,
        request.parameters
      );
      
      return {
        success: true,
        content: result
      };
    } catch (error) {
      return {
        success: false,
        error: `Tool execution failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Format the tool execution output for display
   */
  private formatOutput(content: any): string {
    if (!content) {
      return 'No output';
    }
    
    // For text content, extract the text
    if (Array.isArray(content.content)) {
      const textItems = content.content
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text);
      
      if (textItems.length > 0) {
        return textItems.join('\n');
      }
    }
    
    // Fallback to JSON stringification for other content types
    return JSON.stringify(content, null, 2);
  }
} 