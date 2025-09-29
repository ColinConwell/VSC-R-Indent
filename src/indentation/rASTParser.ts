/**
 * Lightweight AST-like parser interfaces for indentation decisions.
 * This is a scaffolding that can be extended to more complete parsing.
 */

export type RNodeType = 'Program' | 'Call' | 'ArgumentList' | 'BinaryOp' | 'Block' | 'Bracket' | 'Literal' | 'Identifier' | 'Comma' | 'Unknown';

export interface RNode {
  type: RNodeType;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  name?: string; // for calls/identifiers
  operator?: string; // for BinaryOp
  isArgumentList?: boolean; // when inside call parentheses
  depth?: number; // nesting depth
  children: RNode[];
}

export interface ParseContext {
  root: RNode;
  // nodes stacked at cursor line
  stackAt(line: number, col: number): RNode[];
}

export class RASTParser {
  /**
   * Parse a small window of code and produce a coarse node tree sufficient
   * for deciding indentation base and continuation.
   */
  static parseWindow(lines: string[], startLine: number): ParseContext {
    // Minimal structure: find calls by "name(" and corresponding bracket spans,
    // blocks { }, and simple binary ops at end of lines.
    const root: RNode = { type: 'Program', startLine, startCol: 0, endLine: startLine + lines.length - 1, endCol: (lines[lines.length-1]||'').length, children: [] };

    // Simple bracket/call detection (string/comment naive for now; improve later)
    const openStack: Array<{ type: 'Bracket'|'Call'|'Block'; name?: string; line: number; col: number; node: RNode } > = [];

    const pushChild = (parent: RNode, node: RNode) => { parent.children.push(node); };

    // Track simple string/comment state across the window
    let inString = false;
    let stringChar = '';
    let inComment = false;

    for (let i = 0; i < lines.length; i++) {
      const lineNo = startLine + i;
      const text = lines[i];
      inComment = false;
      // Detect call names followed by (
      const callRegex = /(\b[\w.]+)\s*\(/g;
      let m: RegExpExecArray | null;
      if (!inString && !inComment) {
        while ((m = callRegex.exec(text)) !== null) {
        // Ignore matches inside a string/comment segment
        const idx = m.index;
        if (isInStringOrComment(text, idx)) continue;
        const name = m[1];
        const col = (m.index + name.length);
          const node: RNode = { type: 'Call', name, startLine: lineNo, startCol: col, endLine: lineNo, endCol: col+1, isArgumentList: true, depth: openStack.length, children: [] };
        pushChild(root, node);
        openStack.push({ type: 'Call', name, line: lineNo, col, node });
        }
      }

      // Brackets and blocks
      for (let c = 0; c < text.length; c++) {
        const ch = text[c];
        // String handling (support simple ' and ")
        if (!inComment && (ch === '"' || ch === '\'')) {
          if (!inString) { inString = true; stringChar = ch; }
          else if (ch === stringChar) {
            // check for escape
            let esc = 0; for (let k = c - 1; k >= 0 && text[k] === '\\'; k--) esc++;
            if (esc % 2 === 0) { inString = false; stringChar = ''; }
          }
          continue;
        }
        if (inString) continue;
        if (ch === '#') { inComment = true; break; }
        if (ch === '(' || ch === '[' || ch === '{') {
          const node: RNode = { type: ch === '{' ? 'Block' : 'Bracket', startLine: lineNo, startCol: c, endLine: lineNo, endCol: c, isArgumentList: (ch==='('), depth: openStack.length, children: [] };
          pushChild(root, node);
          openStack.push({ type: ch === '{' ? 'Block':'Bracket', line: lineNo, col: c, node });
        } else if (ch === ')' || ch === ']' || ch === '}') {
          // close last open
          for (let k = openStack.length - 1; k >= 0; k--) {
            const top = openStack[k];
            const matching = (top.type === 'Bracket' && (ch === ')' || ch === ']')) || (top.type === 'Block' && ch === '}') || (top.type === 'Call' && ch === ')');
            if (matching) {
              top.node.endLine = lineNo;
              top.node.endCol = c;
              openStack.splice(k,1);
              break;
            }
          }
        } else if (ch === ',') {
          // Comma inside argument list
          const top = openStack[openStack.length - 1];
          if (top && (top.type === 'Call' || top.type === 'Bracket')) {
            const node: RNode = { type: 'Comma', startLine: lineNo, startCol: c, endLine: lineNo, endCol: c, depth: openStack.length, children: [] };
            pushChild(root, node);
          }
        } else if (!/\s/.test(ch)) {
          // Detect simple binary ops when at single char operators
          const two = text.substring(c, c+2);
          const three = text.substring(c, c+3);
          let op: string | null = null;
          if (three === '%>%' || two === '->' || two === '<-' || two === '|>' || two === '&&' || two === '||' || two === '==' || two === '!=') op = three === '%>%' ? three : two;
          else if ('+-*/=<>' .includes(ch)) op = ch;
          if (op) {
            const node: RNode = { type: 'BinaryOp', operator: op, startLine: lineNo, startCol: c, endLine: lineNo, endCol: c + op.length - 1, depth: openStack.length, children: [] };
            pushChild(root, node);
          }
        }
      }
    }

    function isInStringOrComment(line: string, upToCol: number): boolean {
      let s = inString, chQuote = stringChar, comment = false;
      for (let i = 0; i < upToCol; i++) {
        const ch = line[i];
        if (comment) return true;
        if (!s && ch === '#') { comment = true; return true; }
        if (ch === '"' || ch === '\'') {
          if (!s) { s = true; chQuote = ch; }
          else if (ch === chQuote) {
            let esc = 0; for (let k = i - 1; k >= 0 && line[k] === '\\'; k--) esc++;
            if (esc % 2 === 0) { s = false; chQuote = ''; }
          }
        }
      }
      return s || comment;
    }

    const stackAt = (line: number, col: number): RNode[] => {
      // Return nodes whose span includes the point
      const result: RNode[] = [];
      const visit = (n: RNode) => {
        const within = (line > n.startLine || (line === n.startLine && col >= n.startCol)) && (line < n.endLine || (line === n.endLine && col <= n.endCol));
        if (within) result.push(n);
        for (const ch of n.children) visit(ch);
      };
      visit(root);
      return result.sort((a,b)=> (a.startLine - b.startLine) || (a.startCol - b.startCol));
    };

    return { root, stackAt };
  }
}


