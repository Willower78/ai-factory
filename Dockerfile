FROM node:22-alpine

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose server port (Cloud Run defaults to PORT env variable)
ENV PORT=8080
EXPOSE 8080

CMD ["npx", "tsx", "src/server.ts"]
