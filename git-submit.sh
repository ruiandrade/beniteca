#!/usr/bin/env bash
set -euo pipefail

BRANCH=${1:-main}
MESSAGE=${2:-"Atualizações frontend/backend presenças e permissões"}

# Show status
printf "\n[1/4] git status\n"
git status

# Stage files (adjust if you changed more files)
printf "\n[2/4] git add -A\n"
git add -A

# Commit
printf "\n[3/4] git commit\n"
git commit -m "$MESSAGE"

# Push
printf "\n[4/4] git push origin %s\n" "$BRANCH"
git push origin "$BRANCH"

printf "\nDone.\n"
