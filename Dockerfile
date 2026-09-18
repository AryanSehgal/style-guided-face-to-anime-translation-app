# Use official lightweight Node.js 20 LTS image
FROM node:20-bookworm-slim

# Set working directory
WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the entire codebase (including models and public assets)
COPY . .

# Build Vite frontend and compile the server with esbuild
RUN npm run build

# Hugging Face Spaces expects the app to listen on port 7860
ENV PORT=7860
EXPOSE 7860

# Start the compiled production server
CMD ["node", "dist/server.cjs"]
