import * as vscode from 'vscode';
import { IndentationEngine } from './indentation/indentationEngine.js';
import { DebugLogger } from './utils/debugUtils.js';
import { ConfigurationManager } from './config/settings.js';

let indentationEngine: IndentationEngine;

/**
 * Check if this is an empty bracket case where VSCode should handle formatting
 */
function isEmptyBracketCase(document: vscode.TextDocument, position: vscode.Position): boolean {
  const line = document.lineAt(position.line);
  const lineText = line.text;
  
  // Only consider truly empty brackets: opening bracket immediately followed by closing bracket
  // Pattern: func(|) where cursor is between empty brackets
  if (position.character > 0) {
    const charBefore = lineText[position.character - 1];
    const charAfter = position.character < lineText.length ? lineText[position.character] : '';
    
    // Check for immediate empty bracket patterns: (|), [|], {|}
    if (/[([{]/.test(charBefore) && /[)\]}]/.test(charAfter)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if we should bypass VSCode's default indentation for completed chains
 */
function shouldBypassDefaultIndentation(
  document: vscode.TextDocument, 
  position: vscode.Position
): boolean {
  const currentLine = document.lineAt(position.line);
  const currentLineText = currentLine.text.trim();
  
  // Check if we're after a completed expression/statement
  if (position.line > 0) {
    const prevLine = document.lineAt(position.line - 1);
    const prevLineText = prevLine.text.trim();
    
    // Previous line ends with closing bracket/parenthesis = completed function/expression
    if (/[)\]}]\s*$/.test(prevLineText)) {
      return true;
    }
    
    // Previous line ends with operator but current line doesn't contain operators = completed chain
    const prevHasOperator = /(%>%|\|>|\+|-|\*|\/|=|<-|->)\s*$/.test(prevLineText);
    const currentHasOperator = /(%>%|\|>|\+|-|\*|\/|=|<-|->)/.test(currentLineText);
    
    if (prevHasOperator && !currentHasOperator && currentLineText.length > 0) {
      return true;
    }
  }
  
  // Current line ends with closing bracket/parenthesis = completed expression
  if (currentLineText.length > 0 && /[)\]}]\s*$/.test(currentLineText)) {
    return true;
  }
  
  return false;
}



export function activate(context: vscode.ExtensionContext): void {
  // Initialize the indentation engine and debug logger
  indentationEngine = new IndentationEngine();
  DebugLogger.initialize();
  
  // Log activation to ensure extension is working
  DebugLogger.logDebug('R Indent extension activated');
  

  
  // Register type command handler
  const typeHandler = vscode.commands.registerCommand('type', async (args?: { text?: string }) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return vscode.commands.executeCommand('default:type', args);
    }
    const { document } = editor;
    
    // Guard: if args missing or not a newline, delegate to default immediately
    if (document.languageId !== 'r' || !args || typeof args.text !== 'string' || args.text !== '\n') {
      return vscode.commands.executeCommand('default:type', args);
    }

    // Only handle single-cursor, collapsed selections
    if (editor.selections.length !== 1 || !editor.selection.isEmpty) {
      return vscode.commands.executeCommand('default:type', args);
    }

    const cursor = editor.selection.active;
    const lineText = document.lineAt(cursor.line).text;
    
    // Check for empty bracket case - let VSCode handle it completely
    if (isEmptyBracketCase(document, cursor)) {
      return vscode.commands.executeCommand('default:type', args);
    }
    
    DebugLogger.logDebug(`Processing Enter at line ${cursor.line}, col ${cursor.character}`);
    
    // Use the new indentation engine
    const targetIndent = indentationEngine.calculateEnterIndentation(document, cursor);
    
    if (targetIndent !== null) {
      const success = await editor.edit((eb) => {
        eb.insert(cursor, `\n${targetIndent}`);
      });
      
      // Log successful rule application
      const appliedRule = indentationEngine.getLastAppliedRule();
      if (appliedRule && success) {
        DebugLogger.logRuleSuccess(appliedRule, cursor.line, targetIndent.length);
      }
      
      if (!success) {
        return vscode.commands.executeCommand('default:type', args);
      }
      return undefined;
    }
    
    // Check if we should bypass default indentation for completed chains
    const position = new vscode.Position(cursor.line, cursor.character);
    if (shouldBypassDefaultIndentation(document, position)) {
      const success = await editor.edit((eb) => {
        eb.insert(cursor, '\n');
      });
      
      if (success) {
        DebugLogger.logBypassDefault(cursor.line);
        return undefined;
      }
    }
    
    // Log and fall back to default VSCode behavior
    DebugLogger.logNoRuleApplied(cursor.line);
    return vscode.commands.executeCommand('default:type', args);
  });

  const disposable = vscode.languages.registerOnTypeFormattingEditProvider(
    [
      { language: 'r', scheme: 'file' },
      { language: 'r', scheme: 'untitled' },
      { pattern: '**/*.{r,R}' }
    ],
    {
      provideOnTypeFormattingEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        ch: string,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
      ): vscode.TextEdit[] {
        const edits: vscode.TextEdit[] = [];

        // Use the new indentation engine for closing brackets
        if (/[\}\)\]]/.test(ch)) {
          const targetIndent = indentationEngine.calculateTypeIndentation(document, position, ch);
          
          if (targetIndent !== null) {
            const currentLine = document.lineAt(position.line);
            const currentIndent = currentLine.text.match(/^\s*/)?.[0] ?? '';
            
            if (targetIndent.length !== currentIndent.length) {
              const range = new vscode.Range(
                new vscode.Position(position.line, 0),
                new vscode.Position(position.line, currentIndent.length)
              );
              edits.push(vscode.TextEdit.replace(range, targetIndent));
              
              // Note: OnType formatting doesn't track which rule was applied
            }
          }
        }

        return edits;
      },
    },
    '}', ')', ']'
  );

  context.subscriptions.push(disposable, typeHandler);
}

export function deactivate(): void {
  // Clean up resources
  DebugLogger.dispose();
}


