# Use Node.js 18 as base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    python3-full \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Set up Python virtual environment
ENV VIRTUAL_ENV=/app/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python packages in virtual environment
RUN pip3 install --no-cache-dir uv

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy source code
COPY . .

# Create .mcp-registry directory and ensure proper permissions
RUN mkdir -p .mcp-registry && \
    chmod 755 .mcp-registry

# Build TypeScript code
RUN npm run build

# Expose API port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV API_PORT=3000

# Start the application in API mode
CMD ["node", "dist/index.js", "--api"] 