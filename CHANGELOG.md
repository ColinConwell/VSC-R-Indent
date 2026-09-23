# Changelog

## 0.2.0 — Release Candidate

- Rename the extension to `ColinConwell.rstudio-indent`, with Colin Conwell's author metadata.
- Preserve the manual script's aligned arguments, additive parameter indentation, and fixed-width chains with exact regression cases.
- Correct block continuation, matching closing brackets, inline-call preservation, tabs, comments, quoted identifiers, raw strings, and multiline literals.
- Consolidate experimental Air/AST modes into the supported rules engine; existing engine settings remain deprecated aliases. No subprocess is executed.
- Replace global typing interception with a scoped Enter command, preserving native multi-cursor, selection, snippet, and empty-pair behavior.
- Add bounded local structured diagnostics, deterministic builds, package checks, CI, and an isolated browser editor sandbox.

## 0.1.0 — Local Development

Initial unpublished R Indent prototype, including rules, AST, and Air experiments.
