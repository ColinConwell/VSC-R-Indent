import { IndentationDocument, Position, RIndentConfig, IndentDecision } from '../config/types';
import { normalizeConfig } from '../config/defaults';
import { DocumentScanner, OpenBracket, visualWidth, whitespace } from './rLexer';

/** One supported, incomplete-code-aware rules engine. It never executes R or a formatter. */
export class IndentationEngine {
  private scanner = new DocumentScanner();
  private lastDecision: IndentDecision = { indent: null, rule: 'native', columns: null };
  invalidate(document: IndentationDocument, fromLine: number): void {
    this.scanner.invalidate(document, fromLine);
  }
  getLastDecision(): IndentDecision {
    return { ...this.lastDecision };
  }
  getLastAppliedRule(): string {
    return this.lastDecision.rule;
  }
  private result(columns: number | null, rule: string, config: RIndentConfig): string | null {
    const indent =
      columns === null
        ? null
        : whitespace(Math.max(0, columns), config.insertSpaces, config.tabSize);
    this.lastDecision = { indent, rule, columns };
    return indent;
  }
  private base(document: IndentationDocument, line: number, config: RIndentConfig): number {
    return visualWidth(document.lineAt(line).text.match(/^[\t ]*/)?.[0] || '', config.tabSize);
  }
  private argumentBase(
    document: IndentationDocument,
    opener: OpenBracket,
    config: RIndentConfig,
    position: Position,
  ): number {
    const start =
      opener.line === position.line
        ? this.scanner.at(document, position)
        : this.scanner.line(document, opener.line);
    const hasArgument = start.tokens.some((t) => t.character > opener.character);
    return config.alignFunctionArguments && hasArgument
      ? visualWidth(
          document.lineAt(opener.line).text.slice(0, opener.character + 1),
          config.tabSize,
        )
      : this.base(document, opener.line, config) + config.indentSize;
  }
  calculateEnterIndentation(
    document: IndentationDocument,
    position: Position,
    input: Partial<RIndentConfig> = {},
  ): string | null {
    const config = normalizeConfig(input);
    const done = (n: number | null, rule: string) => this.result(n, rule, config);
    if (!config.enabled) return done(null, 'disabled');
    const state = this.scanner.at(document, position);
    if (state.lexical.quote || state.lexical.rawEnd) return done(null, 'literal:preserve');
    if (state.mismatched) return done(null, 'mismatched:delegate');
    const lineText = document.lineAt(position.line).text;
    const opener = state.brackets.at(-1);
    const last = state.tokens.at(-1);
    const next = lineText.slice(position.character).trimStart()[0];
    if (
      opener &&
      ({ ')': '(', ']': '[', '}': '{' } as Record<string, string>)[next] === opener.text
    ) {
      return done(this.base(document, opener.line, config), 'before-close');
    }
    const operator = last?.kind === 'operator';
    if (opener && opener.text !== '{') {
      const base = this.argumentBase(document, opener, config, position);
      return done(
        base + (operator ? config.indentSize : 0),
        operator ? 'argument:continuation' : 'argument:alignment',
      );
    }
    const blockBase = opener ? this.base(document, opener.line, config) + config.indentSize : null;
    // statementLine tracks a whole chain even through multiline calls and comment-only lines.
    const statementBase = Math.max(
      blockBase ?? 0,
      this.base(document, state.statementLine, config),
    );
    if (operator) return done(statementBase + config.indentSize, 'operator:continuation');
    if (state.comment && !last) {
      // Keep the continuation after comments between chain steps; standalone comments retain their indent.
      for (let line = position.line - 1; line >= state.statementLine; line--) {
        const prior = this.scanner.line(document, line);
        const token = prior.tokens.at(-1);
        if (token)
          return done(
            token.kind === 'operator'
              ? statementBase + config.indentSize
              : (blockBase ?? this.base(document, position.line, config)),
            'comment:context',
          );
      }
    }
    // Let the editor handle unbraced control headers, including inside another block.
    if (
      /^\s*(?:if|for|while|else|repeat|function)\b/.test(state.code) &&
      last?.text !== '}' &&
      last?.text !== '{'
    )
      return done(null, 'control:delegate');
    if (blockBase !== null) return done(blockBase, 'block:body');
    if (last?.kind === 'close' && last.opener) {
      return done(
        this.base(document, Math.min(state.statementLine, last.opener.statementLine), config),
        'expression:complete',
      );
    }
    return done(statementBase, 'statement:base');
  }
  calculateTypeIndentation(
    document: IndentationDocument,
    position: Position,
    character: string,
    input: Partial<RIndentConfig> = {},
  ): string | null {
    const config = normalizeConfig(input);
    const done = (n: number | null, rule: string) => this.result(n, rule, config);
    if (!config.enabled || !/^[)\]}]$/.test(character)) return done(null, 'disabled-or-unhandled');
    // Only a standalone closing sequence can change leading whitespace. Never move an inline call.
    const prefix = document.lineAt(position.line).text.slice(0, position.character);
    if (!/^[\t ]*[)\]}]+$/.test(prefix) || !prefix.endsWith(character))
      return done(null, 'inline-close:preserve');
    const state = this.scanner.at(document, position);
    const closing = state.tokens.at(-1);
    if (
      state.mismatched ||
      state.lexical.quote ||
      state.lexical.rawEnd ||
      closing?.kind !== 'close' ||
      !closing.opener
    )
      return done(null, 'unmatched-close:delegate');
    return done(this.base(document, closing.opener.line, config), 'close:matching-opener');
  }
}
