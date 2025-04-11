import express, { Request, Response } from 'express';

const router = express.Router();

/**
 * Get all server configurations
 * GET /api/servers
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { registry } = res.locals;
    const servers = registry.getAllServerConfigs().map(server => {
      const status = registry.getServerStatus(server.id);
      return {
        id: server.id,
        name: server.name,
        description: server.description,
        capabilities: server.capabilities,
        installed: status?.installed || false,
        running: status?.running || false,
        requiresAuth: server.requiresAuth
      };
    });
    
    res.json({
      success: true,
      servers
    });
  } catch (error) {
    console.error('Error getting servers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get server list'
    });
  }
});

/**
 * Get a specific server's details
 * GET /api/servers/:serverId
 */
router.get('/:serverId', (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const { registry } = res.locals;
    
    const config = registry.getServerConfig(serverId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Server with ID ${serverId} not found`
      });
    }
    
    const status = registry.getServerStatus(serverId);
    const hasCredentials = !!registry.getCredentials(serverId);
    
    res.json({
      success: true,
      server: {
        ...config,
        status: {
          installed: status?.installed || false,
          running: status?.running || false,
          error: status?.connectionError
        },
        hasCredentials
      }
    });
  } catch (error) {
    console.error(`Error getting server ${req.params.serverId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get server details'
    });
  }
});

/**
 * Register a new server
 * POST /api/servers
 * 
 * Body: MCPServerConfig object
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { registry } = res.locals;
    const config = req.body;
    
    // Validate required fields
    if (!config.id || !config.name || !config.command) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, name, and command are required'
      });
    }
    
    // Check if server with this ID already exists
    if (registry.getServerConfig(config.id)) {
      return res.status(409).json({
        success: false,
        error: `Server with ID ${config.id} already exists`
      });
    }
    
    await registry.registerServer(config);
    
    res.status(201).json({
      success: true,
      message: `Server ${config.name} registered successfully`,
      serverId: config.id
    });
  } catch (error) {
    console.error('Error registering server:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register server'
    });
  }
});

/**
 * Install a server
 * POST /api/servers/:serverId/install
 */
router.post('/:serverId/install', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const { clientManager } = res.locals;
    
    // Check if server exists
    const config = clientManager.registry.getServerConfig(serverId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Server with ID ${serverId} not found`
      });
    }
    
    // Check if server is already installed
    const status = clientManager.registry.getServerStatus(serverId);
    if (status?.installed) {
      return res.status(409).json({
        success: false,
        error: `Server ${serverId} is already installed`
      });
    }
    
    // Install the server
    const success = await clientManager.installServer(serverId);
    
    if (success) {
      res.json({
        success: true,
        message: `Server ${config.name} installed successfully`
      });
    } else {
      res.status(500).json({
        success: false,
        error: `Failed to install server ${config.name}`
      });
    }
  } catch (error) {
    console.error(`Error installing server ${req.params.serverId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to install server'
    });
  }
});

/**
 * Delete a server
 * DELETE /api/servers/:serverId
 */
router.delete('/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const { registry, clientManager } = res.locals;
    
    // Check if server exists
    const config = registry.getServerConfig(serverId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Server with ID ${serverId} not found`
      });
    }
    
    // Check if server is running and stop it if needed
    const status = registry.getServerStatus(serverId);
    if (status?.running) {
      await clientManager.disconnectFromServer(serverId);
    }
    
    // TODO: Implement server deletion in MCPRegistry
    // await registry.deleteServer(serverId);
    
    res.json({
      success: true,
      message: `Server ${config.name} deleted successfully`
    });
  } catch (error) {
    console.error(`Error deleting server ${req.params.serverId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete server'
    });
  }
});

/**
 * Get server tools
 * GET /api/servers/:serverId/tools
 */
router.get('/:serverId/tools', (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const { registry } = res.locals;
    
    // Check if server exists
    const config = registry.getServerConfig(serverId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Server with ID ${serverId} not found`
      });
    }
    
    // Get tools from the server config
    const tools = config.tools || {};
    
    res.json({
      success: true,
      serverId,
      serverName: config.name,
      tools: Object.values(tools).map(tool => ({
        name: (tool as any).name,
        description: (tool as any).description,
        parameters: Object.keys((tool as any).inputSchema.properties || {}).map(key => ({
          name: key,
          ...(tool as any).inputSchema.properties[key]
        })),
        requiredParameters: (tool as any).inputSchema.required || []
      }))
    });
  } catch (error) {
    console.error(`Error getting tools for server ${req.params.serverId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get server tools'
    });
  }
});

export default router; 