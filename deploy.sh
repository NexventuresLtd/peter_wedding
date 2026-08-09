#!/bin/bash

set -Eeuo pipefail

PROJECT_DIR="/var/www/peter_wedding"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"
UPLOADS_DIR="$BACKEND_DIR/uploads"

LOG_FILE="/var/log/peter-wedding-deploy.log"

exec >> "$LOG_FILE" 2>&1

echo
echo "=========================================="
echo "Peter & Yvette Deployment"
echo "$(date)"
echo "=========================================="

cd "$PROJECT_DIR"

# ------------------------------------------
# Make sure uploads directory exists
# ------------------------------------------

mkdir -p "$UPLOADS_DIR"

# ------------------------------------------
# Update repository
# ------------------------------------------

echo "[1/5] Pulling latest code..."

git fetch origin

CURRENT_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git rev-parse origin/HEAD 2>/dev/null || git rev-parse origin/main)"

if [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ]; then
    echo "No Git changes detected."
else
    echo "Changes detected."
    git pull --ff-only
fi

# ------------------------------------------
# Frontend
# ------------------------------------------

echo "[2/5] Building frontend..."

cd "$FRONTEND_DIR"

if [ -f package-lock.json ]; then
    echo "Using npm..."
    npm ci
    npm run build

elif [ -f pnpm-lock.yaml ]; then
    echo "Using pnpm..."

    if ! command -v pnpm >/dev/null 2>&1; then
        echo "ERROR: pnpm is not installed."
        exit 1
    fi

    pnpm install --frozen-lockfile
    pnpm run build

elif [ -f yarn.lock ]; then
    echo "Using yarn..."
    yarn install --frozen-lockfile
    yarn build

else
    echo "ERROR: No supported package manager lockfile found."
    exit 1
fi

# ------------------------------------------
# Make sure uploads still exist
# ------------------------------------------

echo "[3/5] Verifying uploads..."

mkdir -p "$UPLOADS_DIR"

echo "Upload directory:"
ls -ld "$UPLOADS_DIR"

# ------------------------------------------
# Restart backend
# ------------------------------------------

echo "[4/5] Restarting FastAPI..."

systemctl restart peter-wedding-backend

sleep 3

if systemctl is-active --quiet peter-wedding-backend; then
    echo "FastAPI backend is running."
else
    echo "ERROR: FastAPI backend failed to start."
    systemctl status peter-wedding-backend --no-pager
    exit 1
fi

# ------------------------------------------
# Reload Nginx
# ------------------------------------------

echo "[5/5] Checking Nginx..."

nginx -t

systemctl reload nginx

echo
echo "Deployment completed successfully."
echo "$(date)"
echo "=========================================="