import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.languages.registerOnTypeFormattingEditProvider(
    { language: 'r', scheme: 'file' },
    {
      provideOnTypeFormattingEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        ch: string,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
      ): vscode.TextEdit[] {
        const edits: vscode.TextEdit[] = [];

        const currentLine = document.lineAt(position.line);
        const currentText = currentLine.text;

        // Align continuation lines when pressing Enter
        if (ch === '\n') {
          const prevLineIndex = Math.max(0, position.line - 1);
          const prevText = document.lineAt(prevLineIndex).text;
          const codePart = extractCodePart(prevText);

          const cfg = getConfig();

          // 1) Pipe continuation: magrittr %>% (and variants) or base R |>
          if (/\%[^%]*\>%\s*$/.test(codePart) || /\|>\s*$/.test(codePart)) {
            let targetIndent = prevText.match(/^\s*/)?.[0] ?? '';
            if (cfg.afterPipe === 'indentOneUnit') {
              const unit = continuationIndent(options);
              targetIndent = targetIndent + unit.repeat(Math.max(0, cfg.pipeIndentUnits));
            } else if (cfg.afterPipe === 'alignToNextToken') {
              // keep same indent; caller may type next token
            } else if (cfg.afterPipe === 'none') {
              // no change
            }

            const currentIndent = currentText.match(/^\s*/)?.[0] ?? '';
            if (currentIndent !== targetIndent) {
              const range = new vscode.Range(
                new vscode.Position(position.line, 0),
                new vscode.Position(position.line, currentIndent.length)
              );
              edits.push(vscode.TextEdit.replace(range, targetIndent));
            }
            return edits;
          }

          // 2) Function-call alignment (only when splitting an argument): align under first argument
          const match = cfg.enableParenAlign ? findUnmatchedOpeningParen(document, prevLineIndex) : null;
          const endsWithComma = /,\s*$/.test(codePart);
          if (match && endsWithComma && (!cfg.parenAlignOnlyAfterComma || endsWithComma)) {
            const { line: openLineIndex, column: openColIndex } = match;
            const openLineText = document.lineAt(openLineIndex).text;

            const baseIndent = openLineText.match(/^\s*/)?.[0] ?? '';
            const desiredColumn = computeFirstArgColumn(openLineText, openColIndex);

            // Preserve base indent characters; add continuation indent sized to reach desired column
            const baseIndentLength = baseIndent.length;
            const extraColumns = Math.max(0, desiredColumn - baseIndentLength);
            const extra = options.insertSpaces
              ? ' '.repeat(extraColumns)
              : '\t'.repeat(Math.max(1, Math.ceil(extraColumns / Math.max(1, options.tabSize))))
            ;
            const targetIndent = baseIndent + extra;

            const currentIndent = currentText.match(/^\s*/)?.[0] ?? '';
            if (currentIndent !== targetIndent) {
              const range = new vscode.Range(
                new vscode.Position(position.line, 0),
                new vscode.Position(position.line, currentIndent.length)
              );
              edits.push(vscode.TextEdit.replace(range, targetIndent));
            }
            return edits;
          }
        }

        // Simple dedent when typing a closing brace/parens/bracket
        if (/[\}\)\]]/.test(ch)) {
          const openingPairs: Record<string, string> = { '}': '{', ')': '(', ']': '[' };
          const opening = openingPairs[ch];
          let balance = 0;
          for (let i = position.line; i >= 0; i -= 1) {
            const lineText = document.lineAt(i).text;
            for (let j = lineText.length - 1; j >= 0; j -= 1) {
              const c = lineText[j];
              if (c === ch) balance += 1;
              if (c === opening) balance -= 1;
              if (balance < 0) {
                const matchIndent = lineText.match(/^\s*/);
                const targetIndent = matchIndent ? matchIndent[0] : '';
                const currentIndent = currentText.match(/^\s*/)?.[0] ?? '';
                if (targetIndent.length < currentIndent.length) {
                  const range = new vscode.Range(
                    new vscode.Position(position.line, 0),
                    new vscode.Position(position.line, currentIndent.length)
                  );
                  edits.push(vscode.TextEdit.replace(range, targetIndent));
                }
                return edits;
              }
            }
          }
        }

        return edits;
      },
    },
    '}', ')', ']', '\n'
  );

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // no-op
}

