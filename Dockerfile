FROM node:20-bookworm

# Install Python and pip for helper scripts
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy application source code
COPY . .

# Build TypeScript and Vite frontend bundle
RUN npm run build --if-present

EXPOSE 3000

CMD ["npm", "start"]