import { AzureOpenAI } from "openai";
// Common configuration for Azure OpenAI
const AZURE_CONFIG = {
    apiKey: "77cd722ffe2d450d80db32a2eead2a82",
    apiVersion: "2024-12-01-preview",
    endpoint: "https://dunlin-aplication-east-us-2.openai.azure.com/",
    deployment: "o1-mini"
};
// Factory function to create OpenAI client with consistent configuration
const createOpenAIClient = () => {
    return new AzureOpenAI({
        apiKey: AZURE_CONFIG.apiKey,
        apiVersion: AZURE_CONFIG.apiVersion,
        endpoint: AZURE_CONFIG.endpoint
    });
};
// Utility function to extract JSON from responses
const extractJson = (text) => {
    // If it's already valid JSON, return it
    try {
        JSON.parse(text);
        return text;
    }
    catch (e) {
        // Extract JSON from markdown code block
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            return jsonMatch[1].trim();
        }
        // Try to find a JSON object anywhere in the text
        const objectMatch = text.match(/(\{[\s\S]*\})/);
        if (objectMatch && objectMatch[1]) {
            return objectMatch[1].trim();
        }
        // Return empty object as fallback
        return '{}';
    }
};
/**
 * Agent 1: MCP Server Identification and Installation Agent
 */
export class MCPIdentificationAgent {
    client;
    mcpRegistry;
    constructor(mcpRegistry) {
        this.client = createOpenAIClient();
        this.mcpRegistry = mcpRegistry;
    }
    get registry() {
        return this.mcpRegistry;
    }
    async getMCPServerTools(mcpId) {
        const serverConfig = this.mcpRegistry.getServerConfig(mcpId);
        if (!serverConfig || !serverConfig.tools) {
            return null;
        }
        return serverConfig.tools;
    }
    validateMCPServerTool(mcpId, toolName) {
        const serverConfig = this.mcpRegistry.getServerConfig(mcpId);
        if (!serverConfig || !serverConfig.tools) {
            return false;
        }
        return toolName in serverConfig.tools;
    }
    async identifyAndPrepareServer(command) {
        // Use Azure OpenAI to identify MCP
        const allMCPs = this.mcpRegistry.getAllServerConfigs();
        const mcpDescriptions = allMCPs.map(mcp => `${mcp.id}: ${mcp.name} - ${mcp.description || "No description"}`).join('\n');
        const prompt = `Given this command: "${command}"
Available MCPs:
${mcpDescriptions}

Identify the most relevant MCP server. Respond in JSON:
Example format:
{
  "mcpId": "server_id",
  "mcpName": "display_name"
}
DO NOT WRITE ANYTHING ELSE. JUST RESPOND WITH THE JSON OBJECT.`;
        console.log(prompt);
        try {
            const response = await this.client.chat.completions.create({
                model: AZURE_CONFIG.deployment,
                messages: [{ role: "user", content: prompt }],
            });
            console.log(response.choices[0]?.message?.content);
            // Extract JSON from the response using the shared utility function
            const content = response.choices[0]?.message?.content || '{}';
            const jsonStr = extractJson(content);
            console.log("Extracted JSON:", jsonStr);
            const result = JSON.parse(jsonStr);
            return this.validateServer(result.mcpId === 'unknown' ? undefined : result.mcpId, result.mcpName === null ? undefined : result.mcpName);
        }
        catch (error) {
            console.error('Error identifying MCP server:', error);
            return this.validateServer(undefined, undefined);
        }
    }
    async validateServer(mcpId, mcpName) {
        const serverConfig = mcpId ? this.mcpRegistry.getServerConfig(mcpId) : undefined;
        const serverStatus = mcpId ? this.mcpRegistry.getServerStatus(mcpId) : undefined;
        return {
            mcpId,
            mcpName,
            isInstalled: serverStatus?.installed || false,
            requiresInstallation: !!serverConfig && !(serverStatus?.installed),
            requiredCredentials: serverConfig?.requiredCredentials || []
        };
    }
    async process(request) {
        try {
            const serverInfo = await this.identifyAndPrepareServer(request.command);
            if (serverInfo.mcpId) {
                return {
                    success: true,
                    output: `Selected server: ${serverInfo.mcpName || serverInfo.mcpId}`,
                    data: {
                        serverId: serverInfo.mcpId,
                        serverName: serverInfo.mcpName || serverInfo.mcpId,
                        isInstalled: serverInfo.isInstalled,
                        requiresInstallation: serverInfo.requiresInstallation
                    }
                };
            }
            return {
                success: false,
                error: 'Could not identify an appropriate MCP server for this command'
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Error identifying MCP server: ${error.message}`
            };
        }
    }
}
/**
 * Agent 2: Tool Identification Agent
 */
export class CommandIntentAgent {
    client;
    mcpRegistry;
    constructor(mcpRegistry) {
        this.client = createOpenAIClient();
        this.mcpRegistry = mcpRegistry;
    }
    async getMCPServerTools(mcpId) {
        const serverConfig = this.mcpRegistry.getServerConfig(mcpId);
        if (!serverConfig || !serverConfig.tools) {
            return null;
        }
        return serverConfig.tools;
    }
    validateMCPServerTool(mcpId, toolName) {
        const serverConfig = this.mcpRegistry.getServerConfig(mcpId);
        if (!serverConfig || !serverConfig.tools) {
            return false;
        }
        return toolName in serverConfig.tools;
    }
    async identifyTool(command, mcpId) {
        const tools = await this.getMCPServerTools(mcpId);
        if (!tools) {
            throw new Error(`No tools found for MCP server ${mcpId}`);
        }
        const toolDescriptions = Object.values(tools)
            .map(tool => ({
            name: tool.name,
            description: tool.description,
            required: tool.inputSchema?.required || [],
            parameters: Object.keys(tool.inputSchema?.properties || {})
        }));
        const prompt = `Given this command: "${command}"
Available tools for ${mcpId}:
${JSON.stringify(toolDescriptions, null, 2)}

Identify the most appropriate tool. Respond in JSON:
{
  "toolName": "tool_name",
  "reasoning": "Brief explanation"
}`;
        try {
            const response = await this.client.chat.completions.create({
                model: AZURE_CONFIG.deployment,
                messages: [{ role: "user", content: prompt }],
            });
            const content = response.choices[0]?.message?.content || '{}';
            const jsonStr = extractJson(content);
            console.log("Extracted JSON:", jsonStr);
            const result = JSON.parse(jsonStr);
            if (!this.validateMCPServerTool(mcpId, result.toolName)) {
                throw new Error(`Invalid tool identified: ${result.toolName}`);
            }
            const tool = tools[result.toolName];
            return {
                toolName: result.toolName,
                description: tool.description,
                requiredParameters: Array.isArray(tool.inputSchema?.required) ?
                    [...tool.inputSchema.required] : []
            };
        }
        catch (error) {
            console.error('Error identifying tool:', error);
            throw new Error('Failed to identify appropriate tool');
        }
    }
    async process(request) {
        try {
            if (!request.context?.serverDetails?.serverId) {
                return {
                    success: false,
                    error: 'No server ID provided in request context'
                };
            }
            const mcpId = request.context.serverDetails.serverId;
            const tool = await this.identifyTool(request.command, mcpId);
            return {
                success: true,
                output: `Selected tool: ${tool.toolName}`,
                data: {
                    toolName: tool.toolName,
                    toolDescription: tool.description,
                    requiredParameters: tool.requiredParameters
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Error identifying tool: ${error.message}`
            };
        }
    }
}
/**
 * Agent 3: Parameter Generation Agent
 */
