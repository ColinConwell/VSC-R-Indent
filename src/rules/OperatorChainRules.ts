/**
 * Rules for general operator chain indentation (+, %>%, =, ->, etc.)
 */

import * as vscode from 'vscode';
import { BaseRule } from './BaseRule.js';
import { IndentationContext, RIndentConfig } from '../config/types.js';

export class OperatorChainRule extends BaseRule {
  constructor() {
    super('OperatorChain', 120); // Highest priority - handles most cases
  }
  
  public applies(context: IndentationContext, config: RIndentConfig): boolean {
    if (!context.isEnterKey) return false;
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;
    
    const document = editor.document;
    const position = new vscode.Position(context.line, context.column);
    
    // First check: Are we inside parentheses/brackets? 
    // Only defer to BracketAlignment if it's NOT a parameter assignment
    if (this.isInsideParentheses(document, position) && !this.isParameterAssignment(document, position)) {
      console.log(`[OperatorChain] Line ${position.line}: Inside parentheses (non-parameter), deferring to BracketAlignment`);
      return false;
    }
    
    // Check if current line (up to cursor position) ends with operator
    const currentLine = document.lineAt(position.line);
    const currentLineTextUpToCursor = currentLine.text.substring(0, position.character);
    const currentLineEndsWithOp = this.endsWithOperator(currentLineTextUpToCursor);
    
    // Check if previous line ends with operator
    let prevLineEndsWithOp = false;
    if (position.line > 0) {
      const prevLine = document.lineAt(position.line - 1);
      const prevLineText = prevLine.text;
      prevLineEndsWithOp = this.endsWithOperator(prevLineText);
    }
    
    // Only consider "top-level" operators (pipes, assignment at statement level)
    // Not parameter assignments inside function calls
    const isTopLevelOperator = currentLineEndsWithOp && this.isTopLevelOperator(currentLineTextUpToCursor.trim());
    
    // Only apply if:
    // 1. Current line ends with a TOP-LEVEL operator, OR
    // 2. Previous line ends with operator AND current line doesn't complete the chain
    const result = isTopLevelOperator || (prevLineEndsWithOp && this.isChainContinuation(currentLineTextUpToCursor));
    
    console.log(`[OperatorChain] Line ${position.line}: Current line up to cursor "${currentLineTextUpToCursor}" ends with op: ${currentLineEndsWithOp}, is top-level: ${isTopLevelOperator}, Previous line ends with op: ${prevLineEndsWithOp}, Result: ${result}`);
    
    return result;
  }
  
  public getIndentation(context: IndentationContext, config: RIndentConfig): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    
    const document = editor.document;
    const position = new vscode.Position(context.line, context.column);
    
    // Special handling for parameter assignments
    if (this.isParameterAssignment(document, position)) {
      return this.getParameterAssignmentIndent(document, position);
    }
    
    // Check which line has the operator (same logic as applies method)
    const currentLine = document.lineAt(position.line);
    const currentLineTextUpToCursor = currentLine.text.substring(0, position.character);
    const currentLineEndsWithOp = this.endsWithOperator(currentLineTextUpToCursor);
    
    let operatorLineNumber = position.line;
    
    // If current line up to cursor ends with operator, use current line
    if (currentLineEndsWithOp) {
      operatorLineNumber = position.line;
    } else if (position.line > 0) {
      // Check if previous line ends with operator
      const prevLine = document.lineAt(position.line - 1);
      const prevLineEndsWithOp = this.endsWithOperator(prevLine.text);
      if (prevLineEndsWithOp) {
        operatorLineNumber = position.line - 1;
      } else {
        // Neither current nor previous line has operator - shouldn't happen if applies() worked correctly
        return null;
      }
    }
    
    // Find the base of the operator chain
    const baseLineNumber = this.findChainBaseIndent(document, operatorLineNumber, position);
    const baseLine = document.lineAt(baseLineNumber);
    const baseIndent = baseLine.text.match(/^\s*/)?.[0] ?? '';
    const operatorIndent = this.createIndent(config.pipeIndentSize);
    
    console.log(`[OperatorChain] Base line ${baseLineNumber}: "${baseLine.text}" -> base indent: "${baseIndent}" (${baseIndent.length} chars) + operator indent: "${operatorIndent}" (${operatorIndent.length} chars)`);
    
