#!/usr/bin/env bash
set -euo pipefail

# Check for --cursor flag
USE_CURSOR=false
if [[ "$*" == *"--cursor"* ]]; then
    USE_CURSOR=true
fi

# Build the extension
npm run compile

# Package using vsce (installed as dev dep)
npx --yes @vscode/vsce package --no-dependencies --out vsc-r-indent.vsix

# Install the .vsix into the appropriate editor
if [ "$USE_CURSOR" = true ]; then
    cursor --install-extension vsc-r-indent.vsix --force
    echo "Installed vsc-r-indent.vsix in Cursor. Restart Cursor if not auto-activated."
else
    code --install-extension vsc-r-indent.vsix --force
    echo "Installed vsc-r-indent.vsix in VS Code. Restart VS Code if not auto-activated."
fi

