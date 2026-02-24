#!/bin/bash

set -e

echo "========================================="
echo "Purpose-Agnostic Agent Setup"
echo "========================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

echo "✅ Docker and docker-compose are installed"
echo ""

# Create directories
echo "Creating necessary directories..."
mkdir -p knowledge/general
mkdir -p knowledge/technical
mkdir -p knowledge/creative
mkdir -p logs
echo "✅ Directories created"
echo ""

# Copy .env.example to .env if not exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your API keys:"
    echo "   - OPENROUTER_API_KEY"
    echo "   - OPENAI_API_KEY (for embeddings)"
    echo ""
fi

# Start services
echo "Starting services with docker-compose..."
docker-compose up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check if database is ready
echo "Checking database connection..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "Waiting for database..."
    sleep 2
done
echo "✅ Database is ready"
echo ""

# Run database initialization
echo "Initializing database schema..."
docker-compose exec -T postgres psql -U postgres -d universal_brain -f /docker-entrypoint-initdb.d/init-db.sql || true
echo "✅ Database schema initialized"
echo ""

echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "Services are running:"
echo "  - API: http://localhost:3000"
echo "  - API Docs: http://localhost:3000/api/docs"
echo "  - Health Check: http://localhost:3000/health"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "Optional observability services:"
echo "  - Seq: http://localhost:5341"
echo "  - Grafana: http://localhost:3001 (admin/admin)"
echo "  - Prometheus: http://localhost:9090"
echo ""
echo "To start observability services:"
echo "  docker-compose -f docker-compose.observability.yml up -d"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f api"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
