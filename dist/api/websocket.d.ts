import { Server as SocketIOServer } from 'socket.io';
import { AgentPipeline } from '../core/AgentPipeline.js';
import { MCPRegistry } from '../registry/MCPRegistry.js';
export declare function setupWebSocketHandlers(io: SocketIOServer, pipeline: AgentPipeline, registry: MCPRegistry): void;
export declare function broadcastCredentialRequirement(io: SocketIOServer, serverId: string, requiredCredentials: any[]): void;
export declare function cleanupTasks(maxAgeInMinutes?: number): void;
