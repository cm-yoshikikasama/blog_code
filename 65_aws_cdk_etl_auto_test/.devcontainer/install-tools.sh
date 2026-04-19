#!/bin/bash
set -e

# Claude Code (native installer)
curl -fsSL https://claude.ai/install.sh | bash
sudo ln -sf "$HOME/.local/bin/claude" /usr/local/bin/claude

echo ""
echo "=== Installed versions ==="
echo "AWS CLI:      $(aws --version 2>&1)"
echo "Claude Code:  $(claude --version 2>&1)"
echo "=========================="
