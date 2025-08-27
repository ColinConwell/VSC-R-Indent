/**
 * Base class for indentation rules
 */

import { IndentationRule, IndentationContext, RIndentConfig } from '../config/types.js';

export abstract class BaseRule implements IndentationRule {
  public readonly name: string;
  public readonly priority: number;
  
  constructor(name: string, priority: number) {
    this.name = name;
    this.priority = priority;
  }
  
  /**
   * Check if this rule applies to the current context
   */
  public abstract applies(context: IndentationContext, config: RIndentConfig): boolean;
  
  /**
   * Calculate the indentation for this context
   */
  public abstract getIndentation(context: IndentationContext, config: RIndentConfig): string | null;
  
  /**
   * Utility: Get base indentation from a line
   */
  protected getBaseIndent(lineText: string): string {
    const match = lineText.match(/^\s*/);
    return match ? match[0] : '';
  }
  
  /**
   * Utility: Create indentation string
   */
  protected createIndent(spaces: number): string {
    return ' '.repeat(Math.max(0, spaces));
  }
  
  /**
   * Utility: Check if line contains only whitespace
   */
  protected isWhitespaceOnly(lineText: string): boolean {
    return /^\s*$/.test(lineText);
  }
  
  /**
   * Utility: Check if character is an opening bracket
   */
  protected isOpeningBracket(char: string): boolean {
    return ['(', '[', '{'].includes(char);
  }
  
  /**
   * Utility: Check if character is a closing bracket
   */
  protected isClosingBracket(char: string): boolean {
    return [')', ']', '}'].includes(char);
  }
  
  /**
   * Utility: Get matching closing bracket for opening bracket
   */
  protected getMatchingBracket(openBracket: string): string {
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
    };
    return pairs[openBracket] || '';
  }
}



