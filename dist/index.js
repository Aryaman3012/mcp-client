import readline from 'readline';
import { MCPRegistry } from './registry/MCPRegistry.js';
import { MCPClientManager } from './core/MCPClientManager.js';
import { MCPIdentificationAgent, CommandIntentAgent, ParameterExtractionAgent } from './agents/AIAgents.js';
async function main() {
    console.log('Initializing MCP Multi-Agent System with AI...');
    // Initialize the registry
    const registry = new MCPRegistry();
    await registry.initialize();
    // Register some example servers
    await registerExampleServers(registry);
    // Initialize the client manager
    const clientManager = new MCPClientManager(registry);
    // Create the AI-powered agents
    const serverSelectionAgent = new MCPIdentificationAgent(registry);
    const toolSelectionAgent = new CommandIntentAgent(registry);
    const parameterGenerationAgent = new ParameterExtractionAgent(registry);
    // Start the CLI
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    console.log('MCP Multi-Agent System initialized with AI. Type a command or "exit" to quit.');
    console.log('Available commands:');
    console.log('- "exit": Exit the application');
    console.log('- "list servers": List all registered MCP servers');
    console.log('- Any other command will be processed by the AI agent pipeline');
    // Simple user ID for the demo
    const userId = 'user1';
    // Start the CLI loop
    prompt();
    function prompt() {
        rl.question('> ', async (command) => {
            if (command.toLowerCase() === 'exit') {
                rl.close();
                process.exit(0);
            }
            else if (command.toLowerCase() === 'list servers') {
                // List registered servers
                const servers = registry.getAllServerConfigs();
                console.log('\nRegistered MCP Servers:');
                servers.forEach(server => {
                    const status = registry.getServerStatus(server.id);
                    console.log(`- ${server.name} (${server.id}):`);
                    console.log(`  Description: ${server.description || 'N/A'}`);
                    console.log(`  Installed: ${status?.installed ? 'Yes' : 'No'}`);
                    console.log(`  Running: ${status?.running ? 'Yes' : 'No'}`);
                    console.log(`  Command: ${server.command} ${server.args?.join(' ') || ''}`);
                    console.log(`  Capabilities: ${server.capabilities?.join(', ') || 'N/A'}`);
                    console.log(`  Requires Auth: ${server.requiresAuth ? 'Yes' : 'No'}`);
                    console.log('');
                });
                prompt();
            }
            else if (command.toLowerCase().startsWith('register ')) {
                // Parse and register a new server
                try {
                    const serverJson = command.substring('register '.length);
                    const config = JSON.parse(serverJson);
                    await registry.registerServer(config);
                    console.log(`Server ${config.name} registered successfully.`);
                }
                catch (error) {
                    console.error('Error registering server:', error);
                }
                prompt();
            }
            else {
                // Process the command through the AI agent pipeline
                console.log(`Processing command with AI: ${command}`);
                try {
                    // Step 1: Server Selection with AI
                    console.log('\n[1] AI Server Selection:');
                    const serverSelectionRequest = {
                        userId,
                        command
                    };
                    const serverSelectionResponse = await serverSelectionAgent.process(serverSelectionRequest);
                    if (!serverSelectionResponse.success) {
                        console.error('Server selection failed:', serverSelectionResponse.error);
                        prompt();
                        return;
                    }
                    console.log(`Selected server: ${serverSelectionResponse.data?.serverName}`);
                    // Check if server needs to be installed
                    if (serverSelectionResponse.data?.requiresInstallation) {
                        console.log(`Server ${serverSelectionResponse.data.serverName} needs to be installed first.`);
                        const installSuccess = await clientManager.installServer(serverSelectionResponse.data.serverId);
                        if (!installSuccess) {
                            console.error(`Failed to install server ${serverSelectionResponse.data.serverName}`);
                            prompt();
                            return;
                        }
                        console.log(`Server ${serverSelectionResponse.data.serverName} installed successfully.`);
                    }
                    // Step 2: Tool Selection with AI
                    console.log('\n[2] AI Tool Selection:');
                    const toolSelectionRequest = {
                        userId,
                        command,
                        context: {
                            serverDetails: serverSelectionResponse.data
                        }
                    };
                    const toolSelectionResponse = await toolSelectionAgent.process(toolSelectionRequest);
                    if (!toolSelectionResponse.success) {
                        console.error('Tool selection failed:', toolSelectionResponse.error);
                        prompt();
                        return;
                    }
                    console.log(`Selected tool: ${toolSelectionResponse.data?.toolName}`);
                    console.log(`Tool description: ${toolSelectionResponse.data?.toolDescription}`);
                    // Step 3: Parameter Generation with AI
                    console.log('\n[3] AI Parameter Generation:');
                    const parameterGenerationRequest = {
                        userId,
                        command,
                        context: {
                            serverDetails: serverSelectionResponse.data,
                            toolDetails: toolSelectionResponse.data
                        }
                    };
                    const parameterGenerationResponse = await parameterGenerationAgent.process(parameterGenerationRequest);
                    if (!parameterGenerationResponse.success) {
                        console.error('Parameter generation failed:', parameterGenerationResponse.error);
                        prompt();
                        return;
                    }
                    console.log('Generated parameters:', JSON.stringify(parameterGenerationResponse.data?.parameters, null, 2));
                    // Step 4: Execute the tool with the AI-generated parameters
                    console.log('\n[4] Tool Execution:');
                    try {
                        // Connect to the server if needed
                        await clientManager.connectToServer(serverSelectionResponse.data.serverId);
                        const result = await clientManager.executeTool(serverSelectionResponse.data.serverId, toolSelectionResponse.data.toolName, parameterGenerationResponse.data.parameters);
                        console.log('\nResult:');
                        console.log(formatToolResult(result));
                    }
                    catch (error) {
                        console.error('\nError executing tool:');
                        console.error(error.message);
                    }
                }
                catch (error) {
                    console.error('Error processing command:', error);
                }
                prompt();
            }
        });
    }
    // Helper function to format tool results
    function formatToolResult(result) {
        if (!result) {
            return 'No result';
        }
        // For text content, extract the text
        if (result.content && Array.isArray(result.content)) {
            const textItems = result.content
                .filter((item) => item.type === 'text')
                .map((item) => item.text);
            if (textItems.length > 0) {
                return textItems.join('\n');
            }
        }
        // Fallback to JSON stringification
        return JSON.stringify(result, null, 2);
    }
}
async function registerExampleServers(registry) {
    const servers = registry.getAllServerConfigs();
    // Only register example servers if the registry is empty
    if (servers.length === 0) {
        console.log('Registering example MCP servers...');
        // Slack MCP Server
        await registry.registerServer({
            id: 'slack-server',
            name: 'Slack MCP Server',
            description: 'Provides Slack messaging, channel management, and user interaction capabilities',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-slack'],
            installCommand: 'npm install -g @modelcontextprotocol/server-slack',
            requiresAuth: true,
            capabilities: ['slack', 'messaging', 'channels', 'chat', 'users', 'threads', 'reactions'],
            requiredCredentials: [
                {
                    name: "SLACK_BOT_TOKEN",
                    description: "Slack Bot Token (starts with xoxb-)",
                    isSecret: true,
                    required: true
                },
                {
                    name: "SLACK_TEAM_ID",
                    description: "Slack Team ID (starts with T)",
                    isSecret: false,
                    required: true
                }
            ]
        });
        // Google Drive MCP Server
        await registry.registerServer({
            id: 'gdrive-server',
            name: 'Google Drive MCP Server',
            description: 'Provides access to Google Drive files, documents, and spreadsheets',
            command: 'npx',
            args: ['-y', '@isaacphi/mcp-gdrive'],
            installCommand: 'npm install -g @isaacphi/mcp-gdrive',
            requiresAuth: true,
            capabilities: ['gdrive', 'files', 'documents', 'sheets', 'spreadsheets', 'folders', 'docs'],
            requiredCredentials: [
                {
                    name: "CLIENT_ID",
                    description: "Google OAuth Client ID",
                    isSecret: false,
                    required: true
                },
                {
                    name: "CLIENT_SECRET",
                    description: "Google OAuth Client Secret",
                    isSecret: true,
                    required: true
                },
                {
                    name: "GDRIVE_CREDS_DIR",
                    description: "Directory path to store Google Drive credentials",
                    isSecret: false,
                    required: true
                }
            ]
        });
        console.log('Example servers registered.');
    }
}
// Start the application
main().catch(error => {
    console.error('Application error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map