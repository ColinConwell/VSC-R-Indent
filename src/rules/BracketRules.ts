/**
 * Rules for bracket-based indentation
 */

import * as vscode from 'vscode';
import { BaseRule } from './BaseRule.js';
import { IndentationContext, RIndentConfig, BracketMatch } from '../config/types.js';
import { RParser } from '../indentation/rParser.js';
import { DebugLogger } from '../utils/debugUtils.js';

export class BracketAlignmentRule extends BaseRule {
  constructor() {
    super('BracketAlignment', 100);
  }
  
  public applies(context: IndentationContext, config: RIndentConfig): boolean {
    if (!context.isEnterKey || !config.alignFunctionArguments) {
      return false;
    }
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;
    
    const document = editor.document;
    const position = new vscode.Position(context.line, context.column);
    
    // Look left from cursor to find the nearest opening bracket
    const bracketResult = this.findNearestOpeningBracket(document, position);
    
    // If no brackets found, BracketAlignment doesn't apply regardless of operators
    if (bracketResult === null) {
      return false;
    }
    
    const hasNearbyOperator = this.hasOperatorNearCursor(document, position);
    
    // Apply bracket alignment only if we have a bracket and no nearby operator
    return !hasNearbyOperator;
  }
  
  public getIndentation(context: IndentationContext, config: RIndentConfig): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    
    const document = editor.document;
    const position = new vscode.Position(context.line, context.column);
    
    // Find the nearest opening bracket to the left of cursor
    const bracketResult = this.findNearestOpeningBracket(document, position);
    if (!bracketResult) {
      return null;
    }
    
    // Check if this is an immediate newline after opening bracket
    // Pattern: func(\n  <- cursor here, should get default indent
    if (this.isImmediateAfterOpeningBracket(document, bracketResult, position)) {
      // Use default indent (like RStudio does for immediate newlines)
      const bracketLine = document.lineAt(bracketResult.line);
      const baseIndent = this.getBaseIndent(bracketLine.text);
      return baseIndent + ' '.repeat(config.indentSize);
    }
    
