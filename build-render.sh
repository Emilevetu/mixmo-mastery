#!/bin/bash
set -e

echo "=== Render Build Script ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Force npm and disable bun
export NPM_CONFIG_PACKAGE_MANAGER=npm
unset BUN_INSTALL

echo "=== Installing dependencies ==="
npm install --production=false

echo "=== Checking installation ==="
ls -la node_modules/.bin/ | head -10

echo "=== Building with Vite ==="
if [ -f "./node_modules/.bin/vite" ]; then
    echo "Using direct vite path"
    ./node_modules/.bin/vite build
elif [ -f "./node_modules/vite/bin/vite.js" ]; then
    echo "Using vite.js path"
    node ./node_modules/vite/bin/vite.js build
else
    echo "Vite not found, trying npx"
    npx vite build
fi

echo "=== Build completed successfully ==="
