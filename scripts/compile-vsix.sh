#!/usr/bin/env bash
set -euo pipefail

# Build the extension
npm run compile

# Package using vsce (installed as dev dep)
npx --yes @vscode/vsce package --no-dependencies --out vsc-r-indent.vsix