    // Normal case: align to column after the bracket (first argument alignment)
    const targetColumn = bracketResult.column + 1;
    return ' '.repeat(targetColumn);
  }
  
  /**
   * Check if line ends with an operator
   */
  private endsWithOperator(lineText: string): boolean {
    const cleanText = lineText.replace(/#.*$/, '').trim();
    
    const continuationOperators = [
      /(%>%|\|>)\s*$/,
      /\+\s*$/,
      /-\s*$/,
      /\*\s*$/,
      /\/\s*$/,
      /=\s*$/,
      /(<-|->) *$/,
      // Note: Comma removed - doesn't trigger indentation in RStudio
      /(\|\||&&)\s*$/,
      /[<>]=?\s*$/,
      /[!=]=\s*$/,
    ];
    
    return continuationOperators.some(pattern => pattern.test(cleanText));
  }

  /**
   * Check if line ends with an operator (excluding = for parameter assignments)
   */
  private endsWithNonParameterOperator(lineText: string): boolean {
    const cleanText = lineText.replace(/#.*$/, '').trim();
    
    const continuationOperators = [
      /(%>%|\|>)\s*$/,
      /\+\s*$/,
      /-\s*$/,
      /\*\s*$/,
      /\/\s*$/,
      /(<-|->) *$/,
      /(\|\||&&)\s*$/,
      /[<>]=?\s*$/,
      /[!=]=\s*$/,
    ];
    
    return continuationOperators.some(pattern => pattern.test(cleanText));
  }
  
  /**
   * Find the nearest opening bracket to the left of cursor (proper syntax parsing)
   */
  private findNearestOpeningBracket(document: vscode.TextDocument, position: vscode.Position): {
    line: number;
    column: number;
    bracketType: '(' | '[' | '{';
  } | null {
    let bracketStack: Array<{ type: string; line: number; column: number }> = [];
    
    // Search backwards from cursor position until we find context boundary
    let currentLine = position.line;
    let currentColumn = position.character;
    
    while (currentLine >= 0) {
      const line = document.lineAt(currentLine);
      const lineText = line.text;
      
      // Set search range for this line
      const searchEnd = currentLine === position.line ? currentColumn : lineText.length;
      
      // Search backwards in this line
      for (let col = searchEnd - 1; col >= 0; col--) {
        const char = lineText[col];
        
        if (char === ')' || char === ']' || char === '}') {
          // Closing bracket - add to stack
          bracketStack.push({ type: char, line: currentLine, column: col });
        } else if (char === '(' || char === '[' || char === '{') {
          // Opening bracket
          if (bracketStack.length > 0) {
            // Check if this closes the most recent bracket
            const lastBracket = bracketStack[bracketStack.length - 1];
            const matching = (char === '(' && lastBracket.type === ')') ||
                           (char === '[' && lastBracket.type === ']') ||
                           (char === '{' && lastBracket.type === '}');
            
            if (matching) {
              bracketStack.pop(); // This bracket is matched
            }
          } else {
            // Found an unmatched opening bracket
            return {
              line: currentLine,
              column: col,
              bracketType: char as '(' | '[' | '{'
            };
          }
        }
      }
      
      // Check for context boundaries - stop if we hit a line that would end context
      const trimmedLine = lineText.trim();
      if (currentLine < position.line && (
        trimmedLine === '' ||  // Empty line
        trimmedLine.endsWith('}') ||  // End of block
        trimmedLine.endsWith(')') ||  // End of function call
        !/^\s/.test(lineText) && !this.endsWithOperator(trimmedLine)  // Non-indented line that doesn't end with operator
      )) {
        break;
      }
      
      // Move to previous line
      currentLine--;
      currentColumn = 0;
    }
    
    return null;
  }
  
  /**
   * Check if there's an operator near the cursor (takes priority over brackets)
   */
  private hasOperatorNearCursor(document: vscode.TextDocument, position: vscode.Position): boolean {
    // Check current line before cursor position
    if (position.character > 0) {
      const line = document.lineAt(position.line);
      const lineText = line.text;
      
      for (let col = position.character - 1; col >= 0; col--) {
        const char = lineText[col];
        
        // Skip whitespace
        if (/\s/.test(char)) continue;
        
        // Check for operators (excluding = for parameter assignments)
        if (['+', '-', '*', '/'].includes(char)) {
          return true;
        }
        
        // Multi-character operators
        if (char === '%' && col >= 2 && lineText.substring(col - 2, col + 1) === '%>%') {
          return true;
        }
        if (char === '>' && col >= 1 && lineText.substring(col - 1, col + 1) === '|>') {
          return true;
        }
        if (char === '-' && col >= 1 && lineText.substring(col - 1, col + 1) === '<-') {
          return true;
        }
        if (char === '>' && col >= 1 && lineText.substring(col - 1, col + 1) === '->') {
          return true;
        }
        
        // If we hit a non-operator, stop
        break;
      }
    }
    
    // Check if previous line ends with an operator (excluding = for parameter assignments)
    if (position.line > 0) {
      const prevLine = document.lineAt(position.line - 1);
      const prevLineText = prevLine.text.trim();
      return this.endsWithNonParameterOperator(prevLineText);
    }
    
    return false;
  }
  
  /**
   * Check if cursor is immediately after an opening bracket (should use default indent)
   */
  private isImmediateAfterOpeningBracket(
    document: vscode.TextDocument, 
    bracketResult: { line: number; column: number; bracketType: '(' | '[' | '{' }, 
    position: vscode.Position
  ): boolean {
    // Check if there's any content between the opening bracket and current position
    const bracketLine = document.lineAt(bracketResult.line);
    const bracketText = bracketLine.text;
    
    // If bracket and cursor are on same line
    if (bracketResult.line === position.line) {
      const afterBracket = bracketText.substring(bracketResult.column + 1, position.character);
      // Immediate if only whitespace between bracket and cursor
      return /^\s*$/.test(afterBracket);
    }
    
    // If bracket and cursor are on different lines
    if (bracketResult.line < position.line) {
      // Check if there's any content after the opening bracket on its line
      const afterBracket = bracketText.substring(bracketResult.column + 1);
      if (!/^\s*$/.test(afterBracket)) {
        return false; // There's content after bracket
      }
      
      // Check if there are any non-empty lines between bracket and cursor
      for (let lineNum = bracketResult.line + 1; lineNum < position.line; lineNum++) {
        const lineText = document.lineAt(lineNum).text;
        if (!/^\s*$/.test(lineText)) {
          return false; // There's content between bracket and cursor
        }
      }
      
      return true; // Truly immediate - only whitespace between bracket and cursor
    }
    
    return false;
  }
  
  /**
   * Check if we're currently inside brackets
   */
  private isInsideBrackets(document: vscode.TextDocument, line: number, column: number): boolean {
    let openCount = 0;
    
    // Check from start of document to current position
    for (let lineNum = 0; lineNum <= line; lineNum++) {
      const currentLine = document.lineAt(lineNum);
      const text = lineNum === line 
        ? currentLine.text.substring(0, column)
        : currentLine.text;
      
      // Simple bracket counting (ignoring strings/comments for now)
      for (const char of text) {
        if (char === '(' || char === '[' || char === '{') {
          openCount++;
        } else if (char === ')' || char === ']' || char === '}') {
          openCount--;
        }
      }
    }
    
    return openCount > 0;
  }
}

export class HangingIndentRule extends BaseRule {
  constructor() {
    super('HangingIndent', 90);
  }
  
  public applies(context: IndentationContext, config: RIndentConfig): boolean {
    return false; // Disabled for now
  }
  
  public getIndentation(context: IndentationContext, config: RIndentConfig): string | null {
    return null;
  }
}

export class ClosingBracketRule extends BaseRule {
  constructor() {
    super('ClosingBracket', 80);
  }
  
  public applies(context: IndentationContext, config: RIndentConfig): boolean {
    if (!context.isEnterKey) return false;
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;
    
    const document = editor.document;
    const currentLine = document.lineAt(context.line);
    
    // Check if we're immediately after a closing bracket
    const textBeforeCursor = currentLine.text.substring(0, context.column);
    const trimmedText = textBeforeCursor.trimEnd();
    
    // Apply when the line ends with a closing bracket (possibly followed by whitespace)
    return /[)\]}]\s*$/.test(trimmedText);
  }
  
  public getIndentation(context: IndentationContext, config: RIndentConfig): string | null {
    // After closing bracket, return to column 0 (no indentation)
    return '';
  }
}

