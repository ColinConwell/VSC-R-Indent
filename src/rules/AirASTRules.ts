import * as vscode from 'vscode';
import { BaseRule } from './BaseRule.js';
import { IndentationContext, RIndentConfig } from '../config/types.js';
import { RASTParser } from '../indentation/rASTParser.js';

/**
 * AIR-AST rule: emulate Air-style base alignment using a lightweight AST.
 * This rule provides an alignment base from innermost Call/Bracket/Block.
 */
export class AirAstAlignmentRule extends BaseRule {
  constructor() {
    super('AirAstAlignment', 95);
  }

  public applies(context: IndentationContext, config: RIndentConfig): boolean {
    if (!context.isEnterKey) return false;
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;
    // Avoid applying on lines that are empty continuation without structure
    return true;
  }

  public getIndentation(context: IndentationContext, config: RIndentConfig): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    const document = editor.document;

    // Parse a small window around the cursor
    const start = Math.max(0, context.line - 50);
    const end = Math.min(document.lineCount - 1, context.line + 5);
    const lines: string[] = [];
    for (let i = start; i <= end; i++) lines.push(document.lineAt(i).text);
    const ast = RASTParser.parseWindow(lines, start);

    // Find innermost node at current position
    const stack = ast.stackAt(context.line, Math.max(0, context.column - 1));
    // Prefer Call > Bracket > Block for alignment
    let baseCol = 0;
    let anchor: { line: number; col: number; kind: 'call'|'bracket'|'block' } | null = null;
    for (let i = stack.length - 1; i >= 0; i--) {
      const n = stack[i];
      if (n.type === 'Call') { baseCol = n.startCol + 1; anchor = { line: n.startLine, col: n.startCol, kind: 'call' }; break; }
      if (n.type === 'Bracket') { baseCol = n.startCol + 1; anchor = { line: n.startLine, col: n.startCol, kind: 'bracket' }; break; }
      if (n.type === 'Block') { baseCol = (document.lineAt(n.startLine).text.match(/^\s*/)?.[0]?.length || 0) + config.indentSize; anchor = { line: n.startLine, col: n.startCol, kind: 'block' }; break; }
    }

    // Immediate newline after opening bracket/call: prefer base indent + indentSize (RStudio style)
    if (anchor && (anchor.kind === 'call' || anchor.kind === 'bracket')) {
      // If same line: only whitespace between '(' and cursor
      if (anchor.line === context.line) {
        const seg = document.lineAt(anchor.line).text.substring(anchor.col + 1, context.column);
        if (/^\s*$/.test(seg)) {
          const baseIndent = document.lineAt(anchor.line).text.match(/^\s*/)?.[0] || '';
          return baseIndent + ' '.repeat(config.indentSize);
        }
      } else if (anchor.line < context.line) {
        // Across lines: ensure only whitespace between anchor and current line
        const afterAnchor = document.lineAt(anchor.line).text.substring(anchor.col + 1);
        if (/^\s*$/.test(afterAnchor)) {
          let onlyWhitespace = true;
          for (let ln = anchor.line + 1; ln < context.line; ln++) {
            if (document.lineAt(ln).text.trim().length > 0) { onlyWhitespace = false; break; }
          }
          if (onlyWhitespace && document.lineAt(context.line).text.substring(0, context.column).trim().length === 0) {
            const baseIndent = document.lineAt(anchor.line).text.match(/^\s*/)?.[0] || '';
            return baseIndent + ' '.repeat(config.indentSize);
          }
        }
      }
    }

    // Fallback 1: if no structure found, align to nearest '(' '[' '{' on current line
    if (baseCol === 0) {
      const cur = document.lineAt(context.line).text.substring(0, context.column);
      const idx = Math.max(cur.lastIndexOf('('), cur.lastIndexOf('['), cur.lastIndexOf('{'));
      if (idx >= 0) {
        return ' '.repeat(idx + 1);
      }
    }

