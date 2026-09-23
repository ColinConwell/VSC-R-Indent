# Repository Instructions

## Testing Policy

Use only headless engine checks and the containerized browser editor for development testing. Colin reported disruptive behavior from the desktop launch harness and explicitly requested its removal.

Do not launch local VS Code, Cursor, or Positron applications, create Electron extension-host test windows, or install extensions into local editor profiles as part of development/testing. Do not restore desktop test launchers or instructions unless Colin explicitly changes this policy.

Use `npm test`, `npm run test:performance`, `npm run sandbox:up`, and `npm run sandbox:test`. The browser sandbox must remain bound to localhost and must not mount the host checkout, home directory, credentials, or Docker socket.

## Behavioral Contract

Preserve the original manual test scripts. Add exact regression fixtures before changing indentation behavior. Some alignment choices deliberately differ from whole-document formatters; matching Colin's manual expectations takes priority over generic formatting conventions.

Use Title Case for document headings that are not complete sentences or questions. Follow Colin's installed-product identity instructions when changing package identity or assets.
