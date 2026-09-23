# Release Candidate Status

## Scope

Candidate: **RStudio Indent 0.2.0**, `ColinConwell.rstudio-indent`, by Colin Conwell. This document supersedes the pre-fix `RELEASE-READINESS-REVIEW.md`. Nothing has been published to a marketplace.

Development validation is limited to headless tests and the containerized browser editor. Colin reported disruptive behavior from desktop editor launches; the native test harness, its dependency, local-install automation, launch configuration, and desktop CI jobs were removed. Earlier native test results are not treated as release certification. Repository instructions prohibit restoring that testing method without a new instruction from Colin.

## Review Recommendations Addressed

| Area | Current Disposition |
|---|---|
| Manual expectations | Original R scripts unchanged; the manual script is preserved as a byte-for-byte fixture and replayed by exact assertions. |
| Block and closing-bracket defects | Stateful lexical/bracket handling; standalone closes use their own matched opener; inline calls retain indentation. |
| Argument and chain behavior | Preserve argument-column alignment, additive parameter indentation, hanging immediate-openers, and fixed chain offsets. |
| Strings and comments | Track escaped/multiline strings, raw strings, backticks, comments, and incomplete/mismatched structures. |
| Experimental engines | Air/AST implementations removed; legacy settings explicitly resolve to the supported rules engine, with a diagnostic notice. No subprocess executes. |
| Editor integration | Scoped Enter keybinding replaces global typing interception; native delegation covers selections, multiple cursors, empty pairs, and unsupported contexts. |
| Settings | Resolve against each document and current editor options; validate widths, respect tabs, and update the debug setting at its controlling scope. |
| Logging | Branded local output, structured events and timing, bounded 200-record history, one-time migration notice, and no document source/paths. |
| Packaging | Clean production-only build, exact-case import validation, strict package allowlist, source map/test/developer-file exclusion. |
| Tooling | Tracked lockfile, pinned tools/API typings/Node version, built-in test runner, consistent source formatting; no runtime npm dependencies. |
| CI | Headless/package/audit/performance jobs and Docker/Chromium browser tests on pushes, PRs, and manual dispatch; artifact upload without publication. |
| Identity and documentation | New package ID, Colin's contact information, changelog, behavioral limitations, competing-extension review, testing and publishing guides. |
| Browser test environment | Official version-pinned code-server image, installed VSIX, copied R examples, loopback-only port, no host source/credential mounts. |

## Verification Evidence

The release work includes exact headless regression tests, package import/content checks, an npm dependency audit, large-document benchmarks, and browser tests against the actual Linux-installed VSIX. Current results: **88 headless tests and 11 browser test results passed** (the browser total includes its parent suite and ten focused subtests). Clean Node 24 installation, formatting, TypeScript compilation, package checks, and the npm audit passed. The audit reported zero vulnerabilities. The GitHub-hosted workflow has not yet run. Rerun the documented commands before a release rather than relying on this snapshot.

The browser extension details showed the intended name, ID, version, packaged icon, README, and publisher metadata. The icon was visibly legible in light and dark themes. This establishes rendering, not artwork ownership or verified-publisher status.

The manual script's whitespace is the behavior contract, not an assertion of full RStudio parity. The browser suite checks actual keyboard behavior and saved-file contents; the pure suite adds lexer, tabs, configuration normalization, cache invalidation, and long-document regressions. Native OS/editor compatibility, every settings scope, IME, snippets, multi-cursor combinations, and third-party extension coexistence remain outside complete browser certification.

## Remaining Release-Owner Work

1. Review the candidate in the browser sandbox and accept the intended indentation behavior. Resolve any differences by adding exact fixtures before changing the original manual test.
2. Confirm rights/provenance for the retained R-derived icon and confirm the SPDX license interpretation for the existing GPL v3 text.
3. Commit the accepted source and lockfile, run the hosted CI workflow, and create the corresponding source tag. The workflow has been prepared locally; no successful remote Actions run is claimed.
4. Establish ownership/access for the Microsoft publisher and Open VSX namespace, both proposed as `ColinConwell`. Complete account and agreement steps and configure the appropriate authentication. A GitHub username/email is not publisher verification.
5. Prepare the final public README/changelog, build one accepted VSIX, and publish that identical artifact to both registries. Then check public listing metadata and downstream catalog visibility. No native-editor launch is required or directed by this development workflow.

The detailed account, authentication, versioning, and registry instructions are in [Publishing](PUBLISHING.md). Open VSX is the upstream publication target for Cursor/Positron distribution, with client-specific proxies/catalogs. The close alternative `bescoto.r-reindent` is documented in [Related Extensions](RELATED-EXTENSIONS.md); this extension makes no uniqueness or Posit-endorsement claim.
