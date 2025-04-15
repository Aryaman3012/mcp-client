import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import readline from 'readline';
export class MCPClientManager {
    registry;
    activeClients = new Map();
    constructor(registry) {
        this.registry = registry;
    }
    /**
     * Prompt the user for credentials
     */
    async promptForCredentials(requirements) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const credentials = {};
        const question = (prompt, isSecret) => {
            return new Promise((resolve) => {
                // For a real implementation, would use a library that can mask password input
                rl.question(prompt, (answer) => {
                    resolve(answer);
                });
            });
        };
        try {
            console.log('Please provide the required credentials for this MCP server:');
            for (const req of requirements) {
                const prompt = `${req.description}${req.required ? ' (required)' : ' (optional)'}: `;
                const value = await question(prompt, req.isSecret);
                if (req.required && !value) {
                    console.log('This credential is required. Please provide a value.');
                    // Ask again if required
                    const retryValue = await question(prompt, req.isSecret);
                    if (!retryValue) {
                        throw new Error(`Required credential ${req.name} was not provided.`);
                    }
                    credentials[req.name] = retryValue;
                }
                else if (value) {
                    credentials[req.name] = value;
                }
            }
            return credentials;
        }
        finally {
            rl.close();
        }
    }
    /**
     * Convert NodeJS.ProcessEnv to Record<string, string> by removing undefined values
     */
    sanitizeEnv(env) {
        const sanitized = {};
        for (const [key, value] of Object.entries(env)) {
            if (value !== undefined) {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    /**
     * Install an MCP server if not already installed
     */
    async installServer(serverId) {
        const config = this.registry.getServerConfig(serverId);
        if (!config) {
            throw new Error(`Server with ID ${serverId} not found`);
        }
        if (!config.installCommand) {
            throw new Error(`Server ${serverId} does not have an install command defined`);
        }
        const status = this.registry.getServerStatus(serverId);
        if (status?.installed) {
            console.log(`Server ${serverId} is already installed`);
            return true;
        }
        try {
            // If server requires authentication, check for existing credentials
            let serverCredentials = {};
            if (config.requiresAuth && config.requiredCredentials && config.requiredCredentials.length > 0) {
                const existingCredentials = this.registry.getCredentials(serverId);
                if (!existingCredentials?.credentials) {
                    // Instead of prompting, throw an error that will be caught by the API layer
                    throw {
                        credentialsRequired: true,
                        serverId,
                        requiredCredentials: config.requiredCredentials
                    };
                }
                serverCredentials = existingCredentials.credentials;
            }
            // Execute installation command
            return new Promise((resolve, reject) => {
                const [command, ...args] = config.installCommand.split(' ');
                // Create environment with credentials
                const processEnv = {
                    ...process.env,
                    ...serverCredentials
                };
                console.log(`Installing ${config.name}...`);
                const installProcess = spawn(command, args, {
                    stdio: 'inherit',
                    shell: true,
                    env: this.sanitizeEnv(processEnv)
                });
                installProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log(`Installation of ${config.name} completed successfully.`);
                        // Update server status
                        this.registry.updateServerStatus(serverId, { installed: true });
                        resolve(true);
                    }
                    else {
                        reject(new Error(`Installation of server ${serverId} failed with exit code ${code}`));
                    }
                });
                installProcess.on('error', (error) => {
                    reject(new Error(`Installation of server ${serverId} failed: ${error.message}`));
                });
            });
        }
        catch (error) {
            console.error(`Failed to install server ${serverId}:`, error);
            return false;
        }
    }
    /**
     * Start an MCP server and create a client connection
     */
    async connectToServer(serverId) {
        // Check if we already have an active client
        const existingClient = this.activeClients.get(serverId);
        if (existingClient) {
            // Check if the client is still healthy before returning it
            try {
                await this.checkServerHealth(serverId);
                return existingClient.client;
            }
            catch (error) {
                console.log(`Existing client for ${serverId} is unhealthy, reconnecting...`);
                // Continue to create a new connection if health check fails
            }
        }
        // Get server configuration
        const config = this.registry.getServerConfig(serverId);
        if (!config) {
            throw new Error(`Server with ID ${serverId} not found`);
        }
        // Check if the server is installed
        const status = this.registry.getServerStatus(serverId);
        if (!status?.installed) {
            throw new Error(`Server ${serverId} is not installed`);
        }
        try {
            // Get server credentials if needed
            let processEnv = { ...process.env };
            if (config.requiresAuth) {
                const serverCredentials = this.registry.getCredentials(serverId);
                if (serverCredentials?.credentials) {
                    processEnv = {
                        ...processEnv,
                        ...serverCredentials.credentials
                    };
                }
                else {
                    // Instead of just warning, throw an error that will be caught by the API layer
                    throw {
                        credentialsRequired: true,
                        serverId,
                        requiredCredentials: config.requiredCredentials
                    };
                }
            }
            console.log(`Starting ${config.name}...`);
            // Create transport with environment variables - sanitize environment for StdioClientTransport
            const transport = new StdioClientTransport({
                command: config.command,
                args: config.args || [],
                env: this.sanitizeEnv(processEnv)
            });
            // Create client
            const client = new Client({
                name: "mcp-client",
                version: "1.0.0"
            });
            try {
                // Connect to the server
                console.log(`Connecting to ${config.name}...`);
                await client.connect(transport);
                console.log(`Successfully connected to ${config.name}`);
                // Try to access the child process from the transport
                let childProcess = null;
                try {
                    // In the actual SDK, this may be accessed differently
                    childProcess = transport.childProcess;
                }
                catch (error) {
                    console.warn(`Unable to access child process for ${serverId}: ${error.message}`);
                    // Continue even if we can't access the child process
                }
                // Store the client, process and transport
                this.activeClients.set(serverId, {
                    client,
                    process: childProcess,
                    transport
                });
                // Update server status
                await this.registry.updateServerStatus(serverId, { running: true });
                return client;
            }
            catch (error) {
                console.error(`Connection error for ${config.name}: ${error.message}`);
                throw new Error(`Failed to connect to ${config.name}: ${error.message}`);
            }
        }
        catch (error) {
            console.error(`Failed to connect to server ${serverId}:`, error);
            await this.registry.updateServerStatus(serverId, {
                running: false,
                connectionError: error.message
            });
            throw error;
        }
    }
    /**
     * Disconnect from an MCP server
     */
    async disconnectFromServer(serverId) {
        const clientData = this.activeClients.get(serverId);
        if (!clientData) {
            return; // Already disconnected
        }
        try {
            // Close the transport (actual method may vary based on SDK version)
            // Using any type here since the SDK interface might not expose this method directly
            try {
                await clientData.transport.disconnect?.();
            }
            catch (error) {
                console.warn(`Error disconnecting transport: ${error.message}`);
            }
            // Terminate the process if exists and still running
            if (clientData.process) {
                try {
                    // Check if process is still running before attempting to kill it
                    if (clientData.process.exitCode === null) {
                        clientData.process.kill();
                        console.log(`Process for server ${serverId} terminated`);
                    }
                }
                catch (error) {
                    console.warn(`Error terminating process: ${error.message}`);
                }
            }
            // Remove from active clients
            this.activeClients.delete(serverId);
            // Update server status
            await this.registry.updateServerStatus(serverId, { running: false });
            console.log(`Disconnected from server ${serverId}`);
        }
        catch (error) {
            console.error(`Error disconnecting from server ${serverId}:`, error);
            throw error;
        }
    }
    /**
     * Get an active client for a server, starting it if necessary
     */
    async getClient(serverId) {
        return this.connectToServer(serverId);
    }
    /**
     * Check if a server is running and healthy
     */
    async checkServerHealth(serverId) {
        const clientData = this.activeClients.get(serverId);
        if (!clientData) {
            console.log(`Server ${serverId} is not connected`);
            return false; // Not connected
        }
        // Check if process exists and is still running
        if (clientData.process) {
            try {
                if (clientData.process.exitCode !== null) {
                    console.log(`Process for server ${serverId} has exited with code ${clientData.process.exitCode}`);
                    await this.registry.updateServerStatus(serverId, {
                        running: false,
                        connectionError: `Process exited with code ${clientData.process.exitCode}`
                    });
                    this.activeClients.delete(serverId);
                    return false;
                }
            }
            catch (error) {
                console.warn(`Error checking process status: ${error.message}`);
                // Continue even if we can't check the process status
            }
        }
        try {
            // Try to make a simple request to verify the connection
            // Note: getInfo might not be available in all SDK versions
            // Using any type as a workaround
            const info = await clientData.client.getInfo?.();
            console.log(`Server ${serverId} health check passed`);
            return true;
        }
        catch (error) {
            console.error(`Health check failed for server ${serverId}:`, error);
            await this.registry.updateServerStatus(serverId, {
                running: false,
                connectionError: error.message
            });
            // Try to clean up the failed connection
            await this.disconnectFromServer(serverId);
            return false;
        }
    }
    /**
     * Execute a tool on an MCP server
     */
    async executeTool(serverId, toolName, parameters) {
        console.log(`Executing tool ${toolName} on server ${serverId} with parameters:`, parameters);
        // Verify server connection before tool execution
        const isConnected = await this.checkServerHealth(serverId);
        if (!isConnected) {
            console.log(`Attempting to reconnect to server ${serverId}...`);
            // Try to reconnect
            await this.connectToServer(serverId);
        }
        const client = await this.getClient(serverId);
        try {
            console.log(`Calling tool ${toolName}...`);
            const result = await client.callTool({
                name: toolName,
                arguments: parameters
            });
            // Validate and process the result
            if (!result) {
                throw new Error(`Tool ${toolName} returned no result`);
            }
            // Log the raw result for debugging
            console.log(`Raw result from ${toolName}:`, JSON.stringify(result, null, 2));
            // Check if result has an error property
            if (result.error) {
                throw new Error(`Tool ${toolName} failed: ${result.error}`);
            }
            // Check if result has a data/result property
            const toolResult = result.data || result.result || result;
            console.log(`Tool ${toolName} executed successfully with result:`, JSON.stringify(toolResult, null, 2));
            return toolResult;
        }
        catch (error) {
            console.error(`Error executing tool ${toolName} on server ${serverId}:`, error);
            // Check server health on error
            await this.checkServerHealth(serverId);
            // Rethrow with more context
            throw new Error(`Failed to execute tool ${toolName}: ${error.message}`);
        }
    }
    /**
     * List available tools on an MCP server
     */
    async listTools(serverId) {
        console.log(`Listing tools for server ${serverId}...`);
        const client = await this.getClient(serverId);
        try {
            const toolsResponse = await client.listTools();
            // Ensure we return an array, even if the SDK returns a different structure
            const tools = Array.isArray(toolsResponse) ? toolsResponse : [];
            console.log(`Found ${tools.length} tools on server ${serverId}`);
            return tools;
        }
        catch (error) {
            console.error(`Error listing tools on server ${serverId}:`, error);
            // Check server health on error
            await this.checkServerHealth(serverId);
            throw error;
        }
    }
    /**
     * Get the server configuration
     */
    getServerConfig(serverId) {
        return this.registry.getServerConfig(serverId);
    }
    /**
     * Get the server status
     */
    getServerStatus(serverId) {
        return this.registry.getServerStatus(serverId);
    }
    /**
     * Check if credentials exist for the server
     */
    hasCredentials(serverId) {
        return !!this.registry.getCredentials(serverId);
    }
}
//# sourceMappingURL=MCPClientManager.js.map