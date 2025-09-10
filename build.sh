#!/bin/bash

echo "=== Build Script Debug ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "=== Installing dependencies ==="
npm ci

echo "=== Checking node_modules ==="
ls -la node_modules/.bin/ | grep vite

echo "=== Adding node_modules/.bin to PATH ==="
export PATH="$PWD/node_modules/.bin:$PATH"
echo "Updated PATH: $PATH"

echo "=== Trying different vite commands ==="
echo "1. Direct vite command:"
./node_modules/.bin/vite --version || echo "Direct vite failed"

echo "2. NPX vite command:"
npx vite --version || echo "NPX vite failed"

echo "3. Vite from PATH:"
vite --version || echo "Vite from PATH failed"

echo "4. NPM run build:"
npm run build

echo "=== Build completed ==="