export class ClosingBracketContextRule extends BaseRule {
  constructor() {
    super('ClosingBracketContext', 85); // Higher priority than ClosingBracket but lower than BracketAlignment
  }
  
  public applies(context: IndentationContext, config: RIndentConfig): boolean {
    if (!context.isEnterKey) return false;
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;
    
    const document = editor.document;
    const position = new vscode.Position(context.line, context.column);
    
    // Find the nearest opening bracket
    const bracketResult = this.findNearestOpeningBracket(document, position);
    if (!bracketResult) return false;
    
    // Check if we're in a "closing context" - after arguments but before closing bracket
    return this.isInClosingContext(document, bracketResult, position);
  }
  
  public getIndentation(context: IndentationContext, config: RIndentConfig): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    
    const document = editor.document;
    const position = new vscode.Position(context.line, context.column);
    
    // Find the nearest opening bracket
    const bracketResult = this.findNearestOpeningBracket(document, position);
    if (!bracketResult) return null;
    
    // Return to the function's base indent (same as function line)
    const bracketLine = document.lineAt(bracketResult.line);
    const baseIndent = this.getBaseIndent(bracketLine.text);
    return baseIndent;
  }
  
  /**
   * Check if we're in a closing context (after last argument, before closing bracket)
   */
  private isInClosingContext(
    document: vscode.TextDocument, 
    bracketResult: { line: number; column: number; bracketType: '(' | '[' | '{' }, 
    position: vscode.Position
  ): boolean {
    // CRITICAL: ClosingBracketContext only applies when first argument is on separate line
    // Check if the opening bracket line has arguments on the same line
    const bracketLineText = document.lineAt(bracketResult.line).text;
    const afterBracket = bracketLineText.substring(bracketResult.column + 1).trim();
    
    // If there's content after the bracket on the same line, this is NOT a closing context
    // Example: strtoi("5") <- "5" is on same line as bracket, so no closing context
    if (afterBracket !== '' && !afterBracket.startsWith(')') && !afterBracket.startsWith(']') && !afterBracket.startsWith('}')) {
      return false;
    }
    
    // Look at the current line up to cursor
    const currentLine = document.lineAt(position.line);
    const textBeforeCursor = currentLine.text.substring(0, position.character).trim();
    
    // If current line is empty or just whitespace, check previous content
    if (textBeforeCursor === '') {
      // Look backward to find the last non-whitespace content
      for (let lineNum = position.line - 1; lineNum > bracketResult.line; lineNum--) {
        const lineText = document.lineAt(lineNum).text.trim();
        if (lineText !== '') {
          // Check if this looks like the end of an argument list
          return this.looksLikeArgumentEnd(lineText);
        }
      }
      
      // If no content found between bracket and cursor, means bracket line was empty after bracket
      return true;
    } else {
      // Current line has content - check if it looks like argument end
      return this.looksLikeArgumentEnd(textBeforeCursor);
    }
  }
  
  /**
   * Check if text looks like the end of an argument (suggesting closing bracket should follow)
   */
  private looksLikeArgumentEnd(text: string): boolean {
    // Patterns that suggest we're done with arguments:
    // - Line ends with a value (no comma) - e.g., "value", TRUE, 10L
    // - Line ends with a closing quote or bracket - e.g., "string")
    // - Line ends without comma or assignment operator
    
    const trimmed = text.trim();
    
    // Don't apply if line ends with operators that suggest continuation
    if (/[=,+\-*/|&<>]$/.test(trimmed)) {
      return false;
    }
    
    // Don't apply if line looks like parameter name (ends with =)
    if (/=\s*$/.test(trimmed)) {
      return false;
    }
    
    // Apply if line ends with value-like patterns
    return /[)\]}"'A-Za-z0-9L]$/.test(trimmed);
  }
  
  /**
   * Find the nearest opening bracket to the left of cursor
   */
  private findNearestOpeningBracket(document: vscode.TextDocument, position: vscode.Position): {
    line: number;
    column: number;
    bracketType: '(' | '[' | '{';
  } | null {
    let bracketStack: Array<{ type: string; line: number; column: number }> = [];
    
    // Search backwards from cursor position
    let currentLine = position.line;
    let currentColumn = position.character;
    
    while (currentLine >= 0) {
      const line = document.lineAt(currentLine);
      const lineText = line.text;
      
      // Set search range for this line
      const searchEnd = currentLine === position.line ? currentColumn : lineText.length;
      
      // Search backwards in this line
      for (let col = searchEnd - 1; col >= 0; col--) {
        const char = lineText[col];
        
        if (char === ')' || char === ']' || char === '}') {
          // Push closing bracket onto stack
          bracketStack.push({ type: char, line: currentLine, column: col });
        } else if (char === '(' || char === '[' || char === '{') {
          // Found opening bracket
          const matching = bracketStack.find(b => 
            (char === '(' && b.type === ')') ||
            (char === '[' && b.type === ']') ||
            (char === '{' && b.type === '}')
          );
          
          if (matching) {
            bracketStack = bracketStack.filter(b => b !== matching);
          } else {
            // Found unmatched opening bracket
            return {
              line: currentLine,
              column: col,
              bracketType: char as '(' | '[' | '{'
            };
          }
        }
      }
      
      currentLine--;
      currentColumn = 0; // For previous lines, start from end
    }
    
    return null;
  }
}