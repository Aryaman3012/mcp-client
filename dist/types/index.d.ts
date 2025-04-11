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
}
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
