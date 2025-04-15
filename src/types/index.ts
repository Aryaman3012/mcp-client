// Types for MCP Server Registry
export interface MCPServerConfig {
  id: string;
  name: string;
  description?: string;
  command: string;
  args?: string[];
  installCommand?: string;
  requiresAuth: boolean;
  capabilities?: string[];
  requiredCredentials?: CredentialRequirement[];
  tools?: {
    [key: string]: {
      name: string;
      description: string;
      inputSchema: {
        type: string;
        properties: Record<string, any>;
        required: string[];
      };
    };
  };
}

export interface CredentialRequirement {
  name: string;
  description: string;
  isSecret: boolean;
  required: boolean;
}

export interface MCPServerCredentials {
  serverId: string;
  credentials: Record<string, string>;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  scopes?: string[];
}

export interface MCPServerStatus {
  id: string;
  installed: boolean;
  running: boolean;
  connectionError?: string;
}

// Agent Interfaces
export interface MCPIdentificationAgentResponse {
  success: boolean;
  output?: string;
  error?: string;
  data?: {
    serverId: string;
    serverName: string;
    isInstalled: boolean;
    requiresInstallation: boolean;
  };
}

export interface CommandIntentAgentResponse {
  success: boolean;
  output?: string;
  error?: string;
  data?: {
    toolName: string;
    toolDescription: string;
    requiredParameters: string[];
  };
}

export interface ParameterExtractionAgentResponse {
  success: boolean;
  output?: string;
  error?: string;
  data?: {
    parameters: Record<string, any>;
  };
}

// Common Agent Request/Response types
export interface AgentRequest {
  userId: string;
  command: string;
  context?: Record<string, any>;
}

export interface AgentResponse {
  success: boolean;
  output?: string;
  error?: string;
  data?: Record<string, any>;
  rawResult?: any;
  processedResponse?: boolean;
}

// Tool Execution types
export interface ToolExecutionRequest {
  serverId: string;
  toolName: string;
  parameters: Record<string, any>;
}

export interface ToolExecutionResponse {
  success: boolean;
  content?: any;
  error?: string;
} 