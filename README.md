## R Indentation Fixer (VS Code Extension)
Minimal extension that adjusts indentation for R on typing closing braces/brackets/parentheses.

### Development
1. Install deps: `npm install`
2. Build once: `npm run compile` or watch: `npm run watch`
3. Press F5 in VS Code to launch Extension Development Host.

### Installation
- **VS Code**: `npm run install:local`
- **Cursor**: `npm run install:cursor`

Alternatively, you can use the script directly:
- **VS Code**: `bash ./scripts/install-local.sh`
- **Cursor**: `bash ./scripts/install-local.sh --cursor`

### How it works
- Provides an on-type formatter for `r` on `)`, `]`, `}` to align with its matching opener’s indent.

### Packaging
- To package as `.vsix`, install `vsce` (`npm i -g @vscode/vsce`) and run `vsce package`.
