/**
 * Type definitions for R indent extension configuration
 */

export interface RIndentConfig {
  /** Enable/disable pipe operator alignment */
  enablePipeAlignment: boolean;
  
  /** Number of spaces to indent after pipe operators */
  pipeIndentSize: number;
  
  /** Align function arguments to opening parenthesis */
  alignFunctionArguments: boolean;
  
  /** How to align content after opening brackets */
  bracketAlignment: 'afterBracket' | 'standardIndent';
  
  /** Enable RStudio compatibility mode */
  rstudioCompatibility: boolean;
  
  /** Enable debug logging for development */
  enableDebugLogging: boolean;
  
  /** Trim lines containing only whitespace */
  trimWhitespaceLines: boolean;
  
  /** Use tab character for hanging indents */
  useTabOnHangingIndent: boolean;
  
  /** Keep closing bracket on same line as last argument */
  keepHangingBracketOnLine: boolean;
}

export interface IndentationContext {
  /** Current line number */
  line: number;
  
  /** Current column position */
  column: number;
  
  /** Text of current line */
  lineText: string;
  
  /** Indentation of current line */
  currentIndent: string;
  
  /** Character that triggered the indentation */
  triggerChar?: string;
  
  /** Whether this is an Enter key press */
  isEnterKey: boolean;
}

export interface BracketMatch {
  /** Line number of the opening bracket */
  line: number;
  
  /** Column number of the opening bracket */
  column: number;
  
  /** Type of bracket */
  bracketType: '(' | '[' | '{';
  
  /** Depth level of nesting */
  depth: number;
}

// Removed PipeMatch - now handled by OperatorChain rule

// Removed PlusOpMatch - now handled by OperatorChain rule

export interface IndentationRule {
  /** Rule name for debugging */
  name: string;
  
  /** Priority (higher number = higher priority) */
  priority: number;
  
  /** Check if rule applies to current context */
  applies(context: IndentationContext, config: RIndentConfig): boolean;
  
  /** Calculate the indentation for this context */
  getIndentation(context: IndentationContext, config: RIndentConfig): string | null;
}

export interface RParseResult {
  /** Unmatched opening brackets */
  openBrackets: BracketMatch[];
  
  /** Keywords that affect indentation */
  keywords: string[];
  
  /** Current line indentation */
  lineIndentation: string;
  
  /** Whether we're in a string literal */
  isInString: boolean;
  
  /** Whether we're in a comment */
  isInComment: boolean;
}
