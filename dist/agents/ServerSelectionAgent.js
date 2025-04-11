import { BaseAgent } from './Agent.js';
export class ServerSelectionAgent extends BaseAgent {
    registry;
    clientManager;
    // Enhanced mapping of keywords to capabilities with Slack and Google Drive support
    keywordToCapability = {
        // Slack capabilities
        'slack': ['slack', 'messaging', 'channels', 'chat'],
        'channel': ['slack', 'messaging', 'channels'],
        'message': ['slack', 'messaging', 'chat'],
        'post': ['slack', 'messaging', 'chat'],
        'reaction': ['slack', 'emoji', 'reactions'],
        'thread': ['slack', 'messaging', 'threads'],
        'user': ['slack', 'users', 'profiles'],
        // Google Drive capabilities
        'drive': ['gdrive', 'files', 'documents', 'sheets'],
        'document': ['gdrive', 'docs', 'documents'],
        'spreadsheet': ['gdrive', 'sheets', 'spreadsheets'],
        'file': ['gdrive', 'files', 'documents'],
        'folder': ['gdrive', 'files', 'folders'],
        'sheet': ['gdrive', 'sheets', 'spreadsheets'],
        'google': ['gdrive', 'files', 'documents', 'sheets'],
        // Generic capabilities (kept for backward compatibility)
        'weather': ['weather', 'forecast'],
        'database': ['database', 'sql'],
        'search': ['search', 'web'],
        'email': ['email', 'messaging']
    };
    constructor(registry, clientManager) {
        super('ServerSelectionAgent');
        this.registry = registry;
        this.clientManager = clientManager;
    }
    async process(request) {
        try {
            // Extract potential capabilities from the command
            const capabilities = this.extractCapabilities(request.command);
            if (capabilities.length === 0) {
                return this.createErrorResponse('Could not determine the required capabilities from the command');
            }
            // Find servers that match the required capabilities
            const matchingServers = capabilities.flatMap(capability => this.registry.findServersByCapability(capability));
            if (matchingServers.length === 0) {
                return this.createErrorResponse('No suitable MCP servers found for the requested capabilities');
            }
            // Select the best server (simple implementation - first match)
            // In a real implementation, you'd want a more sophisticated selection algorithm
            const selectedServer = matchingServers[0];
            // Check if the server is installed, install if needed
            const status = this.registry.getServerStatus(selectedServer.id);
            if (!status?.installed) {
                const installSuccess = await this.clientManager.installServer(selectedServer.id);
                if (!installSuccess) {
                    return this.createErrorResponse(`Failed to install server ${selectedServer.name}`);
                }
            }
            // Connect to the server to ensure it's running
            await this.clientManager.connectToServer(selectedServer.id);
            // Check server health
            const isHealthy = await this.clientManager.checkServerHealth(selectedServer.id);
            if (!isHealthy) {
                return this.createErrorResponse(`Server ${selectedServer.name} is not healthy`);
            }
            // Return success with the selected server
            return this.createSuccessResponse(`Selected server: ${selectedServer.name}`, {
                serverId: selectedServer.id,
                serverName: selectedServer.name,
                capabilities: selectedServer.capabilities
            });
        }
        catch (error) {
            return this.createErrorResponse(`Error selecting server: ${error.message}`);
        }
    }
    /**
     * Extract potential capabilities from the command
     */
    extractCapabilities(command) {
        const lowerCommand = command.toLowerCase();
        const capabilities = new Set();
        // Check for keywords in the command
        Object.entries(this.keywordToCapability).forEach(([keyword, associatedCapabilities]) => {
            if (lowerCommand.includes(keyword)) {
                associatedCapabilities.forEach(cap => capabilities.add(cap));
            }
        });
        return Array.from(capabilities);
    }
}
//# sourceMappingURL=ServerSelectionAgent.js.map