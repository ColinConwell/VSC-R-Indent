# R Indent Release Readiness Review

> Historical pre-fix review. **Testing-policy correction:** Colin has withdrawn desktop-editor testing because the launcher caused disruptive behavior. Use only headless checks and the browser container; do not follow or restore the old desktop harness. The implementation and test infrastructure have since changed. See [Release Status](docs/RELEASE-STATUS.md) for the current disposition and [Publishing](docs/PUBLISHING.md) for the current release procedure.

Review date: September 20, 2026. Extension: `ColinConwell.vsc-r-indent`, version `0.1.0`. Repository HEAD: `c765d17`; this review includes the pre-existing uncommitted changes in the working directory.

## Assessment

R Indent has a useful, narrowly defined purpose and a small TypeScript implementation with no declared production npm dependencies. The project already has an extension manifest, icon, license, configurable engines, automated tests, and local installation scripts. The separation between editor integration, configuration, rules, and bracket scanning is a reasonable foundation.

It is not ready for a supported public release. The default engine has reproducible editing defects, the integration test infrastructure is unreliable, and packaging can include obsolete output that breaks case-sensitive systems. Air integration does not work with the installed Air binary, and AST mode has structural parsing limitations. These are more consequential than marketplace metadata polish.

Recommended first-release scope: reliable R-script indentation using the rules engine. Remove Air and AST from the supported public surface until independently validated, or fix them before release. Keeping an engine labeled experimental does not excuse it from preserving editor behavior or respecting workspace trust.

No source fixes, commits, installs into normal editor profiles, or marketplace publications were performed. Compilation refreshed ignored build output; additional diagnostic artifacts and isolated editor profiles were created under `/tmp`. This document is the only intentional repository addition.

## Verification Results

| Check | Result | Interpretation |
|---|---|---|
| TypeScript compilation | Passed | Both existing output and a fresh temporary output directory compiled. |
| Unit/headless/performance script on Node 24.4.1 | 56 passing: 20 unit, 35 headless, one benchmark | Passing assertions substantially overstate behavioral coverage. |
| Rules and AST headless suites run separately | 14 and 20 passing | They also pass without the Air suite, but retain permissive assertions. |
| Same test script on the machine's default Node 26.8.2 | Failed before tests | Existing Mocha/Yargs dependency combination fails with `require is not defined in ES module scope`. Pin a tested development runtime. |
| Existing integration suite in cached VS Code 1.104.2 | One passing, one failing | Used a corrected development path and isolated profile. Parameter test expected four spaces but received zero. |
| Explicit activation and editor diagnostics | Completed | Parameter indentation works after activation; block and closing-bracket defects reproduced in the actual extension host. |
| Installed Air 0.5.0 invocation | Failed | `air format - --no-color` exits 255 and treats `-` as a nonexistent filename. |
| Existing VSIX inspection | Stale and overinclusive | September 2025 archive includes an old Air source tree and development/test material. |
| Current `vsce ls --no-dependencies` with cached vsce 3.7.1 | 58 files before this report was added | Includes tests, `.cursor/AGENTS.md`, scripts, obsolete compiled files, and test configuration. Clean temporary output still yielded 53 files. |
| Dependency audit against local lockfile | 13 findings: eight high, three moderate, two low | Development dependency tree; production-only audit reports zero. This is not a claim of 13 exploitable vulnerabilities in the installed extension. |
| Public endpoints | Repository accessible; extension listings absent | GitHub repository is public with default branch `main`. Microsoft extension page, Open VSX extension API, and Open VSX `ColinConwell` namespace API returned 404. This does not establish Microsoft publisher availability or account ownership. |

The first sandboxed Electron launch aborted; the subsequent isolated host launch outside that sandbox completed. No current Cursor, Positron, Windows, Linux, minimum-supported VS Code, or current-stable VS Code behavior was certified by this review.

## Release Blockers

