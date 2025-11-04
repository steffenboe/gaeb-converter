# GAEB Converter - Docker Deployment

This guide explains how to deploy the GAEB Converter using Docker.

## Quick Start with Docker Compose

1. **Build and run the application:**
   ```bash
   docker-compose up -d --build
   ```

2. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

## Manual Docker Commands

### Build the Docker image:
```bash
docker build -t gaeb-converter .
```

### Run the container:
```bash
docker run -p 3000:3000 --name gaeb-converter-app gaeb-converter
```

### Run in detached mode:
```bash
docker run -d -p 3000:3000 --name gaeb-converter-app gaeb-converter
```

### Stop and remove the container:
```bash
docker stop gaeb-converter-app
docker rm gaeb-converter-app
```

## Production Deployment

### Using Docker Compose for Production

1. **Create a production docker-compose.yml:**
   ```yaml
   version: '3.8'
   
   services:
     gaeb-converter:
       build:
         context: .
         dockerfile: Dockerfile
       ports:
         - "80:3000"  # Map to port 80 for production
       environment:
         - NODE_ENV=production
         - NEXT_TELEMETRY_DISABLED=1
       restart: always
       healthcheck:
         test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
         interval: 30s
         timeout: 10s
         retries: 3
         start_period: 40s
   ```

2. **Deploy:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

### Using Docker Swarm (Multi-node)

1. **Initialize Docker Swarm:**
   ```bash
   docker swarm init
   ```

2. **Deploy as a stack:**
   ```bash
   docker stack deploy -c docker-compose.yml gaeb-converter-stack
   ```

3. **Scale the service:**
   ```bash
   docker service scale gaeb-converter-stack_gaeb-converter=3
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node.js environment | `production` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |
| `PORT` | Port the application runs on | `3000` |
| `HOSTNAME` | Hostname for the server | `0.0.0.0` |

## Health Checks

The Docker container includes health checks that:
- Test the application every 30 seconds
- Timeout after 10 seconds
- Retry 3 times before marking as unhealthy
- Wait 40 seconds before starting health checks

## Logs

### View container logs:
```bash
# Docker Compose
docker-compose logs -f gaeb-converter

# Docker
docker logs -f gaeb-converter-app
```

## Troubleshooting

### Container won't start:
1. Check logs: `docker-compose logs gaeb-converter`
2. Verify port availability: `lsof -i :3000`
3. Check Docker daemon: `docker info`

### Application not accessible:
1. Verify container is running: `docker ps`
2. Check port mapping: `docker port gaeb-converter-app`
3. Test health endpoint: `curl http://localhost:3000`

### Build issues:
1. Clear Docker cache: `docker system prune -a`
2. Rebuild without cache: `docker-compose build --no-cache`
3. Check .dockerignore file

## Security Considerations

- The application runs as a non-root user (`nextjs:nodejs`)
- No sensitive data is stored in the container
- All file processing happens in the browser
- No external database connections required

## Performance

- **Image size**: ~150MB (Alpine-based)
- **Memory usage**: ~100-200MB
- **CPU usage**: Minimal (file processing is client-side)
- **Startup time**: ~5-10 seconds

## Updates

To update the application:

1. **Pull latest code:**
   ```bash
   git pull origin main
   ```

2. **Rebuild and restart:**
   ```bash
   docker-compose down
   docker-compose up -d --build
   ```

3. **Clean up old images:**
   ```bash
   docker image prune -f
   ```