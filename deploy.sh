#!/bin/bash

echo "🚀 Starting deployment..."

# Go to project root
cd /home/infelogr/domains/Infelo-Hub

# Pull latest code
git pull origin main

# =====================
# FRONTEND BUILD
# =====================
echo "🌐 Frontend build..."

cd /home/infelogr/domains/Infelo-Hub/web

# Activate Node environment
source /home/infelogr/nodevenv/domains/node.infelogroup.com/24/bin/activate

# Install & build
npm run build

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


echo "✅ Deployment finished!"