import { Server as SocketIOServer, Socket } from 'socket.io';
import { AgentPipeline } from '../core/AgentPipeline.js';
import { v4 as uuidv4 } from 'uuid';

// Store active tasks with their execution status
const activeTasks: Map<string, {
  userId: string,
  command: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  createdAt: number,
  progress: {
    stage: string,
    details?: string,
    timestamp?: number
  }[]
}> = new Map();

export function setupWebSocketHandlers(io: SocketIOServer, pipeline: AgentPipeline): void {
  // Namespace for command execution
  const commandsNamespace = io.of('/commands');
  
  // Handle connections
  commandsNamespace.on('connection', (socket: Socket) => {
    console.log('Client connected to command updates:', socket.id);
    
    // Send active tasks for this client when they connect
    socket.on('initialize', (userId: string) => {
      const userTasks = Array.from(activeTasks.entries())
        .filter(([_, task]) => task.userId === userId)
        .map(([taskId, task]) => ({ taskId, ...task }));
        
      socket.emit('taskList', userTasks);
    });
    
    // Handle new command execution
    socket.on('executeCommand', async (data: { userId: string, command: string }) => {
      const { userId, command } = data;
      const taskId = uuidv4();
      
      // Create a new task
      activeTasks.set(taskId, {
        userId,
        command,
        status: 'pending',
        createdAt: Date.now(),
        progress: [{ stage: 'Received command', details: command, timestamp: Date.now() }]
      });
      
      // Notify all clients about the new task
      commandsNamespace.emit('taskUpdate', { taskId, ...activeTasks.get(taskId) });
      
      // Begin execution
      try {
        // Update to running status
        activeTasks.get(taskId)!.status = 'running';
        activeTasks.get(taskId)!.progress.push({ stage: 'Starting execution', timestamp: Date.now() });
        commandsNamespace.emit('taskUpdate', { taskId, ...activeTasks.get(taskId) });
        
        // Register progress hooks for pipeline stages
        const progressHooks = {
          onServerSelection: (details: string) => {
            activeTasks.get(taskId)!.progress.push({ stage: 'Server Selection', details, timestamp: Date.now() });
            commandsNamespace.emit('taskUpdate', { taskId, ...activeTasks.get(taskId) });
          },
          onToolSelection: (details: string) => {
            activeTasks.get(taskId)!.progress.push({ stage: 'Tool Selection', details, timestamp: Date.now() });
            commandsNamespace.emit('taskUpdate', { taskId, ...activeTasks.get(taskId) });
          },
          onParameterGeneration: (details: string) => {
            activeTasks.get(taskId)!.progress.push({ stage: 'Parameter Generation', details, timestamp: Date.now() });
            commandsNamespace.emit('taskUpdate', { taskId, ...activeTasks.get(taskId) });
          },
          onToolExecution: (details: string) => {
            activeTasks.get(taskId)!.progress.push({ stage: 'Tool Execution', details, timestamp: Date.now() });
            commandsNamespace.emit('taskUpdate', { taskId, ...activeTasks.get(taskId) });
          },
          onResponseProcessing: (details: string) => {
            activeTasks.get(taskId)!.progress.push({ stage: 'Processing Response', details, timestamp: Date.now() });
            commandsNamespace.emit('taskUpdate', { taskId, ...activeTasks.get(taskId) });
          }
        };
        
        // Execute the command through the pipeline
        const result = await pipeline.processCommand(userId, command, progressHooks);
        
        // Update task status based on result
        if (result.success) {
          activeTasks.get(taskId)!.status = 'completed';
          activeTasks.get(taskId)!.progress.push({ 
            stage: 'Completed', 
            details: result.output || 'Command executed successfully',
            timestamp: Date.now()
          });
        } else {
          activeTasks.get(taskId)!.status = 'failed';
          activeTasks.get(taskId)!.progress.push({ 
            stage: 'Failed', 
            details: result.error || 'Command execution failed',
            timestamp: Date.now()
          });
        }
        
        // Notify clients about completion
        commandsNamespace.emit('taskUpdate', { taskId, ...activeTasks.get(taskId) });
        commandsNamespace.emit('taskResult', { 
          taskId, 
          success: result.success, 
          output: result.output,
          error: result.error,
          data: result.data
        });
        
      } catch (error) {
        // Handle unexpected errors
        activeTasks.get(taskId)!.status = 'failed';
        activeTasks.get(taskId)!.progress.push({ 
          stage: 'Error', 
          details: (error as Error).message,
          timestamp: Date.now()
        });
        
        commandsNamespace.emit('taskUpdate', { taskId, ...activeTasks.get(taskId) });
        commandsNamespace.emit('taskResult', { 
          taskId, 
          success: false, 
          error: (error as Error).message 
        });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected from command updates:', socket.id);
    });
  });
  
  // Namespace for credential requests
  const credentialsNamespace = io.of('/credentials');
  
  credentialsNamespace.on('connection', (socket: Socket) => {
    console.log('Client connected to credential updates:', socket.id);
    
    // Listen for credential requirement updates to notify frontend
    socket.on('subscribe', (serverId: string) => {
      socket.join(serverId);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected from credential updates:', socket.id);
    });
  });
}

// Function to be called from other modules to broadcast credential requirements
export function broadcastCredentialRequirement(
  io: SocketIOServer, 
  serverId: string, 
  requiredCredentials: any[]
): void {
  io.of('/credentials').to(serverId).emit('credentialsRequired', {
    serverId,
    requiredCredentials
  });
}

// Clean up old tasks (can be called periodically)
export function cleanupTasks(maxAgeInMinutes: number = 60): void {
  const cutoffTime = Date.now() - (maxAgeInMinutes * 60 * 1000);
  
  // Remove completed/failed tasks older than cutoff
  for (const [taskId, task] of activeTasks.entries()) {
    if (
      (task.status === 'completed' || task.status === 'failed') && 
      (task.createdAt < cutoffTime)
    ) {
      activeTasks.delete(taskId);
    }
  }
} 