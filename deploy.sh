#!/bin/bash
# deploy.sh — Run this on the server to deploy the latest version.
# Called automatically by GitHub Actions on every push to main.
set -e

APP_DIR="/opt/nexus-erp"
cd "$APP_DIR"

echo "▶ Pulling latest code..."
git pull origin main

echo "▶ Building Docker image..."
docker build -t nexus-erp:latest .

echo "▶ Restarting container..."
docker-compose down
docker-compose up -d

echo "▶ Cleaning up old images..."
docker image prune -f

echo "✓ Deploy complete! App running at http://localhost:3000"
