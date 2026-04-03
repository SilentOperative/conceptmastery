#!/usr/bin/env bash
set -e

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building frontend..."
# BASE_PATH=/ so all assets load from root; PORT is a dummy value (not used during build)
BASE_PATH=/ PORT=3000 pnpm --filter @workspace/question-generator run build

echo "==> Copying frontend into API server..."
# The built files go into artifacts/api-server/dist/public so the server can serve them
mkdir -p artifacts/api-server/dist/public
cp -r artifacts/question-generator/dist/public/. artifacts/api-server/dist/public/

echo "==> Building API server..."
pnpm --filter @workspace/api-server run build

echo "==> Done! Frontend copied to artifacts/api-server/dist/public"