    // Fallback 2: if no structure found but line (or previous) ends with operator, indent +indentSize
    if (baseCol === 0) {
      const curUpTo = document.lineAt(context.line).text.substring(0, context.column).trimEnd();
      const prev = context.line > 0 ? document.lineAt(context.line - 1).text.trimEnd() : '';
      const cont = /(%>%|\|>|\+|-|\*|\/|=|<-|->|\|\||&&|[<>]=?|[!=]=)\s*$/.test(curUpTo) || /(%>%|\|>|\+|-|\*|\/|=|<-|->|\|\||&&|[<>]=?|[!=]=)\s*$/.test(prev);
      if (cont) {
        const base = (context.line > 0 ? document.lineAt(context.line - 1).text : document.lineAt(context.line).text).match(/^\s*/)?.[0] || '';
        return base + ' '.repeat(config.indentSize);
      }
    }

    if (baseCol > 0) return ' '.repeat(baseCol);
    return '';
  }
}

/**
 * AIR-AST continuation: provide +indentSize for top-level operator continuations outside calls.
 */
export class AirAstContinuationRule extends BaseRule {
  constructor() {
    super('AirAstContinuation', 94);
  }

  public applies(context: IndentationContext, config: RIndentConfig): boolean {
    return context.isEnterKey && (!!vscode.window.activeTextEditor);
  }

  public getIndentation(context: IndentationContext, config: RIndentConfig): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    const document = editor.document;
    if (context.line <= 0) return null;
    const prevLineFull = document.lineAt(context.line - 1).text;
    const prevLineText = prevLineFull.trimEnd();

    // Quick check: ends with operator
    const endsWithOp = /(%>%|\|>|\+|-|\*|\/|=|<-|->|\|\||&&|[<>]=?|[!=]=)\s*$/.test(prevLineText);
    if (!endsWithOp) return null;

    // AST-aware: only apply continuation if operator is at top-level (outside parens/brackets)
    const start = Math.max(0, context.line - 50);
    const end = context.line; // include prev line
    const lines: string[] = [];
    for (let i = start; i <= end; i++) lines.push(document.lineAt(i).text);
    const ast = RASTParser.parseWindow(lines, start);
    const prevLine = context.line - 1;
    const prevDepthNodes = ast.stackAt(prevLine, Math.max(0, prevLineFull.length - 1));
    const depth = prevDepthNodes.length > 0 ? prevDepthNodes[prevDepthNodes.length - 1].depth ?? 0 : 0;
    if (depth > 0) return null; // nested, do not continuation indent

    const baseIndent = (document.lineAt(prevLine).text.match(/^\s*/)?.[0] || '');
    return baseIndent + ' '.repeat(config.indentSize);
  }
}

/**
 * AIR-AST parameter indent: when previous token is a single '=' inside a Call argument list,
 * add +indentSize relative to base alignment.
 */
export class AirAstParameterRule extends BaseRule {
  constructor() { super('AirAstParameter', 96); }

  public applies(context: IndentationContext, config: RIndentConfig): boolean {
    if (!context.isEnterKey) return false;
    const editor = vscode.window.activeTextEditor; if (!editor) return false;
    const prev = editor.document.lineAt(context.line).text.substring(0, context.column).trimEnd();
    // Must end with single '=' not part of ==, !=, <=, >=
    if (/(==|!=|<=|>=)\s*$/.test(prev)) return false;
    if (!/=\s*$/.test(prev)) return false;
    // Ensure we are inside a Call argument list
    const start = Math.max(0, context.line - 50);
    const end = Math.min(editor.document.lineCount - 1, context.line + 2);
    const lines: string[] = [];
    for (let i = start; i <= end; i++) lines.push(editor.document.lineAt(i).text);
    const ast = RASTParser.parseWindow(lines, start);
    const stack = ast.stackAt(context.line, Math.max(0, context.column - 1));
    return stack.some(n => n.type === 'Call' || (n.type === 'Bracket' && n.isArgumentList));
  }