function continuationIndent(options: vscode.FormattingOptions): string {
  if (options.insertSpaces) return ' '.repeat(Math.max(1, options.tabSize));
  return '\t';
}

type Config = {
  afterPipe: 'indentOneUnit' | 'alignToNextToken' | 'none';
  pipeIndentUnits: number;
  enableParenAlign: boolean;
  parenAlignOnlyAfterComma: boolean;
};

function getConfig(): Config {
  const c = vscode.workspace.getConfiguration('rIndent');
  return {
    afterPipe: c.get('afterPipe', 'indentOneUnit'),
    pipeIndentUnits: c.get('pipeIndentUnits', 1),
    enableParenAlign: c.get('enableParenAlign', true),
    parenAlignOnlyAfterComma: c.get('parenAlignOnlyAfterComma', true),
  };
}

// Determine the alignment column for lines inside parentheses.
// Prefer the start column of the first argument following '(' on the same line; if none, use one char after '('.
function computeFirstArgColumn(lineText: string, openParenCol: number): number {
  // Respect comments; stop scanning at first # outside quotes
  let inSingle = false;
  let inDouble = false;
  let stopAt = lineText.length;
  for (let i = 0; i < lineText.length; i += 1) {
    const c = lineText[i];
    const prev = i > 0 ? lineText[i - 1] : '';
    if (!inDouble && c === "'" && prev !== '\\') inSingle = !inSingle;
    else if (!inSingle && c === '"' && prev !== '\\') inDouble = !inDouble;
    else if (!inSingle && !inDouble && c === '#') { stopAt = i; break; }
  }

  // Find first non-whitespace token after '('
  for (let i = openParenCol + 1; i < stopAt; i += 1) {
    const c = lineText[i];
    if (c === ' ' || c === '\t') continue;
    // If we immediately see a closing paren, fall back to just after '('
    if (c === ')') return openParenCol + 1;
    return i; // column where first argument begins
  }
  return openParenCol + 1;
}

function extractCodePart(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    const prev = i > 0 ? line[i - 1] : '';
    if (!inDouble && c === "'" && prev !== '\\') inSingle = !inSingle;
    else if (!inSingle && c === '"' && prev !== '\\') inDouble = !inDouble;
    else if (!inSingle && !inDouble && c === '#') return line.slice(0, i);
  }
  return line;
}

function findUnmatchedOpeningParen(
  document: vscode.TextDocument,
  startLineIndex: number
): { line: number; column: number } | null {
  let depth = 0; // counts ')' seen minus '(' seen when scanning left-to-right

  for (let i = startLineIndex; i >= 0; i -= 1) {
    const rawLine = document.lineAt(i).text;

    // Process the line left-to-right to respect quotes and comments
    let inSingle = false;
    let inDouble = false;
    const positions: { ch: '(' | ')'; col: number }[] = [];

    const stopAt = (() => {
      // stop at first unescaped '#' when not in quotes
      for (let idx = 0; idx < rawLine.length; idx += 1) {
        const c = rawLine[idx];
        const prev = idx > 0 ? rawLine[idx - 1] : '';
        if (!inSingle && !inDouble && c === '#') return idx; // comment begins
        if (c === "'" && !inDouble && prev !== '\\') inSingle = !inSingle;
        else if (c === '"' && !inSingle && prev !== '\\') inDouble = !inDouble;
      }
      // if no comment, entire line participates
      return rawLine.length;
    })();

    inSingle = false;
    inDouble = false;
    for (let col = 0; col < stopAt; col += 1) {
      const c = rawLine[col];
      const prev = col > 0 ? rawLine[col - 1] : '';
      if (c === "'" && !inDouble && prev !== '\\') {
        inSingle = !inSingle;
        continue;
      }
      if (c === '"' && !inSingle && prev !== '\\') {
        inDouble = !inDouble;
        continue;
      }
      if (inSingle || inDouble) continue;
      if (c === '(') positions.push({ ch: '(', col });
      else if (c === ')') positions.push({ ch: ')', col });
    }

    for (let k = positions.length - 1; k >= 0; k -= 1) {
      const p = positions[k];
      if (p.ch === ')') depth += 1;
      else if (p.ch === '(') {
        if (depth === 0) return { line: i, column: p.col };
        depth -= 1;
      }
    }
  }
  return null;
}


