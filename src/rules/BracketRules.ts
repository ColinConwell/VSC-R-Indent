/**
 * Rules for bracket-based indentation
 */

import * as vscode from 'vscode';
import { BaseRule } from './BaseRule.js';
import { IndentationContext, RIndentConfig, BracketMatch } from '../config/types.js';
import { RParser } from '../indentation/rParser.js';

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
      if (config.enableDebugLogging) {
        console.log(`[BracketAlignment] Line ${context.line}: No bracket found, rule doesn't apply`);
      }
      return false;
    }
    
    const hasNearbyOperator = this.hasOperatorNearCursor(document, position);
    
    if (config.enableDebugLogging) {
      console.log(`[BracketAlignment] Line ${context.line}: Found bracket: true, Has nearby operator: ${hasNearbyOperator}`);
    }
    
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
      if (config.enableDebugLogging) {
        console.log(`[BracketAlignment] Line ${context.line}: No opening bracket found`);
      }
      return null;
    }
    
    // Align to column after the bracket
    const targetColumn = bracketResult.column + 1;
    
    if (config.enableDebugLogging) {
      console.log(`[BracketAlignment] Line ${context.line}: Found bracket at line ${bracketResult.line}, col ${bracketResult.column}, aligning to col ${targetColumn}`);
    }
    
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
        
        // Check for operators
        if (['+', '-', '*', '/', '='].includes(char)) {
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
    
    // Check if previous line ends with an operator
    if (position.line > 0) {
      const prevLine = document.lineAt(position.line - 1);
      const prevLineText = prevLine.text.trim();
      return this.endsWithOperator(prevLineText);
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
    return false; // Disabled for now
  }
  
  public getIndentation(context: IndentationContext, config: RIndentConfig): string | null {
    return null;
  }
}