export class ParameterExtractionAgent {
    client;
    mcpRegistry;
    constructor(mcpRegistry) {
        this.client = createOpenAIClient();
        this.mcpRegistry = mcpRegistry;
    }
    async generateParameters(command, mcpId, toolName) {
        const serverConfig = this.mcpRegistry.getServerConfig(mcpId);
        const tool = serverConfig?.tools?.[toolName];
        if (!tool) {
            throw new Error(`Tool ${toolName} not found for MCP server ${mcpId}`);
        }
        const prompt = `Given this command: "${command}"
Tool: ${toolName}
Description: ${tool.description}
Parameters:
${JSON.stringify(tool.inputSchema?.properties, null, 2)}
Required: ${JSON.stringify(tool.inputSchema?.required || [])}

Generate appropriate parameter values. Respond in JSON:
{
  "parameters": {
    "param1": "value1",
    ...
  },
  "reasoning": "Brief explanation"
}`;
        try {
            const response = await this.client.chat.completions.create({
                model: AZURE_CONFIG.deployment,
                messages: [{ role: "user", content: prompt }],
            });
            const content = response.choices[0]?.message?.content || '{}';
            const jsonStr = extractJson(content);
            console.log("Extracted JSON:", jsonStr);
            const result = JSON.parse(jsonStr);
            // Validate required parameters
            const missingRequired = (tool.inputSchema?.required || [])
                .filter((param) => !(param in (result.parameters || {})));
            return {
                parameters: result.parameters || {},
                missingRequired: missingRequired.length > 0 ? missingRequired : undefined
            };
        }
        catch (error) {
            console.error('Error generating parameters:', error);
            return { parameters: {} };
        }
    }
    async process(request) {
        try {
            if (!request.context?.serverDetails?.serverId) {
                return {
                    success: false,
                    error: 'No server ID provided in request context'
                };
            }
            if (!request.context?.toolDetails?.toolName) {
                return {
                    success: false,
                    error: 'No tool name provided in request context'
                };
            }
            const mcpId = request.context.serverDetails.serverId;
            const toolName = request.context.toolDetails.toolName;
            const result = await this.generateParameters(request.command, mcpId, toolName);
            if (result.missingRequired && result.missingRequired.length > 0) {
                return {
                    success: false,
                    error: `Missing required parameters: ${result.missingRequired.join(', ')}`
                };
            }
            return {
                success: true,
                output: `Generated parameters for tool ${toolName}`,
                data: {
                    parameters: result.parameters
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Error generating parameters: ${error.message}`
            };
        }
    }
}
//# sourceMappingURL=AIAgents.js.map