### 1. Enter Incorrectly Dedents Statements Inside Blocks

Evidence: [BracketRules.ts](/Users/colinconwell/GitHub/VSC-R-Indent/src/rules/BracketRules.ts:211) and [indentationEngine.ts](/Users/colinconwell/GitHub/VSC-R-Indent/src/indentation/indentationEngine.ts:283).

With default settings, pressing Enter at the end of this document inserts a newline at column zero:

```r
if (TRUE) {
  x <- 1
```

The block is still open, so the next statement should retain the body indentation. This was reproduced in VS Code, not just a mock. The closing-context rule treats a complete statement as the end of a bracket argument list and returns the opener's base indentation. It applies to braces as well as function-call parentheses.

Separate block-body indentation from argument-list closing behavior. Require actual syntactic evidence for a close context, and add exact expected-text tests for statements, calls, nested blocks, loops, functions, and `else`.

### 2. Closing-Bracket Formatting Uses the Wrong Bracket Context

Evidence: [indentationEngine.ts](/Users/colinconwell/GitHub/VSC-R-Indent/src/indentation/indentationEngine.ts:94) and [extension.ts](/Users/colinconwell/GitHub/VSC-R-Indent/src/extension.ts:125).

The formatter receives a position after the newly typed closing character. The backward scanner consumes that bracket and its matching opener, then returns an outer unmatched opener. The caller treats the outer opener as the match for the newly typed character.

Actual host diagnostics returned edits removing two spaces from both of these final lines:

```r
f(
  g(
    x
  )
```

```r
if (TRUE) {
  print(x)
```

The first should close `g` at its two-space base. The second is an inline expression and should keep its block indentation. Conversely, a top-level overindented closing parenthesis returned no edit because no unmatched opener remained.

Find the matching opener for the specific closing token, use its bracket type, and only dedent a line when its leading syntax warrants it. Test the post-insertion document and cursor. Existing headless tests supply documents without the closing character, which misses the actual API contract.

### 3. Clean Builds and Package Contents Are Not Controlled

Evidence: [package.json](/Users/colinconwell/GitHub/VSC-R-Indent/package.json:10), [.vscodeignore](/Users/colinconwell/GitHub/VSC-R-Indent/.vscodeignore:1), and [tsconfig.json](/Users/colinconwell/GitHub/VSC-R-Indent/tsconfig.json:19).

`tsc` does not remove obsolete output. The current output directory contains `airASTRules.js` and obsolete `AIR-AST-Rules.js`, while the generated import requests `./rules/AirASTRules.js`. Case-insensitive macOS loading masks this discrepancy. A VSIX produced from this directory risks failing activation on case-sensitive Linux. A fresh temporary compilation emits the correctly cased `AirASTRules.js`.

The production compilation includes tests. The package file list includes source tests, compiled tests, duplicate JS test artifacts, developer scripts, and `.cursor/AGENTS.md`. The existing VSIX additionally contains the old Air tree, which is absent from the current checkout.

Use a clean production build and an explicit runtime allowlist. Include compiled runtime files, manifest, icon, README, license, and changelog; include language configuration only if deliberately used and valid. Exclude tests, developer instructions, this review, scripts, caches, archives, and historical output. Preserve readable source in the public repository and publish a corresponding release tag. Verify archive entry capitalization and loadability on Linux. Do not publish the existing VSIX.

### 4. CI Cannot Run Successfully From a Fresh Checkout

Evidence: [test.yml](/Users/colinconwell/GitHub/VSC-R-Indent/.github/workflows/test.yml:3), [.gitignore](/Users/colinconwell/GitHub/VSC-R-Indent/.gitignore:45), and [package.json](/Users/colinconwell/GitHub/VSC-R-Indent/package.json:9).

There are multiple independent problems:

