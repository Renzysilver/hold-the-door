#!/bin/bash
# ============================================================
# Hold The Door — Push to GitHub Script
# ============================================================
# Run this script on your Linux machine to push the project
# to your GitHub account.
#
# PREREQUISITES:
#   1. Git installed:  sudo apt install git -y
#   2. GitHub CLI:     (optional) https://cli.github.com/
#   3. GitHub account with SSH key or personal access token
#
# USAGE:
#   chmod +x push-to-github.sh
#   ./push-to-github.sh [REPO_NAME] [GITHUB_USERNAME]
#
# EXAMPLES:
#   ./push-to-github.sh hold-the-door myusername
#   ./push-to-github.sh                      # defaults: hold-the-door
# ============================================================

set -e

REPO_NAME="${1:-hold-the-door}"
GITHUB_USER="${2:-}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo "  HOLD THE DOOR — GitHub Push Setup"
echo "========================================"
echo ""
echo "Repo name:  $REPO_NAME"
echo "Project dir: $REPO_DIR"
echo ""

cd "$REPO_DIR"

# Check git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed."
    echo "Install it with: sudo apt install git -y"
    exit 1
fi

# Check if gh CLI is available (for automatic repo creation)
if command -v gh &> /dev/null; then
    echo "GitHub CLI detected."

    # Check if authenticated
    if ! gh auth status &> /dev/null 2>&1; then
        echo ""
        echo "You need to authenticate with GitHub first."
        echo "Running: gh auth login"
        echo ""
        gh auth login
    fi

    # Get username from gh if not provided
    if [ -z "$GITHUB_USER" ]; then
        GITHUB_USER=$(gh api user --jq .login 2>/dev/null || echo "")
    fi

    # Create repo if it doesn't exist
    FULL_REPO="${GITHUB_USER}/${REPO_NAME}"
    if ! gh repo view "$FULL_REPO" &> /dev/null 2>&1; then
        echo ""
        echo "Creating repository: $FULL_REPO"
        gh repo create "$REPO_NAME" --public --description "A 4-player co-op survival game on a dying space station" --source=. --remote=origin
        echo "Repository created!"
    else
        echo "Repository already exists: $FULL_REPO"
    fi

else
    echo "GitHub CLI not found. Using manual git setup."
    echo ""

    if [ -z "$GITHUB_USER" ]; then
        echo -n "Enter your GitHub username: "
        read -r GITHUB_USER
    fi

    # Set up remote
    FULL_REPO="${GITHUB_USER}/${REPO_NAME}"
    REMOTE_URL="git@github.com:${FULL_REPO}.git"

    # Check if remote already exists
    if git remote get-url origin &> /dev/null 2>&1; then
        echo "Updating remote origin to: $REMOTE_URL"
        git remote set-url origin "$REMOTE_URL"
    else
        echo "Adding remote origin: $REMOTE_URL"
        git remote add origin "$REMOTE_URL"
    fi

    echo ""
    echo "NOTE: You need to create the repository on GitHub first:"
    echo "  https://github.com/new"
    echo "  Name: $REPO_NAME"
    echo "  Description: A 4-player co-op survival game on a dying space station"
    echo ""
fi

# Push
echo ""
echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "========================================"
echo "  SUCCESS!"
echo "========================================"
echo ""
echo "Your project is now at:"
echo "  https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo ""
echo "To clone on another machine:"
echo "  git clone https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
echo ""
