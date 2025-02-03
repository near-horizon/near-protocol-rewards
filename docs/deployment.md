# Deployment Guide

This guide provides instructions for deploying the Orc-Agent documentation system in various environments.

## Prerequisites

- Docker and Docker Compose
- Python 3.9 or higher
- Redis server
- GitHub account with repository access
- OpenAI API key

## Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/orc-agent.git
cd orc-agent
```

2. Copy the environment template:
```bash
cp .env.example .env
```

3. Configure environment variables:
```bash
# GitHub Configuration
GITHUB_TOKEN=your_github_token_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_API_URL=https://api.github.com
GITHUB_ORGANIZATION=your_org_name
GITHUB_REPOSITORY=your_repo_name

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

## Local Development

1. Install dependencies:
```bash
poetry install
```

2. Start Redis:
```bash
docker-compose up redis -d
```

3. Run the application:
```bash
poetry run uvicorn src.main:app --reload
```

## Docker Deployment

1. Build and start services:
```bash
docker-compose up --build -d
```

2. Verify services are running:
```bash
docker-compose ps
```

3. Check logs:
```bash
docker-compose logs -f app
```

## Production Deployment

### Using Docker Compose

1. Configure production environment:
```bash
# Set production values in .env
DEBUG=false
LOG_LEVEL=INFO
```

2. Start services:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Using Kubernetes

1. Create Kubernetes secrets:
```bash
kubectl create secret generic orc-agent-secrets \
  --from-literal=GITHUB_TOKEN=your_token \
  --from-literal=OPENAI_API_KEY=your_key \
  --from-literal=REDIS_PASSWORD=your_password
```

2. Apply Kubernetes manifests:
```bash
kubectl apply -f k8s/
```

3. Verify deployment:
```bash
kubectl get pods
kubectl get services
```

## GitHub Webhook Setup

1. Go to your repository settings
2. Navigate to Webhooks > Add webhook
3. Configure webhook:
   - Payload URL: `https://your-domain/webhook/github`
   - Content type: `application/json`
   - Secret: Your `GITHUB_WEBHOOK_SECRET`
   - Events: Select "Pull requests"

## Health Checks

The application provides health check endpoints:

- `/health` - Basic application health
- `/health/redis` - Redis connection status
- `/health/github` - GitHub API status

Monitor these endpoints for service health.

## Monitoring

### Metrics

The application exposes Prometheus metrics at `/metrics`:

- Request latency
- Queue size
- Processing time
- Error rates

### Logging

Logs are written to stdout/stderr and can be collected by your logging infrastructure:

```bash
# View application logs
docker-compose logs -f app

# View Redis logs
docker-compose logs -f redis
```

## Backup and Recovery

### Redis Backup

1. Create Redis backup:
```bash
docker-compose exec redis redis-cli SAVE
```

2. Copy backup file:
```bash
docker cp orc-agent_redis_1:/data/dump.rdb ./backup/
```

### Recovery

1. Stop services:
```bash
docker-compose down
```

2. Restore Redis backup:
```bash
docker cp ./backup/dump.rdb orc-agent_redis_1:/data/
```

3. Restart services:
```bash
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis credentials
   - Verify Redis service is running
   - Check network connectivity

2. **GitHub API Rate Limit**
   - Verify token permissions
   - Implement rate limiting
   - Use conditional requests

3. **Documentation Generation Failed**
   - Check OpenAI API key
   - Verify template files exist
   - Check file permissions

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=DEBUG
DEBUG=true
```

## Security Considerations

1. **API Keys and Secrets**
   - Use environment variables
   - Rotate secrets regularly
   - Use secret management services

2. **Network Security**
   - Enable HTTPS
   - Use secure Redis connection
   - Implement rate limiting

3. **Access Control**
   - Restrict GitHub token permissions
   - Use least privilege principle
   - Monitor access logs

## Performance Tuning

1. **Redis Configuration**
```bash
# Update Redis configuration
maxmemory 2gb
maxmemory-policy allkeys-lru
```

2. **Application Settings**
```bash
# Update worker configuration
WORKERS=4
MAX_QUEUE_SIZE=1000
```

3. **Resource Limits**
```yaml
# Update container resources
resources:
  limits:
    cpu: "1"
    memory: "1Gi"
  requests:
    cpu: "500m"
    memory: "512Mi"
```
