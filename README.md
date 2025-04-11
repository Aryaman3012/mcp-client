# MCP Multi-Agent System

A TypeScript implementation of a multi-agent system for Model Context Protocol (MCP) servers. This system uses a pipeline of specialized agents to process user commands, identify and install required MCP servers, and execute appropriate tools.

## Features

- Registry for managing MCP server configurations
- Dynamic server installation and connection
- Multi-agent pipeline for command processing:
  - Server Selection Agent: Identifies and installs the required MCP server
  - Tool Selection Agent: Identifies the appropriate tool to use
  - Parameter Generation Agent: Extracts and validates parameters from the command
- Command-line interface for user interaction
- Support for real-world MCP servers including Slack and Google Drive

## Included MCP Servers

### Slack MCP Server

Provides Slack messaging and workspace management capabilities:

- List channels, post messages, and reply to threads
- Add emoji reactions to messages
- Get channel history and thread replies
- Manage users and profiles

### Google Drive MCP Server

Provides access to Google Drive files and Google Workspace:

- List files and folders
- Download and view file content
- Create and modify Google Sheets
- Search Drive content

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Usage

Start the application:

```bash
npm start
```

### Commands

- `exit`: Exit the application
- `list servers`: List all registered MCP servers
- `register {...}`: Register a new MCP server configuration (JSON format)
- Any other command will be processed by the agent pipeline

### Example User Workflows

#### Slack Example

1. Start the application
2. Issue a command like `list slack channels`
3. The system will:
   - Identify the required MCP server (Slack server)
   - Install it if necessary
   - Select the appropriate tool (slack_list_channels)
   - Generate the required parameters
   - Execute the tool and display the result

#### Google Drive Example

1. Start the application
2. Issue a command like `list my Google Drive files`
3. The system will:
   - Identify the required MCP server (Google Drive server)
   - Install it if necessary
   - Select the appropriate tool (gdrive_list_files)
   - Generate the required parameters
   - Execute the tool and display the result

### Registering a New Server

To register a new MCP server, use the `register` command with a JSON configuration:

```
register {
  "id": "my-server",
  "name": "My Custom MCP Server",
  "description": "Description of the server",
  "command": "node",
  "args": ["./path/to/server.js"],
  "installCommand": "npm install my-custom-mcp-server",
  "requiresAuth": false,
  "capabilities": ["capability1", "capability2"]
}
```

## Server Authentication

Some servers like Slack and Google Drive require authentication:

- **Slack**: Requires a Slack Bot Token (starts with `xoxb-`) and Team ID
- **Google Drive**: Requires Google OAuth authentication with the appropriate scopes

When using these servers, you'll be prompted to authenticate during the first connection.

## Development

### Project Structure

- `src/agents`: Specialized agents for the pipeline
- `src/core`: Core functionality including the client manager and pipeline
- `src/registry`: MCP server registry
- `src/types`: TypeScript type definitions
- `src/utils`: Utility functions
- `src/index.ts`: Main application entry point

### Building and Running

- `npm run build`: Build the TypeScript code
- `npm start`: Run the built application
- `npm run dev`: Build and run in one command

## License

This project is licensed under the ISC License.

## Resources

- [Model Context Protocol](https://modelcontextprotocol.github.io/)
- [Slack MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/slack)
- [Google Drive MCP Server](https://github.com/isaacphi/mcp-gdrive) 