# RStudio Indent

RStudio-style indentation while typing R in VS Code and compatible desktop editors. Developed by [Colin Conwell](https://github.com/ColinConwell), independently of Posit and the RStudio project.

Press Enter to align function arguments, indent parameter values, and continue operator chains. Standalone closing brackets align with their matching opener. RStudio Indent changes leading whitespace and newline insertion; it does not reformat an entire document, execute R, or call an external formatter.

```r
strtoi("5",
       base =
         10L,
       ok =
         TRUE)

mtcars |>
  filter(mpg > 20) |>
  select(mpg, cyl)

if (ready) {
  process(data)
  report(data)
}
```

## Installation

This is a release candidate, not yet a published marketplace listing. Build a VSIX or use the isolated browser sandbox below. In VS Code, Cursor, or Positron, run **Extensions: Install from VSIX…** and select `artifacts/rstudio-indent.vsix`.

The extension ID is now `ColinConwell.rstudio-indent`. If you previously installed the local `ColinConwell.vsc-r-indent` prototype, disable or uninstall that old extension to prevent both handling indentation. Existing `rIndent.*` preferences retain their names.

VS Code 1.95 or later is the minimum API target. R need not be installed to use indentation. Development testing uses the containerized browser editor and headless engine checks. The container exercises code-server's Node extension host; editor-specific Cursor/Positron compatibility is not certified by this workflow. This is not a browser-only extension for vscode.dev.

## Behavior

| Context | Result |
|---|---|
| `f(a,` | Align the next argument with the column after `(`. |
| `f(a =` | Add one indentation level to the argument alignment. |
| `long_function(` | Use one level after the opener when the first argument starts on a new line. |
| `x +`, `x \|>`, `x %>%` | Continue by one level; further chain steps retain that level. |
| Completed chain | Return to the chain's base indentation. |
| Open `{` block | Keep subsequent statements inside the block. |
| Standalone `)`, `]`, or `}` | Align to the matching opener's line indentation. |
| Closing a call within a statement | Preserve that statement's indentation. |
| Comments, strings, quoted names | Ignore their bracket/operator characters when interpreting structure. |

The original [manual script](tests/manual_indent_tests.R) is preserved byte-for-byte. Its consecutive nonblank lines are replayed in pure-engine tests, with additional browser tests using the same script. This makes the intended alignment a checked contract. Full parity with every RStudio editing case is not claimed.

Multi-cursor input, selected text, snippets, empty bracket pairs, and unsupported/ambiguous contexts retain native editor handling. Unbraced control flow is delegated to the editor. R Markdown and Quarto fenced chunks are not advertised as supported; the extension targets documents whose language ID is `r`.

## Settings

| Setting | Default | Purpose |
|---|---|---|
| `rIndent.enabled` | `true` | Enable Enter and closing-bracket indentation. |
| `rIndent.indentSize` | `2` | Additional indentation in columns; integer from 1–16. |
| `rIndent.alignFunctionArguments` | `true` | Align arguments after the opener; disable for one-level indentation. |
| `rIndent.enableDebugLogging` | `false` | Record decisions, locations, and timing in the local output channel. |
| `rIndent.showStatusBar` | `false` | Show enabled status; click to open logs. |

Editor `insertSpaces` and `tabSize` settings are respected. With tabs enabled, alignment uses tabs plus any required remainder spaces. Settings are resolved for each document, including language and workspace scopes.

Closing-bracket formatting uses the editor's on-type formatter API. Enable it for R:

```json
{
  "[r]": {
    "editor.formatOnType": true
  },
  "rIndent.indentSize": 2
}
```

Enter uses a narrowly scoped keybinding, independently of `formatOnType`. The extension does not register the global `type` command. Other extensions can still compete for Enter or on-type formatting; if behavior differs, test in a fresh profile and inspect keyboard shortcut troubleshooting.

### Legacy Engines

`rIndent.engine = "ast"` and `"air"` remain readable but now resolve to the supported rules engine. A one-time diagnostic explains this. `rIndent.airExecutablePath` is deprecated and unused. The experimental engines were consolidated because they could disagree with the manual contract or silently fail. Air remains useful as a separate formatter extension; RStudio Indent does not invoke it.

## Logs and Support

Run **RStudio Indent: Show Logs** or **RStudio Indent: Toggle Debug Logging**. Logs identify the selected rule, line/column, target indentation, and elapsed time. Activation and errors are logged even when detailed logging is off. The in-memory diagnostic history is bounded to 200 records.

No telemetry is sent. Document source, document paths, and executable settings are excluded from diagnostic records. Logs are local to the editor; inspect any attachments before sharing them.

Report issues at [GitHub Issues](https://github.com/ColinConwell/VSC-R-Indent/issues). Include a minimal R example with the cursor marked, the expected output, editor/OS versions, tab settings, and any relevant log records. Contact: [Colin Conwell](mailto:colinconwell@gmail.com); institutional address: [conwell@mit.edu](mailto:conwell@mit.edu).

## Development

Use the Node version in `.nvmrc` (Node 22+ required by release tools):

```sh
npm ci
npm test
npm run test:performance
npm run build:vsix
```

`npm test` performs a clean TypeScript build, exact unit tests, and package allowlist/import checks. Use the container below for editing tests. Desktop editor launchers and Electron-based test commands have been removed; development agents should not open local VS Code, Cursor, or Positron instances.

### Browser Test Editor

With Docker running:

```sh
npm ci
npm run sandbox:up
```

Open [the local test editor](http://127.0.0.1:8788/?folder=/home/coder/workspace). Open `manual_indent_tests.R` from Explorer, or use Quick Open. The extension is already installed; logs and the status bar are enabled. The editor contains editable copies of the two existing scripts. It does not mount your checkout, home directory, credentials, or Docker socket. R packages are not installed and these scripts are not automatically executed.

Run automated real-keyboard tests:

```sh
npx playwright install chromium
npm run sandbox:test
```

After code changes, rerun `npm run sandbox:up` and reload the browser to test the rebuilt VSIX. Stop and remove the sandbox with `npm run sandbox:down`. Local binding is intentional: this unauthenticated development editor must not be exposed to a network. Change the host port with `RSTUDIO_INDENT_PORT` if 8788 is occupied.

See [Testing](docs/TESTING.md), [Architecture](docs/ARCHITECTURE.md), [Related Extensions](docs/RELATED-EXTENSIONS.md), and [Publishing](docs/PUBLISHING.md) for details.

## License

GPL-3.0-only; see [LICENSE](LICENSE). The source for each release should be tagged alongside its VSIX. The existing R-inspired icon is retained from the prototype; artwork provenance must be confirmed before public publication. RStudio is a Posit product name; this extension is independently developed and does not imply endorsement.
