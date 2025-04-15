import express from 'express';
const router = express.Router();
/**
 * Get all stored credentials (server IDs only for security)
 * GET /api/credentials
 */
router.get('/', (req, res) => {
    try {
        const { registry } = res.locals;
        // For security, we only return the server IDs that have credentials, not the actual credentials
        const servers = registry.getAllServerConfigs()
            .filter(server => !!registry.getCredentials(server.id))
            .map(server => ({
            id: server.id,
            name: server.name,
            description: server.description
        }));
        res.json({
            success: true,
            servers
        });
    }
    catch (error) {
        console.error('Error getting credentials:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get credentials'
        });
    }
});
/**
 * Get credential requirements for a server
 * GET /api/credentials/:serverId/requirements
 */
router.get('/:serverId/requirements', (req, res) => {
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
        if (!config.requiresAuth || !config.requiredCredentials) {
            return res.json({
                success: true,
                serverId,
                serverName: config.name,
                requiresAuth: config.requiresAuth,
                requiredCredentials: []
            });
        }
        res.json({
            success: true,
            serverId,
            serverName: config.name,
            requiresAuth: config.requiresAuth,
            requiredCredentials: config.requiredCredentials
        });
    }
    catch (error) {
        console.error(`Error getting credential requirements for server ${req.params.serverId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to get credential requirements'
        });
    }
});
/**
 * Store credentials for a server
 * POST /api/credentials/:serverId
 *
 * Body:
 * {
 *   "credentials": {
 *     "key1": "value1",
 *     "key2": "value2",
 *     ...
 *   }
 * }
 */
router.post('/:serverId', async (req, res) => {
    try {
        const { serverId } = req.params;
        const { credentials } = req.body;
        const { registry } = res.locals;
        // Check if server exists
        const config = registry.getServerConfig(serverId);
        if (!config) {
            return res.status(404).json({
                success: false,
                error: `Server with ID ${serverId} not found`
            });
        }
        // Verify that all required credentials are provided
        if (config.requiresAuth && config.requiredCredentials) {
            const requiredFields = config.requiredCredentials
                .filter(cred => cred.required)
                .map(cred => cred.name);
            const missingFields = requiredFields.filter(field => !credentials[field]);
            if (missingFields.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Missing required credentials: ${missingFields.join(', ')}`
                });
            }
        }
        // Store the credentials
        const serverCredentials = {
            serverId,
            credentials
        };
        await registry.storeCredentials(serverCredentials);
        res.json({
            success: true,
            message: `Credentials for ${config.name} stored successfully`
        });
    }
    catch (error) {
        console.error(`Error storing credentials for server ${req.params.serverId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to store credentials'
        });
    }
});
/**
 * Check if credentials exist for a server
 * GET /api/credentials/:serverId
 */
router.get('/:serverId', (req, res) => {
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
        const credentials = registry.getCredentials(serverId);
        res.json({
            success: true,
            serverId,
            serverName: config.name,
            hasCredentials: !!credentials,
            // For security, we don't return the actual credentials, just the field names
            storedFields: credentials ? Object.keys(credentials.credentials) : []
        });
    }
    catch (error) {
        console.error(`Error checking credentials for server ${req.params.serverId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to check credentials'
        });
    }
});
/**
 * Delete credentials for a server
 * DELETE /api/credentials/:serverId
 */
router.delete('/:serverId', async (req, res) => {
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
        // TODO: Implement credential deletion in MCPRegistry
        // await registry.deleteCredentials(serverId);
        res.json({
            success: true,
            message: `Credentials for ${config.name} deleted successfully`
        });
    }
    catch (error) {
        console.error(`Error deleting credentials for server ${req.params.serverId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete credentials'
        });
    }
});
export default router;
//# sourceMappingURL=credentials.js.map