import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { MCPRegistry } from '../registry/MCPRegistry.js';
import { MCPClientManager } from '../core/MCPClientManager.js';
import { MCPIdentificationAgent, CommandIntentAgent, ParameterExtractionAgent, ResponseProcessingAgent } from '../agents/AIAgents.js';
import { AgentPipeline } from '../core/AgentPipeline.js';
import commandRoutes from './routes/commands.js';
import serverRoutes from './routes/servers.js';
import credentialRoutes from './routes/credentials.js';
import { setupWebSocketHandlers } from './websocket.js';

export class APIServer {
  private app: express.Application;
  private server: http.Server;
  private io: SocketIOServer;
  private registry: MCPRegistry;
  private clientManager: MCPClientManager;
  private pipeline: AgentPipeline;
  private port: number;

  constructor(registry: MCPRegistry, port: number = 3000) {
    this.registry = registry;
    this.port = port;
    this.app = express();
    this.clientManager = new MCPClientManager(registry);
    
    // Initialize the agent pipeline
    const serverSelectionAgent = new MCPIdentificationAgent(registry);
    const toolSelectionAgent = new CommandIntentAgent(registry);
    const parameterGenerationAgent = new ParameterExtractionAgent(registry);
    const responseProcessingAgent = new ResponseProcessingAgent(registry);
    this.pipeline = new AgentPipeline(
      serverSelectionAgent,
      toolSelectionAgent,
      parameterGenerationAgent,
      responseProcessingAgent,
      this.clientManager
    );
    
    // Create HTTP server for both Express and Socket.IO
    this.server = http.createServer(this.app);
    
    // Initialize Socket.IO
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    
    // Setup WebSocket handlers
    setupWebSocketHandlers(this.io, this.pipeline);
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${req.method} ${req.url}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Make registry and clientManager available to routes
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.locals.registry = this.registry;
      res.locals.clientManager = this.clientManager;
      res.locals.pipeline = this.pipeline;
      res.locals.io = this.io;
      next();
    });

    // API routes
    this.app.use('/api/commands', commandRoutes);
    this.app.use('/api/servers', serverRoutes);
    this.app.use('/api/credentials', credentialRoutes);
    
    // Base route for API health check
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', version: '1.0.0' });
    });
    
    // Catch-all route for undefined endpoints
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({ error: 'Not Found' });
    });
  }

  private setupErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('API Error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
      });
    });
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`API Server running on port ${this.port}`);
    });
  }

  public stop(): void {
    this.server.close();
  }
} 