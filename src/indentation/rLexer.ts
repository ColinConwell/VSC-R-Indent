import { IndentationDocument, Position } from '../config/types';

export interface OpenBracket extends Position {
  text: string;
  statementLine: number;
}
export interface Token extends Position {
  text: string;
  kind: 'open' | 'close' | 'operator' | 'comma' | 'value' | 'semicolon';
  opener?: OpenBracket;
}
interface LexicalState {
  quote?: string;
  rawEnd?: string;
  escaped?: boolean;
}
export interface ScanState {
  lexical: LexicalState;
  brackets: OpenBracket[];
  tokens: Token[];
  /** Non-code characters replaced by spaces, preserving original columns. */
  code: string;
  comment: boolean;
  mismatched: boolean;
  statementLine: number;
  continuation: boolean;
}
const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
const OPERATORS =
  /^(?:%[^%\s]*%|<<-|->>|<-|->|\|>|&&|\|\||==|!=|<=|>=|:::{0,1}|[+*/^~:$@=<>!&|\-])/;
const initial = (): ScanState => ({
  lexical: {},
  brackets: [],
  tokens: [],
  code: '',
  comment: false,
  mismatched: false,
  statementLine: 0,
  continuation: false,
});

/** Scan incomplete R without executing it. State survives physical newlines. */
export function scanLine(text: string, line: number, previous: ScanState = initial()): ScanState {
  const lexical = { ...previous.lexical };
  const brackets = [...previous.brackets];
  const tokens: Token[] = [];
  const code = Array<string>(text.length).fill(' ');
  let comment = false;
  let mismatched = previous.mismatched;
  let statementLine = previous.statementLine;
  if (!brackets.length && !lexical.quote && !lexical.rawEnd && !previous.continuation)
    statementLine = line;
  if (line === 0) statementLine = 0;
  const token = (kind: Token['kind'], value: string, character: number, opener?: OpenBracket) => {
    tokens.push({ kind, text: value, line, character, opener });
  };
  for (let i = 0; i < text.length; ) {
    if (lexical.rawEnd) {
      if (text.startsWith(lexical.rawEnd, i)) {
        i += lexical.rawEnd.length;
        lexical.rawEnd = undefined;
      } else i++;
      continue;
    }
    if (lexical.quote) {
      const ch = text[i++];
      if (lexical.escaped) lexical.escaped = false;
      else if (ch === '\\') lexical.escaped = true;
      else if (ch === lexical.quote) lexical.quote = undefined;
      continue;
    }
    const ch = text[i];
    if (ch === '#') {
      comment = true;
      break;
    }
    const raw = /^[rR]"(-*)([([{])/.exec(text.slice(i));
    if (raw && (i === 0 || !/[\w.]/.test(text[i - 1]))) {
      lexical.rawEnd = ({ '(': ')', '[': ']', '{': '}' }[raw[2]] || ')') + raw[1] + '"';
      token('value', '<literal>', i);
      i += raw[0].length;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      lexical.quote = ch;
      token('value', ch === '`' ? '<identifier>' : '<literal>', i++);
      continue;
    }
    code[i] = ch;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if ('([{'.includes(ch)) {
      const opener = { text: ch, line, character: i, statementLine };
      brackets.push(opener);
      token('open', ch, i++);
      continue;
    }
    if (')]}'.includes(ch)) {
      const opener = brackets.at(-1);
      if (opener?.text === PAIRS[ch]) brackets.pop();
      else mismatched = true;
      token('close', ch, i++, opener?.text === PAIRS[ch] ? opener : undefined);
      continue;
    }
    if (ch === ',' || ch === ';') {
      token(ch === ',' ? 'comma' : 'semicolon', ch, i++);
      if (ch === ';') statementLine = line;
      continue;
    }
    const operator = OPERATORS.exec(text.slice(i))?.[0];
    if (operator) {
      for (let j = 0; j < operator.length; j++) code[i + j] = operator[j];
      token('operator', operator, i);
      i += operator.length;
      continue;
    }
    const value = /^[\p{L}\p{N}_.]+/u.exec(text.slice(i))?.[0] || ch;
    for (let j = 0; j < value.length; j++) code[i + j] = value[j];
    token('value', value, i);
    i += value.length;
  }
  // A backslash followed by a physical newline consumes that newline.
  lexical.escaped = false;
  return {
    lexical,
    brackets,
    tokens,
    code: code.join(''),
    comment,
    mismatched,
    statementLine,
    continuation: tokens.length ? tokens.at(-1)?.kind === 'operator' : previous.continuation,
  };
}

/** Versioned prefix cache. Editor change events invalidate from the first changed line. */
export class DocumentScanner {
  private cache = new WeakMap<IndentationDocument, { version?: number; lines: ScanState[] }>();
  invalidate(document: IndentationDocument, fromLine: number): void {
    const cached = this.cache.get(document);
    if (cached) {
      cached.lines.length = Math.min(cached.lines.length, fromLine);
      cached.version = document.version;
    }
  }
  at(document: IndentationDocument, position: Position): ScanState {
    let entry = this.cache.get(document);
    if (!entry || document.version === undefined || entry.version !== document.version) {
      entry = { version: document.version, lines: [] };
      this.cache.set(document, entry);
    }
    for (let line = entry.lines.length; line < position.line; line++) {
      entry.lines.push(scanLine(document.lineAt(line).text, line, entry.lines[line - 1]));
    }
    return scanLine(
      document.lineAt(position.line).text.slice(0, position.character),
      position.line,
      entry.lines[position.line - 1],
    );
  }
  line(document: IndentationDocument, line: number): ScanState {
    return this.at(document, { line, character: document.lineAt(line).text.length });
  }
}
export function visualWidth(text: string, tabSize: number): number {
  let column = 0;
  for (const ch of text) column += ch === '\t' ? tabSize - (column % tabSize) : 1;
  return column;
}
export function whitespace(columns: number, insertSpaces: boolean, tabSize: number): string {
  return insertSpaces
    ? ' '.repeat(columns)
    : '\t'.repeat(Math.floor(columns / tabSize)) + ' '.repeat(columns % tabSize);
}
