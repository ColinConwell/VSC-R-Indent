/**
 * Rules for parameter assignment indentation
 */

import * as vscode from 'vscode';
import { BaseRule } from './BaseRule.js';
import { IndentationContext, RIndentConfig } from '../config/types.js';

export class ParameterAssignmentRule extends BaseRule {
  constructor() {
    super('ParameterAssignment', 110); // Higher priority than BracketAlignment
  }
  
  public applies(context: IndentationContext, config: RIndentConfig): boolean {
    if (!context.isEnterKey) return false;
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) return false;
    
    const document = editor.document;
    
    // ParameterAssignment should ONLY apply when indenting a parameter VALUE
    // This happens when the current line (after Enter key split) will end with =
    
    const currentLine = document.lineAt(context.line);
    const textBeforeCursor = currentLine.text.substring(0, context.column).trimEnd();
    
    // ONLY apply when the line we're leaving ends with = (indenting the parameter value)
    return textBeforeCursor.endsWith('=');
  }
  
  public getIndentation(context: IndentationContext, config: RIndentConfig): string | null {
    // Return only the pure parameter value contribution
    // The proximity system will add bracket alignment separately
    return ' '.repeat(config.indentSize);
  }
}
