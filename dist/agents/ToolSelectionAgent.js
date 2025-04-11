import { BaseAgent } from './Agent.js';
export class ToolSelectionAgent extends BaseAgent {
    clientManager;
    constructor(clientManager) {
        super('ToolSelectionAgent');
        this.clientManager = clientManager;
    }
    async process(request) {
        try {
            // Extract the server details from the context
            const { serverId } = request.context?.serverDetails || {};
            if (!serverId) {
                return this.createErrorResponse('No server ID provided in the request context');
            }
            // Get available tools from the server
            const tools = await this.clientManager.listTools(serverId);
            if (tools.length === 0) {
                return this.createErrorResponse(`No tools available on server ${serverId}`);
            }
            // Select the most appropriate tool for the command
            const selectedTool = await this.selectTool(request.command, tools);
            if (!selectedTool) {
                return this.createErrorResponse('Could not find a suitable tool for the command');
            }
            // Return success with the selected tool
            return this.createSuccessResponse(`Selected tool: ${selectedTool.name}`, {
                toolName: selectedTool.name,
                toolDescription: selectedTool.description,
                toolArgs: selectedTool.arguments
            });
        }
        catch (error) {
            return this.createErrorResponse(`Error selecting tool: ${error.message}`);
        }
    }
    /**
     * Select the most appropriate tool for the command
     */
    async selectTool(command, tools) {
        // This is a simple implementation - in a real system, you would use NLP or LLM
        // to better match the command to the appropriate tool
        const lowerCommand = command.toLowerCase();
        // Try to find an exact match by name or description
        for (const tool of tools) {
            if (lowerCommand.includes(tool.name.toLowerCase())) {
                return tool;
            }
            if (tool.description && lowerCommand.includes(tool.description.toLowerCase())) {
                return tool;
            }
        }
        // No exact match, use a simple scoring system
        const scoredTools = tools.map(tool => {
            let score = 0;
            // Score by name
            if (tool.name) {
                const nameParts = tool.name.toLowerCase().split(/[^a-z0-9]/);
                nameParts.forEach((part) => {
                    if (part.length > 2 && lowerCommand.includes(part)) {
                        score += 2;
                    }
                });
            }
            // Score by description
            if (tool.description) {
                const descriptionParts = tool.description.toLowerCase().split(/[^a-z0-9]/);
                descriptionParts.forEach((part) => {
                    if (part.length > 3 && lowerCommand.includes(part)) {
                        score += 1;
                    }
                });
            }
            return { tool, score };
        });
        // Sort by score (descending)
        scoredTools.sort((a, b) => b.score - a.score);
        // Return the highest scoring tool if it has a non-zero score
        return scoredTools[0]?.score > 0 ? scoredTools[0].tool : null;
    }
}
//# sourceMappingURL=ToolSelectionAgent.js.map