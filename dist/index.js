import readline from 'readline';
import { MCPRegistry } from './registry/MCPRegistry.js';
import { MCPClientManager } from './core/MCPClientManager.js';
import { MCPIdentificationAgent, CommandIntentAgent, ParameterExtractionAgent, ResponseProcessingAgent } from './agents/AIAgents.js';
import { APIServer } from './api/server.js';
import { AgentPipeline } from './core/AgentPipeline.js';
async function main() {
    console.log('Initializing MCP Multi-Agent System with AI...');
    // Initialize the registry
    const registry = new MCPRegistry();
    await registry.initialize();
    // Initialize the client manager
    const clientManager = new MCPClientManager(registry);
    // Create the AI-powered agents
    const serverSelectionAgent = new MCPIdentificationAgent(registry);
    const toolSelectionAgent = new CommandIntentAgent(registry);
    const parameterGenerationAgent = new ParameterExtractionAgent(registry);
    const responseProcessingAgent = new ResponseProcessingAgent(registry);
    // Check if API mode is enabled
    const useApi = process.argv.includes('--api');
    const apiPort = parseInt(process.env.API_PORT || '3000');
    if (useApi) {
        // Start the API server
        const apiServer = new APIServer(registry, apiPort);
        apiServer.start();
        console.log(`API Server started on port ${apiPort}`);
        console.log('API Mode: Press Ctrl+C to exit');
        // Handle process termination
        process.on('SIGINT', () => {
            console.log('Shutting down API server...');
            apiServer.stop();
            process.exit(0);
        });
    }
    else {
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
                        const pipeline = new AgentPipeline(serverSelectionAgent, toolSelectionAgent, parameterGenerationAgent, responseProcessingAgent, clientManager);
                        const result = await pipeline.processCommand(userId, command, {
                            onServerSelection: (details) => console.log('\n[1] AI Server Selection:', details),
                            onToolSelection: (details) => console.log('\n[2] AI Tool Selection:', details),
                            onParameterGeneration: (details) => console.log('\n[3] AI Parameter Generation:', details),
                            onToolExecution: (details) => console.log('\n[4] Tool Execution:', details),
                            onResponseProcessing: (details) => console.log('\n[5] Response Processing:', details)
                        });
                        if (!result.success) {
                            console.error('\nError:', result.error);
                            prompt();
                            return;
                        }
                        console.log('\nResult:');
                        console.log(result.output);
                        if (process.env.DEBUG) {
                            console.log('\nRaw Result:', JSON.stringify(result.rawResult, null, 2));
                        }
                    }
                    catch (error) {
                        console.error('Error processing command:', error);
                    }
                    prompt();
                }
            });
        }
    }
}
// Start the application
main().catch(error => {
    console.error('Application error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map