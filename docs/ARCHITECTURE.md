# Architecture and Compatibility Decisions

## Behavioral Contract

The original manual script is an executable indentation corpus, not an input to an automatic whole-document formatter. Its whitespace is preserved in `tests/fixtures/manual-original.R`. Headless tests simulate Enter at consecutive nonblank line endings and compare the exact expected next-line indentation. Focused fixtures cover the same scenarios plus defects and edge cases.

Deliberate behavior retained: vertical argument alignment, a further level after named argument `=`, immediate-opener hanging indentation, fixed operator-chain offsets, chain completion, and native empty-pair/multi-cursor/selection behavior. The settings namespace stays `rIndent` so existing preferences survive the package rename.

Deliberate changes: braces no longer behave as argument-list closing contexts; inline closes never move a statement; only matching standalone closes dedent; top-level `=` contributes one offset; tabs use display columns; the global typing command is no longer intercepted. Air/AST are explicit deprecated aliases rather than silently failing alternative engines.

## Modules

- `rLexer.ts` scans incomplete code with persistent quote/raw-string/backtick and bracket state. It emits positioned tokens without evaluating R.
- `indentationEngine.ts` resolves typed indentation decisions. Absolute alignment and continuation offsets are combined once. It imports no editor API and has no process/network access.
- `settings.ts` resolves configuration against each document and current editor options and normalizes widths.
- `extension.ts` adapts a scoped Enter command and closing-character provider to the engine. Subscriptions and output/status resources are disposed by the extension context.
- `debugUtils.ts` owns product-branded local logs, bounded records, and one-time migration notices.

## Performance

A WeakMap cache stores completed-line lexical states per document version. Document change events discard entries from the earliest changed line onward. A version mismatch without an event clears the cache conservatively. The cursor line is rescanned as a prefix, so suffix text cannot close a bracket before the cursor. Tests count document reads to catch accidental repeated full scans, and the benchmark reports cold latency separately from cached p95 latency.

This is a lightweight indentation lexer, not a full R parser. Malformed bracket structure and unfinished literal contents delegate to native editing. Unsupported unbraced control constructs are also delegated. Cache retention follows document reachability; no source text is copied to diagnostic logs.

## Test Environment

Use headless checks and the containerized browser editor only. The desktop launch harness was removed at Colin’s request after disruptive local editor behavior. Native-editor results from that harness are not release certification. See `AGENTS.md` and `TESTING.md`; do not reintroduce local editor launches.

## Installed Identity

Package ID: `ColinConwell.rstudio-indent`; display name and local output: **RStudio Indent**; developer: **Colin Conwell**. The VS Code host owns process permissions; no service, login item, subprocess, telemetry, or separate OS notification identity is installed. The original icon is packaged as the fallback for both theme appearances. Its original artwork provenance remains a release-owner check.

The old local prototype had a different extension ID and cannot be automatically upgraded by the editor under the new ID. Disable/uninstall it deliberately; do not silently remove other installed extensions. `rIndent.toggleEngine` remains a compatibility command that explains the consolidated engine.
