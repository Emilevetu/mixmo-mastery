#!/bin/bash
set -e

echo "=========================================="
echo "=== RENDER BUILD SCRIPT - ULTRA VERBOSE ==="
echo "=========================================="

echo "=== SYSTEM INFO ==="
echo "Current directory: $(pwd)"
echo "User: $(whoami)"
echo "Home: $HOME"
echo "Shell: $SHELL"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "NPM config:"
npm config list
echo "Environment variables:"
env | grep -E "(NODE|NPM|PATH)" | sort

echo "=== PACKAGE.JSON CHECK ==="
echo "Package.json exists: $([ -f package.json ] && echo "YES" || echo "NO")"
echo "Package.json content:"
cat package.json | head -20

echo "=== NODE_MODULES CHECK (BEFORE) ==="
echo "node_modules exists: $([ -d node_modules ] && echo "YES" || echo "NO")"
if [ -d node_modules ]; then
    echo "node_modules size: $(du -sh node_modules)"
    echo "node_modules/.bin exists: $([ -d node_modules/.bin ] && echo "YES" || echo "NO")"
    if [ -d node_modules/.bin ]; then
        echo "Files in node_modules/.bin:"
        ls -la node_modules/.bin/ | head -20
    fi
fi

echo "=== FORCING NPM CONFIG ==="
export NPM_CONFIG_PACKAGE_MANAGER=npm
export NPM_CONFIG_ENGINE_STRICT=false
unset BUN_INSTALL
unset BUN
echo "NPM_CONFIG_PACKAGE_MANAGER: $NPM_CONFIG_PACKAGE_MANAGER"

echo "=== INSTALLING DEPENDENCIES ==="
echo "Running: npm install --production=false --verbose"
npm install --production=false --verbose

echo "=== NODE_MODULES CHECK (AFTER) ==="
echo "node_modules exists: $([ -d node_modules ] && echo "YES" || echo "NO")"
if [ -d node_modules ]; then
    echo "node_modules size: $(du -sh node_modules)"
    echo "node_modules/.bin exists: $([ -d node_modules/.bin ] && echo "YES" || echo "NO")"
    if [ -d node_modules/.bin ]; then
        echo "Files in node_modules/.bin:"
        ls -la node_modules/.bin/ | head -20
        echo "Vite specifically:"
        ls -la node_modules/.bin/vite* 2>/dev/null || echo "No vite files found"
    fi
fi

echo "=== VITE PACKAGE CHECK ==="
echo "Vite package exists: $([ -d node_modules/vite ] && echo "YES" || echo "NO")"
if [ -d node_modules/vite ]; then
    echo "Vite package contents:"
    ls -la node_modules/vite/
    echo "Vite bin directory:"
    ls -la node_modules/vite/bin/ 2>/dev/null || echo "No bin directory"
fi

echo "=== PATH CHECK ==="
echo "Current PATH: $PATH"
echo "Which vite: $(which vite 2>/dev/null || echo "NOT FOUND")"
echo "Which npx: $(which npx 2>/dev/null || echo "NOT FOUND")"

echo "=== BUILDING WITH VITE ==="
echo "Trying method 1: Direct vite path"
if [ -f "./node_modules/.bin/vite" ]; then
    echo "Found ./node_modules/.bin/vite"
    echo "File info:"
    ls -la ./node_modules/.bin/vite
    echo "File type:"
    file ./node_modules/.bin/vite
    echo "Executing: ./node_modules/.bin/vite build"
    ./node_modules/.bin/vite build
elif [ -f "./node_modules/vite/bin/vite.js" ]; then
    echo "Found ./node_modules/vite/bin/vite.js"
    echo "Executing: node ./node_modules/vite/bin/vite.js build"
    node ./node_modules/vite/bin/vite.js build
else
    echo "Vite not found in expected locations"
    echo "Trying npx vite build"
    npx vite build
fi

echo "=== BUILD RESULT CHECK ==="
echo "dist directory exists: $([ -d dist ] && echo "YES" || echo "NO")"
if [ -d dist ]; then
    echo "dist contents:"
    ls -la dist/
fi

echo "=========================================="
echo "=== BUILD COMPLETED ==="
echo "=========================================="
