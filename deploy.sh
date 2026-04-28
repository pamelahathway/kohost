#!/usr/bin/env bash
set -e

echo "==> Pushing to GitHub (triggers Vercel deploy)..."
git push origin main

echo ""
echo "==> Deploying Cloudflare Worker..."
cd worker
npx wrangler deploy
cd ..

echo ""
echo "✓ Both deployed."
