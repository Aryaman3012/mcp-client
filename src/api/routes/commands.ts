import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { broadcastCredentialRequirement } from '../websocket.js';

const router = express.Router();

/**
 * Execute a command
 * POST /api/commands
 * 
 * Body:
 * {
 *   "userId": "string",
 *   "command": "string"
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, command } = req.body;
    
    if (!userId || !command) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId and command are required'
      });
    }
    
    // For REST API clients that don't use WebSockets, we process the command immediately
    // WebSocket clients should use the socket.emit('executeCommand') instead for real-time updates
    const { pipeline, io } = res.locals;
    
    // Generate a task ID for tracking
    const taskId = uuidv4();
    
    // Execute the command asynchronously and return immediately with the task ID
    res.status(202).json({
      success: true,
      message: 'Command accepted for processing',
      taskId
    });
    
    // Process the command
    pipeline.processCommand(userId, command)
      .then((result) => {
        if (!result.success && result.data?.credentialsRequired) {
          // If credentials are required, broadcast to notify any WebSocket clients
          broadcastCredentialRequirement(
            io, 
            result.data.serverId, 
            result.data.requiredCredentials
          );
        }
      })
      .catch((error) => {
        console.error('Command execution error:', error);
      });
    
  } catch (error) {
    console.error('Error processing command:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while processing command'
    });
  }
});

/**
 * Get the status of a command
 * GET /api/commands/:taskId
 */
router.get('/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  // In a real implementation, you would check the status in your task storage
  // For now, we'll return a simple response
  res.json({
    success: true,
    message: 'Task status not available via REST API. Use WebSocket for real-time updates.'
  });
});

export default router; 