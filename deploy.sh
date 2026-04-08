#!/bin/bash

echo "🚀 Starting deployment..."

# Go to project root
cd /home/infelogr/domains/Infelo-Hub

# Pull latest code
git pull origin main

# =====================
# BACKEND (DJANGO)
# =====================
echo "🐍 Backend setup..."
cd /home/infelogr/domains/Infelo-Hub/server

# Activate virtualenv
source /home/infelogr/virtualenv/domains/Infelo-Hub/server/3.13/bin/activate

# Run migrations
python manage.py migrate

# =====================
# RESTART APP (DirectAdmin / Passenger)
# =====================
echo "🔄 Restarting Python app..."

touch /home/infelogr/domains/Infelo-Hub/server/tmp/restart.txt

# =====================
# FRONTEND BUILD
# =====================
echo "📦 Building frontend..."
cd /home/infelogr/domains/Infelo-Hub/web   # change if your frontend folder name is different
npm run build

echo "✅ Deployment finished!"