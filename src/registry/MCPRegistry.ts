import { promises as fs } from 'fs';
import { join } from 'path';
import { MCPServerConfig, MCPServerCredentials, MCPServerStatus } from '../types/index.js';

export class MCPRegistry {
  private configPath: string;
  private credentialsPath: string;
  private configs: Map<string, MCPServerConfig> = new Map();
  private credentials: Map<string, MCPServerCredentials> = new Map();
  private serverStatus: Map<string, MCPServerStatus> = new Map();

  constructor(storagePath: string = './.mcp-registry') {
    this.configPath = join(storagePath, 'mcp-registry-entries.json');
    this.credentialsPath = join(storagePath, 'credentials.json');
  }

  /**
   * Initialize the registry by loading configs and credentials from storage
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing MCP Registry...');
      const storageDir = join(this.configPath, '..');
      await fs.mkdir(storageDir, { recursive: true });
      console.log('Storage directory created/verified:', storageDir);
      
      // Load configurations
      try {
        console.log('Loading configurations from:', this.configPath);
        const configData = await fs.readFile(this.configPath, 'utf-8');
        const configs = JSON.parse(configData) as MCPServerConfig[];
        console.log('Loaded configurations:', configs.length, 'servers');
        configs.forEach(config => this.configs.set(config.id, config));
      } catch (error) {
        // If file doesn't exist, start with empty configs
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error('Error loading configurations:', error);
          throw error;
        }
        console.log('No existing configurations found, starting with empty config');
      }

      // Load credentials (securely in a real implementation)
      try {
        console.log('Loading credentials from:', this.credentialsPath);
        const credData = await fs.readFile(this.credentialsPath, 'utf-8');
        const credentials = JSON.parse(credData) as MCPServerCredentials[];
        console.log('Loaded credentials for', credentials.length, 'servers');
        credentials.forEach(cred => this.credentials.set(cred.serverId, cred));
      } catch (error) {
        // If file doesn't exist, start with empty credentials
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error('Error loading credentials:', error);
          throw error;
        }
        console.log('No existing credentials found, starting with empty credentials');
      }

      // Initialize status for all servers
      console.log('Initializing server status...');
      this.configs.forEach((config, id) => {
        this.serverStatus.set(id, {
          id,
          installed: false, // We'll check this later
          running: false
        });
      });
      console.log('Server status initialized for', this.serverStatus.size, 'servers');
    } catch (error) {
      console.error('Failed to initialize MCP Registry:', error);
      throw new Error(`Failed to initialize MCP Registry: ${(error as Error).message}`);
    }
  }

  /**
   * Save registry state to disk
   */
  private async saveState(): Promise<void> {
    try {
      await fs.writeFile(
        this.configPath,
        JSON.stringify(Array.from(this.configs.values()), null, 2)
      );
      
      await fs.writeFile(
        this.credentialsPath,
        JSON.stringify(Array.from(this.credentials.values()), null, 2)
      );
    } catch (error) {
      console.error('Failed to save MCP Registry state:', error);
      throw new Error(`Failed to save MCP Registry state: ${(error as Error).message}`);
    }
  }

  /**
   * Register a new MCP server configuration
   */
  async registerServer(config: MCPServerConfig): Promise<void> {
    if (this.configs.has(config.id)) {
      throw new Error(`Server with ID ${config.id} already exists`);
    }
    
    this.configs.set(config.id, config);
    this.serverStatus.set(config.id, {
      id: config.id,
      installed: false,
      running: false
    });
    
    await this.saveState();
  }

  /**
   * Get server configuration by ID
   */
  getServerConfig(id: string): MCPServerConfig | undefined {
    return this.configs.get(id);
  }

  /**
   * Get all server configurations
   */
  getAllServerConfigs(): MCPServerConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Update server status
   */
  async updateServerStatus(id: string, status: Partial<MCPServerStatus>): Promise<void> {
    const currentStatus = this.serverStatus.get(id);
    if (!currentStatus) {
      throw new Error(`Server with ID ${id} not found`);
    }
    
    this.serverStatus.set(id, {
      ...currentStatus,
      ...status
    });
  }

  /**
   * Get status of a server
   */
  getServerStatus(id: string): MCPServerStatus | undefined {
    return this.serverStatus.get(id);
  }

  /**
   * Store credentials for a server
   */
  async storeCredentials(credentials: MCPServerCredentials): Promise<void> {
    this.credentials.set(credentials.serverId, credentials);
    await this.saveState();
  }

  /**
   * Get credentials for a server
   */
  getCredentials(serverId: string): MCPServerCredentials | undefined {
    return this.credentials.get(serverId);
  }

  /**
   * Find servers by capability
   */
  findServersByCapability(capability: string): MCPServerConfig[] {
    return Array.from(this.configs.values())
      .filter(config => config.capabilities?.includes(capability));
  }
} 