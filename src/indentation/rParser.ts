/**
 * R-specific syntax parser for indentation analysis
 * Simplified parser focused on bracket matching - operators handled by OperatorChain
 */

import * as vscode from 'vscode';
import { BracketMatch, RParseResult } from '../config/types.js';

export class RParser {
  private static readonly CONTROL_KEYWORDS = ['if', 'else', 'for', 'while', 'repeat'];
  private static readonly FUNCTION_KEYWORDS = ['function'];
  private static readonly BRACKET_PAIRS = {
    '(': ')',
    '[': ']',
    '{': '}',
  } as const;
  
  /**
   * Parse R code up to the current position to understand context
   */
  public static parseContext(
    document: vscode.TextDocument,
    line: number,
    column: number
  ): { lineText: string; line: number; column: number } {
    const currentLine = document.lineAt(line);
    return {
      lineText: currentLine.text,
      line,
      column
    };
  }
  
  /**
   * Parse R code to find brackets and other structural elements
   */
  public static parseRCode(lineText: string, lineNumber: number): RParseResult {
    const result: RParseResult = {
      openBrackets: [],
      keywords: [],
      lineIndentation: '',
      isInString: false,
      isInComment: false
    };
    
    const bracketStack: BracketMatch[] = [];
    let inString = false;
    let inComment = false;
    let stringChar = '';
    
    // Get line indentation
    const indentMatch = lineText.match(/^\s*/);
    result.lineIndentation = indentMatch ? indentMatch[0] : '';
    
    for (let i = 0; i < lineText.length; i++) {
      const char = lineText[i];
      
      // Handle string literals
      if (char === '"' || char === "'") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          // Check for escaped quotes
          let escapeCount = 0;
          for (let j = i - 1; j >= 0 && lineText[j] === '\\'; j--) {
            escapeCount++;
          }
          if (escapeCount % 2 === 0) {
            inString = false;
            stringChar = '';
          }
        }
        result.isInString = inString;
        continue;
      }
      
      // Skip if we're in a string
      if (inString) {
        continue;
      }
      
      // Handle comments
      if (char === '#') {
        result.isInComment = true;
        break; // Rest of line is comment
      }
      
      // Handle brackets
      if (char in this.BRACKET_PAIRS) {
        const bracketType = char as '(' | '[' | '{';
        const bracket: BracketMatch = {
          line: lineNumber,
          column: i,
          bracketType,
          depth: bracketStack.length
        };
        bracketStack.push(bracket);
        result.openBrackets.push(bracket);
      } else if (Object.values(this.BRACKET_PAIRS).includes(char as any)) {
        // Closing bracket - remove from stack
        if (bracketStack.length > 0) {
          bracketStack.pop();
        }
      }
      
      // Check for keywords (only if not in string or comment)
      if (!inString && !inComment) {
        const remainingLine = lineText.substr(i);
        for (const keyword of [...this.CONTROL_KEYWORDS, ...this.FUNCTION_KEYWORDS]) {
          if (remainingLine.startsWith(keyword + ' ') || remainingLine.startsWith(keyword + '(')) {
            result.keywords.push(keyword);
            break;
          }
        }
      }
    }
    
    // Update open brackets to only include unmatched ones
    result.openBrackets = bracketStack;
    
    return result;
  }
  
  /**
   * Check if current position matches a pipe operator
   */
  public static matchesPipe(lineText: string, column: number): boolean {
    // Pipe detection now handled by OperatorChain rule
    return false;
  }
  
  // All pipe and plus chain methods removed - now handled by OperatorChain rule
}