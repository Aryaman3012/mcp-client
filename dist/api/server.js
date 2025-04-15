import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { MCPClientManager } from '../core/MCPClientManager.js';
import { MCPIdentificationAgent, CommandIntentAgent, ParameterExtractionAgent, ResponseProcessingAgent } from '../agents/AIAgents.js';
import { AgentPipeline } from '../core/AgentPipeline.js';
import commandRoutes from './routes/commands.js';
import serverRoutes from './routes/servers.js';
import credentialRoutes from './routes/credentials.js';
import { setupWebSocketHandlers } from './websocket.js';
export class APIServer {
    app;
    server;
    io;
    registry;
    clientManager;
    pipeline;
    port;
    constructor(registry, port = 3000) {
        this.registry = registry;
        this.port = port;
        this.app = express();
        this.clientManager = new MCPClientManager(registry);
        // Initialize the agent pipeline
        const serverSelectionAgent = new MCPIdentificationAgent(registry);
        const toolSelectionAgent = new CommandIntentAgent(registry);
        const parameterGenerationAgent = new ParameterExtractionAgent(registry);
        const responseProcessingAgent = new ResponseProcessingAgent(registry);
        this.pipeline = new AgentPipeline(serverSelectionAgent, toolSelectionAgent, parameterGenerationAgent, responseProcessingAgent, this.clientManager);
        // Create HTTP server for both Express and Socket.IO
        this.server = http.createServer(this.app);
        // Initialize Socket.IO with CORS
        this.io = new SocketIOServer(this.server, {
            cors: {
                origin: process.env.CORS_ORIGIN || '*',
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                credentials: true
            }
        });
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        // Setup WebSocket handlers
        setupWebSocketHandlers(this.io, this.pipeline, this.registry);
    }
    setupMiddleware() {
        // Configure CORS middleware
        this.app.use(cors({
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
            maxAge: 86400 // Cache preflight requests for 24 hours
        }));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        // Request logging middleware
        this.app.use((req, res, next) => {
            console.log(`${req.method} ${req.url}`);
            next();
        });
    }
    setupRoutes() {
        // Make registry and clientManager available to routes
        this.app.use((req, res, next) => {
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
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', version: '1.0.0' });
        });
        // Catch-all route for undefined endpoints
        this.app.use('*', (req, res) => {
            res.status(404).json({ error: 'Not Found' });
        });
    }
    setupErrorHandling() {
        this.app.use((err, req, res, next) => {
            console.error('API Error:', err);
            res.status(500).json({
                error: 'Internal Server Error',
                message: err.message
            });
        });
    }
    start() {
        this.server.listen(this.port, () => {
            console.log(`API Server running on port ${this.port}`);
        });
    }
    stop() {
        this.server.close();
    }
}
//# sourceMappingURL=server.js.map