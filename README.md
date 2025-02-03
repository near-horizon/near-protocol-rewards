# Orc-Agent

Automated documentation generation system that integrates with GitHub repositories to maintain up-to-date, high-quality documentation.

## Features

- 🤖 Automated documentation generation from pull requests
- 📚 Intelligent content creation and organization
- 🔍 Code change analysis and impact assessment
- 📝 Tutorial and guide generation
- ✅ Content review and validation
- 🔄 Automated pull request creation

## Quick Start

1. **Prerequisites**
   - Python 3.11+
   - Docker and Docker Compose
   - Redis server
   - GitHub account with repository access
   - OpenAI API key

2. **Installation**

   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/orc-agent.git
   cd orc-agent

   # Set up environment
   cp .env.example .env
   # Edit .env with your configuration

   # Using Docker
   docker-compose up -d

   # Using Poetry (for development)
   poetry install
   poetry run uvicorn src.main:app --reload
   ```

3. **GitHub Webhook Setup**
   - Go to your repository settings
   - Add webhook: `https://your-domain/webhook/github`
   - Content type: `application/json`
   - Set secret and add to `.env`
   - Select "Pull requests" events

## Development

### Project Structure

```
orc-agent/
├── src/
│   ├── agents/      # Documentation generation agents
│   ├── events/      # Event processing system
│   ├── services/    # External service integrations
│   ├── templates/   # Documentation templates
│   ├── tools/       # Utility functions
│   └── webhook/     # GitHub webhook handler
├── tests/
│   ├── integration/ # Integration tests
│   └── unit/       # Unit tests
└── docs/
    ├── api.md       # API documentation
    ├── architecture.md # System architecture
    └── deployment.md  # Deployment guide
```

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=src

# Run specific test types
poetry run pytest tests/unit
poetry run pytest tests/integration
```

### Local Development

1. Start Redis:
   ```bash
   docker-compose up redis -d
   ```

2. Run the application:
   ```bash
   poetry run uvicorn src.main:app --reload
   ```

3. Access the API:
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs
   - Health: http://localhost:8000/health

## Documentation

- [Product Requirements Document](docs/prd.md)
- [API Documentation](docs/api.md)
- [Architecture Documentation](docs/architecture.md)
- [Deployment Guide](docs/deployment.md)

## Monitoring

### Health Checks

- Application: `/health`
- Redis: `/health/redis`
- GitHub: `/health/github`

### Metrics

Prometheus metrics available at `/metrics`:
- Request latency
- Queue size
- Processing time
- Error rates

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests and linting
4. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- GitHub Issues: [orc-agent/issues](https://github.com/yourusername/orc-agent/issues)
- Documentation: [docs/](docs/)