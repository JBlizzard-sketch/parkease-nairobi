#!/usr/bin/env bash
# push-to-github.sh — Commit all changes and push to GitHub
# Usage:  bash scripts/src/push-to-github.sh "optional commit message"
# Requires: GITHUB_PERSONAL_ACCESS_TOKEN env variable

set -e

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set."
  exit 1
fi

REMOTE_URL="https://JBlizzard-sketch:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/JBlizzard-sketch/parkease-nairobi.git"
DEFAULT_MSG="chore: sync from Replit [$(date '+%Y-%m-%d %H:%M UTC')]"
MESSAGE="${1:-$DEFAULT_MSG}"

echo "==> Staging all changes..."
git add -A

if git diff --cached --quiet; then
  echo "Nothing new to commit — checking if we need to push existing commits..."
else
  echo "==> Committing: $MESSAGE"
  git commit -m "$MESSAGE"
fi

echo "==> Pushing to GitHub (JBlizzard-sketch/parkease-nairobi)..."
git push "$REMOTE_URL" main:main

echo "Done! https://github.com/JBlizzard-sketch/parkease-nairobi"