    return baseIndent + operatorIndent;
  }
  
  /**
   * Find the nearest operator to the left of the cursor (proper syntax parsing)
   */
  private findNearestOperator(document: vscode.TextDocument, position: vscode.Position): {
    operatorLine: number;
    operatorColumn: number;
    operator: string;
    beforeElementLine: number;
  } | null {
    // Start from cursor position and search backwards
    let currentLine = position.line;
    
    // First check if we're immediately after an operator on current line
    if (position.character > 0) {
      const line = document.lineAt(currentLine);
      const lineText = line.text;
      
      // Look backwards from cursor on current line
      for (let col = position.character - 1; col >= 0; col--) {
        const char = lineText[col];
        
        // Skip whitespace
        if (/\s/.test(char)) continue;
        
        // Check for operators
        if (this.isOperatorChar(char, lineText, col)) {
          const beforeElementLine = this.findElementBeforeOperator(document, currentLine, col);
          return {
            operatorLine: currentLine,
            operatorColumn: col,
            operator: char,
            beforeElementLine: beforeElementLine
          };
        }
        
        // If we hit any non-operator character, stop searching current line
        break;
      }
    }
    
    // Now check previous line - see if it ends with an operator
    if (currentLine > 0) {
      const prevLine = document.lineAt(currentLine - 1);
      const prevLineText = prevLine.text.trim();
      
      if (this.endsWithOperator(prevLineText)) {
        // Find the operator at the end of previous line
        for (let col = prevLine.text.length - 1; col >= 0; col--) {
          const char = prevLine.text[col];
          
          // Skip whitespace
          if (/\s/.test(char)) continue;
          
          // Check for operators
          if (this.isOperatorChar(char, prevLine.text, col)) {
            const beforeElementLine = this.findElementBeforeOperator(document, currentLine - 1, col);
            return {
              operatorLine: currentLine - 1,
              operatorColumn: col,
              operator: char,
              beforeElementLine: beforeElementLine
            };
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Check if line ends with an operator that indicates continuation
   */
  private endsWithOperator(lineText: string): boolean {
    // Remove comments and whitespace
    const cleanText = lineText.replace(/#.*$/, '').trim();
    
    // Operators that indicate continuation when at end of line
    const continuationOperators = [
      /(%>%|\|>)\s*$/,           // Pipe operators
      /\+\s*$/,                  // Plus operator
      /-\s*$/,                   // Minus operator  
      /\*\s*$/,                  // Multiplication
      /\/\s*$/,                  // Division
      /=\s*$/,                   // Assignment/equals
      /(<-|->) *$/,              // Assignment arrows
      /(\|\||&&)\s*$/,           // Logical operators
      /[<>]=?\s*$/,              // Comparison operators
      /[!=]=\s*$/,               // Equality operators
    ];
    
    return continuationOperators.some(pattern => pattern.test(cleanText));
  }
  
  /**
   * Check if we are inside parentheses/brackets where BracketAlignment should take precedence
   */
  private isInsideParentheses(document: vscode.TextDocument, position: vscode.Position): boolean {
    let openCount = 0;
    let closeCount = 0;
    
    // Check all characters from start of line up to cursor
    const currentLine = document.lineAt(position.line);
    const textUpToCursor = currentLine.text.substring(0, position.character);
    
    for (const char of textUpToCursor) {
      if (char === '(' || char === '[' || char === '{') {
        openCount++;
      } else if (char === ')' || char === ']' || char === '}') {
        closeCount++;
      }
    }
    
    // If we have unmatched opening brackets, we're inside parentheses
    return openCount > closeCount;
  }
  
  /**
   * Check if an operator is at the "top level" (not inside function calls) OR a parameter assignment
   */
  private isTopLevelOperator(lineText: string): boolean {
    // Pipe operators are always top-level
    const pipeOperators = ['%>%', '|>', '%<>%', '%T>%', '%$%'];
    if (pipeOperators.some(op => lineText.endsWith(op))) {
      return true;
    }
    
    // Assignment operators are top-level if they're parameter assignments (handled separately)
    return lineText.endsWith('=') || lineText.endsWith('<-') || lineText.endsWith('->');
  }
  
  /**
   * Check if we're in a parameter assignment context (like base = in function calls)
   */
  private isParameterAssignment(document: vscode.TextDocument, position: vscode.Position): boolean {
    const currentLine = document.lineAt(position.line);
    const textUpToCursor = currentLine.text.substring(0, position.character);
    
    // Check if we're inside parentheses AND the line ends with an assignment operator
    if (!this.isInsideParentheses(document, position)) {
      return false;
    }
    
    // Look for pattern: identifier = (parameter assignment)
    const paramPattern = /\w+\s*=\s*$/;
    return paramPattern.test(textUpToCursor);
  }
  
  /**
   * Get indentation for parameter assignments (aligns value with parameter name + space after =)
   */
  private getParameterAssignmentIndent(document: vscode.TextDocument, position: vscode.Position): string {
    const currentLine = document.lineAt(position.line);
    const textUpToCursor = currentLine.text.substring(0, position.character);
    
    // Find the start of the parameter name
    const match = textUpToCursor.match(/(\s*)(\w+\s*=\s*)$/);
    if (!match) {
      // Fallback to standard indentation
      return '  ';
    }
    
    const [, leadingSpaces, parameterPart] = match;
    const parameterStartIndent = leadingSpaces;
    const spacesToAlignWithValue = ' '.repeat(parameterPart.length);
    
    console.log(`[OperatorChain] Parameter assignment: "${parameterPart}" -> aligning with ${parameterStartIndent.length + parameterPart.length} chars`);
    
    return parameterStartIndent + spacesToAlignWithValue;
  }
  
  /**
   * Check if current line represents a chain continuation (not completion)
   */
  private isChainContinuation(lineText: string): boolean {
    const trimmed = lineText.trim();
    
    // Empty lines or lines that only contain whitespace are continuations
    if (trimmed.length === 0) {
      return true;
    }
    
    // Lines that end with operators are continuations
    if (this.endsWithOperator(trimmed)) {
      return true;
    }
    
    // Lines that start with operators are continuations
    if (this.startsWithOperator(trimmed)) {
      return true;
    }
    
    // Function calls like "kable()" complete the chain
    if (/\w+\s*\([^)]*\)\s*$/.test(trimmed)) {
      return false;
    }
    
    // Simple expressions (numbers, identifiers) complete the chain
    if (/^\s*(\d+(\.\d+)?[LlFf]?|\w+)\s*$/.test(trimmed)) {
      return false;
    }
    
    // Default to continuation for other cases (complex expressions, etc.)
    return true;
  }
  
  /**
   * Check if line contains operators (for detecting end of chains)
   */
  private containsOperator(lineText: string): boolean {
    const operatorPatterns = [
      /%>%|\|>/,                 // Pipes
      /\+(?!=)/,                 // Plus (not +=)
      /-(?!=)/,                  // Minus (not -=)
      /\*(?!=)/,                 // Multiplication (not *=)
      /\/(?!=)/,                 // Division (not /=)
      /<-|->/,                   // Assignment arrows
      /=/,                       // Equals
      /\|\||&&/,                 // Logical operators
      /[<>]=?/,                  // Comparison
      /[!=]=/,                   // Equality
    ];
    
    return operatorPatterns.some(pattern => pattern.test(lineText));
  }
  

  
  /**
   * Find the base indentation of the operator chain
   */
  private findChainBaseIndent(document: vscode.TextDocument, fromLine: number, cursorPosition?: vscode.Position): number {
    let currentLine = fromLine;
    let hasSeenOperator = false;
    
    console.log(`[OperatorChain] findChainBaseIndent starting from line ${fromLine}`);
    
    // Look backwards to find the first line that doesn't end with an operator
    while (currentLine >= 0) {
      const line = document.lineAt(currentLine);
      
      // For the line where cursor is positioned, only check text up to cursor
      let lineTextToCheck: string;
      if (cursorPosition && currentLine === cursorPosition.line) {
        lineTextToCheck = line.text.substring(0, cursorPosition.character).trim();
      } else {
        lineTextToCheck = line.text.trim();
      }
      
      console.log(`[OperatorChain] Checking line ${currentLine}: "${lineTextToCheck}"`);
      
      // If we encounter an empty line after seeing operators, stop here
      if (lineTextToCheck.length === 0) {
        console.log(`[OperatorChain] Empty line at ${currentLine}, hasSeenOperator: ${hasSeenOperator}`);
        if (hasSeenOperator) {
          // Empty line after operators - the chain starts on the next non-empty line
          currentLine++;
          break;
        } else {
          // Empty line before any operators - keep searching
          currentLine--;
          continue;
        }
      }
      
      // Check for chain boundaries after seeing operators
      if (hasSeenOperator && this.isChainBoundary(line.text)) {
        console.log(`[OperatorChain] Found boundary at line ${currentLine}: "${lineTextToCheck}"`);
        // Found a boundary - the chain starts on the next line
        return currentLine + 1;
      }
      
      // Check if this line ends with an operator
      if (this.endsWithOperator(lineTextToCheck)) {
        console.log(`[OperatorChain] Line ${currentLine} ends with operator`);
        hasSeenOperator = true;
        currentLine--;
        continue;
      }
      
      // Found a line that doesn't end with an operator
      console.log(`[OperatorChain] Line ${currentLine} doesn't end with operator, hasSeenOperator: ${hasSeenOperator}`);
      if (hasSeenOperator) {
        // This is the base of our chain
        console.log(`[OperatorChain] Found base at line ${currentLine}`);
        return currentLine;
      } else {
        // We haven't seen any operators yet, so this line is not part of a chain
        // The chain must start at fromLine
        console.log(`[OperatorChain] No operators seen, returning fromLine ${fromLine}`);
        return fromLine;
      }
    }
    
    // Fallback: find the first non-empty line
    console.log(`[OperatorChain] Reached fallback logic`);
    while (currentLine < document.lineCount) {
      const line = document.lineAt(currentLine);
      if (line.text.trim().length > 0) {
        return currentLine;
      }
      currentLine++;
    }
    
    return fromLine;
  }
  
  /**
   * Check if a line represents a chain boundary
   */
  private isChainBoundary(lineText: string): boolean {
    const trimmed = lineText.trim();
    
    console.log(`[OperatorChain] isChainBoundary checking full line: "${lineText}" -> trimmed: "${trimmed}"`);
    
    // Opening brackets/parentheses (start of new context)
    if (/[({[]/.test(trimmed)) {
      console.log(`[OperatorChain] Boundary: opening bracket`);
      return true;
    }
    
    // Closing brackets/parentheses (end of context)
    if (/[)}\]]/.test(trimmed)) {
      console.log(`[OperatorChain] Boundary: closing bracket`);
      return true;
    }
    
    // Lines containing commas (function arguments)
    if (/,/.test(trimmed)) {
      console.log(`[OperatorChain] Boundary: comma`);
      return true;
    }
    
    // Function definitions and control flow
    if (/^(function|if|else|for|while|repeat|switch)\b/.test(trimmed)) {
      console.log(`[OperatorChain] Boundary: function/control flow`);
      return true;
    }
    
    // Don't treat column 0 lines as boundaries - they can be chain bases
    // The empty line detection in findChainBaseIndent handles context separation
    
    console.log(`[OperatorChain] Not a boundary`);
    return false;
  }
  
  /**
   * Check if line starts with an operator (indicating it's a continuation)
   */
  private startsWithOperator(lineText: string): boolean {
    const trimmed = lineText.trim();
    
    const startOperators = [
      /^(%>%|\|>)/,           // Pipe operators
      /^\+/,                  // Plus operator
      /^-/,                   // Minus operator  
      /^\*/,                  // Multiplication
      /^\//,                  // Division
      /^=/,                   // Assignment/equals
      /^(<-|->)/,             // Assignment arrows
      // Note: Comma removed - doesn't trigger indentation in RStudio
      /^(\|\||&&)/,           // Logical operators
      /^[<>]=?/,              // Comparison operators
      /^[!=]=/,               // Equality operators
    ];
    
    return startOperators.some(pattern => pattern.test(trimmed));
  }
  
  /**
   * Check if character at position is an operator
   */
  private isOperatorChar(char: string, lineText: string, col: number): boolean {
    // Single character operators
    if (['+', '-', '*', '/', '='].includes(char)) {
      return true;
    }
    
    // Multi-character operators
    if (char === '%' && col < lineText.length - 2) {
      const next = lineText.substring(col, col + 3);
      if (next === '%>%') return true;
    }
    
    if (char === '|' && col < lineText.length - 1) {
      const next = lineText.substring(col, col + 2);
      if (next === '|>') return true;
    }
    
    if (char === '<' && col < lineText.length - 1) {
      const next = lineText.substring(col, col + 2);
      if (next === '<-') return true;
    }
    
    if (char === '-' && col < lineText.length - 1) {
      const next = lineText.substring(col, col + 2);
      if (next === '->') return true;
    }
    
    return false;
  }
  
  /**
   * Find the line containing the element before the operator (proper syntax parsing)
   */
  private findElementBeforeOperator(document: vscode.TextDocument, operatorLine: number, operatorCol: number): number {
    // Look backwards from operator to find start of element
    let currentLine = operatorLine;
    let currentCol = operatorCol - 1;
    
    // Skip whitespace
    while (currentLine >= 0) {
      const line = document.lineAt(currentLine);
      const lineText = line.text;
      
      while (currentCol >= 0 && /\s/.test(lineText[currentCol])) {
        currentCol--;
      }
      
      if (currentCol >= 0) {
        // Found non-whitespace - this line contains the element
        return currentLine;
      }
      
      // Move to previous line
      currentLine--;
      currentCol = currentLine >= 0 ? document.lineAt(currentLine).text.length - 1 : -1;
    }
    
    return operatorLine; // Fallback
  }
}


