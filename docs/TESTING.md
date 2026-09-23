# Testing RStudio Indent

## Browser-Only Development Policy

Colin requested that testing use only headless engine checks and the containerized browser editor after the desktop launch harness caused disruptive local editor behavior. The Electron test dependency, desktop launchers, F5 configuration, local-install scripts, and desktop CI jobs have been removed. Do not launch local VS Code, Cursor, or Positron for development testing. This policy is also recorded in the repository's `AGENTS.md`.

Native-editor compatibility remains uncertified by the supported workflow. The browser container uses Code OSS with a Node extension host; it is not vscode.dev or a substitute for every downstream editor's behavior.

## Headless Checks

Use Node from `.nvmrc`, then run:

```sh
npm ci
npm run format:check
npm test
npm run test:performance
```

`npm test` cleans compiled output, compiles only `src`, runs exact whitespace assertions, and verifies the package allowlist and every relative compiled import's filename case. No R installation is needed. The performance command measures first-scan and cached p95 latency for 100-, 10,000-, and 50,000-line documents. Its generous threshold detects major regressions rather than comparing different machines.

The maintained suites use Node's built-in test runner and Playwright. Overlapping JS/TS/Mocha/mock suites and incomplete Air/AST parser tests were replaced. Assertions that accepted several contradictory answers now have one expected result. `npm run format` applies the pinned source/test formatting rules.

## Behavioral Fixtures

`tests/fixtures/indentation.cjs` is the shared contract. Mark insertion positions with `|CURSOR|`; absent a marker, the cursor is at the end. An integer means exact space columns, a string means exact whitespace, and `null` means native delegation. Cases cover operator chains, assignments, nested calls and blocks, comments, escaped and multiline literals, raw strings, quoted names, tabs, mid-line insertion, disabled settings, and malformed contexts.

`tests/manual_indent_tests.R` and `tests/comprehensive_test.R` remain unchanged. `tests/fixtures/manual-original.R` locks the manual script's bytes. Engine tests replay every pair of consecutive nonblank lines. Browser tests use a disposable copy of the same script. This does not execute R or install its packages. The larger comprehensive script remains exploratory material, not a complete RStudio conformance oracle. When a manual expectation differs, add the smallest failing example and resolve the intended behavior before changing expected whitespace.

## Containerized Browser Editor

Prerequisites: Docker with Compose v2, a running daemon, and Node/npm. The official `ghcr.io/coder/code-server:4.138.0` image supplies the editor. Building the container installs the real VSIX on Linux and copies the two existing R scripts into its disposable workspace.

```sh
npm run sandbox:up
docker compose up --wait --wait-timeout 60
```

Open <http://127.0.0.1:8788/?folder=/home/coder/workspace> and select `manual_indent_tests.R`. The installed extension's status and debug logs are enabled. Press Enter after `strtoi("5",` and inspect the seven-space alignment; try the ggplot chain and block examples. Rebuild with `npm run sandbox:up` after source changes, then reload the browser. Recreated containers reset their sample workspace.

The host port binds only to loopback. There is no authentication, repository bind mount, host home mount, Docker socket mount, or persistent volume. Do not change the binding to a public interface. Stop/remove with `npm run sandbox:down`.

## Automated Browser Tests

```sh
npx playwright install chromium
npm run sandbox:test
```

On Linux, `npx playwright install --with-deps chromium` also installs required browser libraries. `HEADED=1` shows the browser. `RSTUDIO_INDENT_PORT` changes the Docker host port; set `RSTUDIO_INDENT_URL` to the corresponding URL when using a nondefault port.

The suite opens `sandbox-smoke.R`, a container copy of the original manual script. It verifies installed identity and activation, presses the real Enter key, checks cursor position, saves and compares every byte, and tests undo restoration. Additional browser cases exercise shared fixtures for pipes, parameter values, blocks, nested alignment, completed chains, immediate openers, middle-of-line insertion, and insertion before a matching close. It also checks real closing-key formatting, selection replacement, and opening local diagnostic logs. The manual-script copy is restored after its undo check. Additional scenarios load generated `sandbox-case-*.R` files, avoiding auto-pairing or paste indentation during fixture setup. The suite closes its owned browser on timeout.

Screenshots and a trace are saved to ignored `output/playwright/`. Use `npx playwright show-trace output/playwright/sandbox-trace.zip` to investigate failures. The browser context is fresh for each run. Avoid manually editing `sandbox-smoke.R` during the suite. The original scripts and host checkout are untouched by browser edits.

## Continuous Integration and Limits

GitHub Actions runs on pushes, pull requests, and manual dispatch. It performs clean installation, formatting, unit, package, audit, and performance checks, then builds the container and runs Chromium tests. It uploads the VSIX and browser evidence. It does not launch desktop editors or publish to a registry.

The headless suite covers tabs and lexical/cache/configuration edge cases that the browser smoke suite does not exercise exhaustively. Multi-cursor combinations, snippets, IME input, embedded R Markdown/Quarto chunks, all settings scopes, and interaction with other R extensions are not fully certified by the current browser suite. Do not imply complete RStudio parity or certification of each native editor from these results. Record current evidence and remaining release-owner decisions in `docs/RELEASE-STATUS.md`.
