FROM node:20-bookworm

WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source
COPY . .

# Build application
RUN npm run build --if-present

# Application port
EXPOSE 3000

# Start application
CMD ["npm", "start"]