  public getIndentation(context: IndentationContext, config: RIndentConfig): string | null {
    const editor = vscode.window.activeTextEditor; if (!editor) return null;
    const base = editor.document.lineAt(context.line).text.match(/^\s*/)?.[0] || '';
    return base + ' '.repeat(config.indentSize);
  }
}

/**
 * AIR-AST comma alignment: after a comma inside an argument list, align to call base.
 */
export class AirAstCommaAlignRule extends BaseRule {
  constructor() { super('AirAstCommaAlign', 97); }

  public applies(context: IndentationContext, config: RIndentConfig): boolean {
    if (!context.isEnterKey) return false;
    const editor = vscode.window.activeTextEditor; if (!editor) return false;
    const curRaw = editor.document.lineAt(context.line).text.substring(0, context.column);
    const withoutComment = curRaw.split('#')[0];
    const curTo = withoutComment.trimEnd();
    if (!/,\s*$/.test(curTo)) return false;
    // Must be within argument list
    const start = Math.max(0, context.line - 50);
    const end = Math.min(editor.document.lineCount - 1, context.line + 1);
    const lines: string[] = [];
    for (let i = start; i <= end; i++) lines.push(editor.document.lineAt(i).text);
    const ast = RASTParser.parseWindow(lines, start);
    const stack = ast.stackAt(context.line, Math.max(0, context.column - 1));
    return stack.some(n => n.type === 'Call' || (n.type === 'Bracket' && n.isArgumentList));
  }

  public getIndentation(context: IndentationContext, config: RIndentConfig): string | null {
    const editor = vscode.window.activeTextEditor; if (!editor) return null;
    const document = editor.document;
    const start = Math.max(0, context.line - 50);
    const end = Math.min(document.lineCount - 1, context.line + 1);
    const lines: string[] = [];
    for (let i = start; i <= end; i++) lines.push(document.lineAt(i).text);
    const ast = RASTParser.parseWindow(lines, start);
    const stack = ast.stackAt(context.line, Math.max(0, context.column - 1));
    for (let i = stack.length - 1; i >= 0; i--) {
      const n = stack[i];
      if (n.type === 'Call' || (n.type === 'Bracket' && n.isArgumentList)) {
        return ' '.repeat(n.startCol + 1);
      }
    }
    return null;
  }
}

/**
 * AIR-AST line-start operator continuation: if current line starts with an operator
 * and operator is top-level, indent by +indentSize relative to previous base.
 */
export class AirAstLineStartOpRule extends BaseRule {
  constructor() { super('AirAstLineStartOp', 93); }

  public applies(context: IndentationContext, config: RIndentConfig): boolean {
    if (!context.isEnterKey) return false;
    const editor = vscode.window.activeTextEditor; if (!editor) return false;
    const cur = editor.document.lineAt(context.line).text.substring(0, context.column);
    return /^\s*(%>%|\|>|\+|-|\*|\/|=|<-|->|\|\||&&|[<>]=?|[!=]=)/.test(cur);
  }

  public getIndentation(context: IndentationContext, config: RIndentConfig): string | null {
    const editor = vscode.window.activeTextEditor; if (!editor) return null;
    const document = editor.document;
    const prevLine = Math.max(0, context.line - 1);
    const start = Math.max(0, context.line - 50);
    const end = context.line;
    const lines: string[] = [];
    for (let i = start; i <= end; i++) lines.push(document.lineAt(i).text);
    const ast = RASTParser.parseWindow(lines, start);
    const prevNodes = ast.stackAt(prevLine, Math.max(0, document.lineAt(prevLine).text.length - 1));
    const depth = prevNodes.length > 0 ? prevNodes[prevNodes.length - 1].depth ?? 0 : 0;
    if (depth > 0) return null;
    const baseIndent = (document.lineAt(prevLine).text.match(/^\s*/)?.[0] || '');
    return baseIndent + ' '.repeat(config.indentSize);
  }
}