- The workflow invokes `npm ci`, but no lockfile is tracked and `.gitignore` explicitly excludes it.
- The workflow invokes `npm run test`, but that script does not exist.
- It does not compile the output consumed by the headless and integration suites.
- It runs only on manual dispatch, so changes and pull requests receive no automatic check.
- The shell-style environment assignment in `test:unit` is not portable to Windows' default npm shell.
- Packaging downloads an unpinned `@vscode/vsce`; it is not actually a dev dependency, despite script comments claiming otherwise.

Track a regenerated lockfile, pin a tested Node version and release tools, define a complete test entry point, build before tests, and run CI on pull requests and pushes. Split fast unit tests, integration tests, and optional benchmarks. Use cross-platform scripts. Current vsce documentation requires Node 22 or later; Node 24 is a suitable candidate given the successful local run. [vsce requirements](https://github.com/microsoft/vscode-vsce#requirements)

The declared `@types/vscode` range starts at 1.95, but the installed types are 1.103. Pin API types to the minimum supported editor version, or otherwise check against that minimum, so newer typings do not silently permit APIs unavailable in the advertised compatibility range.

### 5. Integration Tests Do Not Reliably Exercise the Extension

Evidence: [runTest.ts](/Users/colinconwell/GitHub/VSC-R-Indent/tests/integration/runTest.ts:6) and [indentation.test.ts](/Users/colinconwell/GitHub/VSC-R-Indent/tests/integration/suite/indentation.test.ts:9).

After compilation, resolving `../../` from `out/tests/integration` points to `out`, not the repository root containing `package.json`. Correct this path before using the standard runner.

Even with the path corrected externally for this review, the suite does not await extension activation. Its first test failed with zero spaces instead of four. Explicitly awaiting activation made that case work. The closing-bracket test begins at column zero and expects column zero, so it can pass without formatting doing anything. It also does not establish that on-type formatting has run.

Activate by extension ID, set deterministic editor settings, await edits, begin with genuinely incorrect indentation, and assert full document text, cursor position, and undo behavior. Print the caught error rather than discarding it.

### 6. Air Mode Needs Repair or Removal From the Release

Evidence: [airRunner.ts](/Users/colinconwell/GitHub/VSC-R-Indent/src/indentation/airRunner.ts:15) and [indentationEngine.ts](/Users/colinconwell/GitHub/VSC-R-Indent/src/indentation/indentationEngine.ts:111).

The installed Air 0.5.0 rejects the implemented stdin invocation. Current Air documentation instead specifies `--stdin-file-path`, which also supplies the location for configuration discovery. Define and test a supported Air version and invocation. [Air CLI documentation](https://posit-dev.github.io/air/cli.html#stdin)

Other issues persist even after fixing that command:

- `spawnSync` blocks the extension host on every relevant keystroke, with a 200 ms configured timeout.
- Enter is appended to the end of a slice, not inserted at the cursor position.
- Formatted line numbers are treated as if they map directly back to original lines, although formatting can reflow lines.
- Arbitrary slices and unfinished R expressions frequently cannot be formatted.
- No document path/cwd is supplied for project configuration lookup.
- Failures silently fall back to rules while the selected engine still says Air.
- The benchmark asserts only that result rows exist; it does not assert successful Air formatting. Here it timed failed Air invocations followed by fallback.

The optional asynchronous runner is unused and also needs timer, stdin-error, and output-bound handling before reuse. A small first release can omit this entire subprocess integration without sacrificing the default indentation feature.

## Additional Correctness and Design Improvements

### Editor Command Integration

[extension.ts](/Users/colinconwell/GitHub/VSC-R-Indent/src/extension.ts:53) registers the global `type` command. Although its handler delegates non-R input, its registration remains global after activation. Other typing interceptors, modal editing extensions, snippets, inline completions, and editor commands need explicit coexistence tests.

Prefer a dedicated `rIndent.enter` command with a narrowly scoped keybinding, or evaluate the on-type formatting API for newline handling. Retain native behavior for multi-cursor edits and selections. Use editor-specific focus conditions; `textInputFocus` is broader than editor focus. Test undo/redo, Enter in the middle of a line, selection replacement, auto-closing pairs, CRLF, and IME/completion interactions before making a replacement architecture definitive.

The closing-bracket provider depends on the editor's on-type formatting behavior; document the relevant setting. Enter interception is independent of that setting, so the user experience is currently inconsistent. The standalone filename-pattern selector can match a `.R` file assigned another language, while notebook and embedded-language behavior is not established.

### Lexing and Rule Composition

[bracketUtils.ts](/Users/colinconwell/GitHub/VSC-R-Indent/src/utils/bracketUtils.ts:30) restarts string state for every line and does not handle backtick identifiers or R raw strings. A multiline string containing `)` caused the scanner to lose the actual outer call. The valid backtick identifier in `` `a(b` + `` was interpreted as containing an opening bracket.

Several operator/parameter checks still use regexes without lexical context. Reproductions include:

- `x =` receives four spaces: top-level assignment and parameter contributions both apply.
- `x *` returns no rule result despite the documented arithmetic continuation support.
- An unfinished string ending with `+` receives a two-space continuation, potentially altering literal content.

Use one document-aware lexical representation for comments, quotes, backticks, raw strings, brackets, and operators. Make rule results distinguish absolute alignment columns from additional indent widths; adding both as interchangeable numbers causes double-counting. Preserve `null` as “delegate” and an empty string as an intentional zero indent.

### AST Mode

[rASTParser.ts](/Users/colinconwell/GitHub/VSC-R-Indent/src/indentation/rASTParser.ts:51) creates a Call node and another Bracket node for one opening parenthesis. Closing a parenthesis closes only one. Unclosed node spans do not extend to the cursor on later lines, which is especially problematic for an on-type parser. Call-name whitespace also affects the recorded opening column.

For `f(\n  a =`, `stackAt` returned Program and BinaryOp, but no enclosing call. The engine returned `null` after `f(\n  a = 1,`. AST parameter continuation for `f(a =` returned two spaces instead of the documented bracket-base-plus-two result. AST alignment also ignores the `alignFunctionArguments` switch.

Either keep this out of supported release scope or implement a consistent incomplete-code parser with exact regression fixtures. The current implementation should not be described as a full R AST or exact Air/RStudio emulation.

### Configuration, Tabs, and Lifecycle

[settings.ts](/Users/colinconwell/GitHub/VSC-R-Indent/src/config/settings.ts:22) reads extension settings without document scope; the engine caches active-editor options and refreshes only on `rIndent` changes. Folder settings and changing active editors can therefore be handled incorrectly.

Most rules and the final combination still construct spaces. With `insertSpaces: false`, `x |>` produced two spaces. The tab-aware helper is unused. Distinguish display columns from string length, resolve configuration per document, and respect per-editor formatting options.

Constrain `indentSize` to a sensible integer range and validate it at runtime. Invalid widths currently reach string repetition or are silently swallowed by rule error handling. Store and dispose the engine's configuration subscription. Make `updateConfig` rebuild the rule set when the engine changes. Avoid computing detailed explanations and timestamps when debug logging is disabled.

### Workspace Trust and Execution Scope

The manifest has no explicit Workspace Trust capabilities, and Air's executable path is read from configuration then executed without a trust check. Do not claim a demonstrated Restricted Mode exploit: default editor trust behavior was not exhaustively tested. Nevertheless, intentionally support safe rules behavior while preventing workspace-controlled execution in untrusted contexts. If Air remains, restrict executable-path configuration and gate subprocess invocation on trust. [Workspace Trust guidance](https://code.visualstudio.com/api/extension-guides/workspace-trust)

No telemetry or network client was found in runtime source. Debug logs include R source lines; document that they remain local and that users should review them before attaching logs to issues. The rules engine does not need R installed. Air mode requires a separately discoverable compatible executable; another extension bundling Air does not automatically put it on PATH.

### Test Quality and Performance

Examples such as `indent === null || typeof indent === 'string'`, nonnegative lengths, and accepting multiple different indentation widths do not establish correctness. Replace them with agreed expected output. The Air mock and configuration prototype wrappers are not restored; improve test isolation and use a shared complete document mock. One rules mock lacks `lineCount`. The TypeScript headless test directory is compiled but omitted from `test:unit`.

The existing benchmark uses coarse millisecond timing, tiny inputs, and no enforceable budget. Repeated bracket scans can walk to the beginning of a document several times per keystroke; AST rules repeatedly parse overlapping windows. Measure realistic long documents using a high-resolution timer, including long strings and nesting. Cache parsed context per document version/position only after correctness is established.

### Commands, Metadata, and Documentation

- Contribute `rIndent.toggleEngine` to the command palette; runtime registration and a README entry are not enough.
- “Show Recent Logs” never calls `OutputChannel.show()`; it only displays a notification and attempts to log an empty string.
- Provide deliberate Windows/Linux keybindings rather than only `cmd+shift+9`.
- Replace `developer@dev.com`, populate relevant search keywords, and decide whether `vsc-r-indent` is the permanent extension name before publication.
- Add a changelog, concise support guidance, installation instructions for all three editors, screenshots or a short demo, and clear compatibility limitations.
- Remove claims of exact RStudio parity and unsupported certainty about Positron. Describe observed supported cases.
- Repair README references to nonexistent/removed tests, obsolete rules/priorities, nonexistent benchmark filenames, and browser-sandbox setup.
- The icon is a real 722×560 PNG. A square, product-distinct version should be inspected at small size on light and dark extension lists. Confirm artwork provenance and permission to use its R branding.
- The existing `language-configuration.json` contains invalid JSON escapes and is not referenced by a language contribution or runtime registration. Remove it if unused; otherwise repair, validate, and integrate it deliberately without unnecessarily replacing the editors' R language support.
- Confirm the intended GPL variant and use a consistent SPDX identifier. The ignored lockfile still identifies the project as MIT. Regenerate it; preserve the license and corresponding release source.
- Remove unused imports, helpers, legacy test JS, duplicate presets, and unreachable rule-combination branches. Replace remaining `any`-based rule-evaluation records with typed results.

## Marketplace Distribution

| Editor | Publication Destination | Implication |
|---|---|---|
| VS Code | Visual Studio Marketplace | Publish under your Microsoft Marketplace publisher. |
| Cursor | Open VSX-backed extension gallery | Publish to Open VSX and verify visibility in Cursor. |
| Positron | Posit Public Package Manager, using the Open VSX catalog by default | Publish to Open VSX and verify visibility in Positron. |

These are two publication destinations, not three independent submissions. Positron Pro administrators can configure extension distribution differently. Marketplace presence is separate from vendor endorsement and separate from publisher-verification badges. Sources: [Cursor's announcement](https://forum.cursor.com/t/extension-marketplace-changes-transition-to-openvsx/109138), [Positron's extension documentation](https://positron.posit.co/extensions.html).

## Accounts, Credentials, and Decisions

| Item | Needed From You | Status |
|---|---|---|
| Permanent identity | Confirm `R Indent`, `vsc-r-indent`, and publisher/namespace `ColinConwell`, or choose replacements before launch. | Local manifest specifies these; account control is unverified. |
| Microsoft publisher | Microsoft sign-in, publisher creation/access, and publishing rights. | Not inferred from the manifest or missing extension page. |
| Microsoft release authentication | Browser upload for the initial release, or an authorized automated publishing identity. | No secrets were searched for or accessed. |
| Open VSX account | GitHub login plus linked Eclipse account with matching GitHub identity. | Needs confirmation/setup. |
| Open VSX agreement | Account holder accepts the Publisher Agreement. | Separate from the Eclipse Contributor Agreement. |
| Open VSX first-publish token | Access token held in a secret manager or protected CI secret. | Required for the ordinary first-publish path. |
| Namespace verification | Claim ownership and provide evidence tying GitHub/repository identity to `ColinConwell`. | Namespace API returned not found. |
| CI administration | Permission to configure workflows, protected release environment, and registry publishing policies. | Needs confirmation. |
| Public support identity | Real author/display name, contact/support policy, license choice, icon provenance. | Placeholder author needs replacement. |
| Release contract | Engine scope, supported editors/OSes, R scripts versus notebooks/Quarto, first version, and maintenance expectations. | Recommended narrow scope above. |

Provide account names and decisions as text; enter credentials directly in the relevant service or secret store rather than in the review conversation. No separate npm publisher account, Cursor publishing token, or Positron publishing token is required for this extension's ordinary registry distribution.

## Publication Steps

### Phase 1: Stabilize the Release

1. Review and preserve the existing uncommitted work, including currently untracked runtime utilities. Commit a coherent release candidate after fixes.
2. Fix default-engine block/closing-bracket behavior, lexical handling, assignment composition, and configuration behavior. Decide whether Air/AST are removed or repaired.
3. Repair CI and integration activation; replace permissive tests with exact regression expectations.
4. Refresh and audit development dependencies. Commit the lockfile and pin the build environment and packaging tools. Do not use a blanket force-upgrade without validation.
5. Separate production/test builds; enforce a clean output directory and package allowlist.
6. Finish metadata, changelog, icon review, screenshots, user instructions, and documented limitations.

### Phase 2: Validate the Candidate

| Dimension | Minimum Release Evidence |
|---|---|
| Editor Testing | Containerized browser Code OSS only; native-editor compatibility remains uncertified. |
| Operating Systems | Linux container runtime, plus platform-independent engine checks. Do not infer native OS certification. |
| Engines | Every exposed engine independently tested; successful real Air execution required if retained. |
| R syntax | Blocks, calls, nested brackets, named arguments, `=`/`<-`, operators, pipes, strings/comments/backticks/raw strings, incomplete expressions. |
| Editing | Enter at end/middle, empty bracket pairs, inline/standalone closes, selections, multi-cursor fallback, undo/redo, CRLF, tabs. |
| Integration | Browser keybindings, snippets/completions, and on-type formatting. Do not claim unverified native extension combinations. |
| Settings | User/workspace/folder scopes, engine switching, debug commands, invalid indentation settings, trust behavior. |
| Package | Install the clean VSIX in the browser container; verify activation, commands, settings, and icons. |
| Performance | Large realistic scripts with a stated latency budget; distinguish formatting success from fallback. |

Desktop JavaScript should permit one universal VSIX if no native Air binary is bundled. Browser-host support is not currently implemented (`main` is present, `browser` is absent, and runtime imports Node subprocess APIs). Remote extension-host support and R notebook/Quarto behavior need explicit validation before being advertised.

### Phase 3: Register and Publish

For Microsoft, create or select the publisher in [publisher management](https://marketplace.visualstudio.com/manage). Ensure the manifest publisher matches. For a first release, upload the tested VSIX through the browser. This avoids requiring a CLI token for that upload. The CLI can instead publish an already built artifact with `vsce publish --packagePath <file>`. Optional verified-publisher status requires a qualifying domain, DNS verification, and the documented publisher/domain history; it is not required to publish. [Microsoft publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

For Open VSX, create/link the accounts, accept the Publisher Agreement, generate an access token, and create the namespace matching `publisher`. Publish the same VSIX using `ovsx publish <file>`. Supply the token through `OVSX_PAT`. Claim namespace ownership separately; creating it grants contributor access, not verified ownership. [Open VSX publishing](https://github.com/eclipse-openvsx/openvsx/wiki/Publishing-Extensions), [namespace ownership](https://github.com/eclipse-openvsx/openvsx/wiki/Namespace-Access)

After release preparation and credential setup, the command sequence should have this shape; these publication commands were not executed:

```sh
# From a clean release checkout with pinned local release tools:
npm ci
npm run compile
npm run test:unit
npm run sandbox:up
npm run sandbox:test
npx vsce ls --no-dependencies
npx vsce package --no-dependencies --out r-indent-release.vsix

# Test the artifact before either upload.
# Microsoft: upload in publisher management, or use configured CLI auth:
npx vsce publish --packagePath r-indent-release.vsix

# Open VSX: once per new namespace, with OVSX_PAT supplied securely:
npx ovsx create-namespace ColinConwell
npx ovsx publish r-indent-release.vsix
```

The test commands above require the repairs described earlier. A packaging step is not evidence of readiness by itself. Use the same version and artifact for both registries, and retain its checksum and release commit. Do not independently auto-increment versions during each upload.

### Phase 4: Automate Updates

Microsoft global Azure DevOps PATs stop working on **December 1, 2026**. The current guide still describes an interim token with **All accessible organizations → Marketplace: Manage**, but do not build a durable release process around it. [Microsoft retirement announcement](https://devblogs.microsoft.com/devops/retirement-of-global-personal-access-tokens-in-azure-devops/)

The current vsce repository documents GitHub Actions `--oidc` publishing with a Marketplace trusted-publishing policy and `id-token: write`. Confirm that the selected released CLI and your publisher settings expose this option before configuring it; the locally cached CLI is older. [vsce trusted publishing](https://github.com/microsoft/vscode-vsce#trusted-publishing)

Microsoft also documents an Entra/managed-identity route. That route needs an Azure identity, client/tenant/subscription information, federated credentials, a pipeline service connection, and Marketplace publisher membership for the identity. Use it if appropriate to your account setup; these Azure resources are not prerequisites for a manual browser upload. [Microsoft automated publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#secure-automated-publishing-to-visual-studio-marketplace)

Open VSX documents trusted publishing after a first active release and namespace ownership. Where enabled, register the GitHub repository, workflow filename, and preferably a protected environment; use `ovsx publish --trusted-publishing` with OIDC permission. Remove any `OVSX_PAT` from that job because a PAT takes precedence. Confirm availability in the registry's settings. [Open VSX trusted publishing](https://github.com/eclipse-openvsx/openvsx/wiki/Trusted-Publishing)

Use a release workflow that tests and builds once, uploads the tested artifact to each destination, records each upload's status, and supports retrying only a failed destination. Protect the release environment and keep ordinary pull-request tests without publishing credentials. Retain a GitHub release with the matching source tag and VSIX.

### Phase 5: Verify Distribution and Maintain It

Check metadata and README rendering on both registry pages. Search by exact extension ID in VS Code, Cursor, and Positron; install through each editor's default gallery and verify the installed version. Check publisher identity and namespace verification. Gallery ingestion may not be immediate, so successful Open VSX publication alone is not a completed cross-editor verification.

Test upgrading an existing installation as well as installing fresh. For a defective release, generally issue a higher-version corrective release and document it rather than deleting the extension. Track reproducible indentation examples in issues, maintain the compatibility matrix, and retest release credentials before their expiry or policy changes.

## Recommended Order of Work

1. Fix default editor behavior and the exact-output regression suite.
2. Repair clean builds, Linux package loading, CI, and integration activation.
3. Narrow or repair Air/AST; define trust and supported-environment behavior.
4. Complete marketplace presentation and the cross-editor test matrix.
5. Establish publisher accounts and verified Open VSX namespace ownership in parallel with engineering.
6. Publish one tested artifact to both registries and verify all three editors.

The engineering blockers, rather than missing marketplace paperwork, are currently the critical path.
