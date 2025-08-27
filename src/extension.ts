import * as vscode from 'vscode';
import { IndentationEngine } from './indentation/indentationEngine.js';
import { DebugLogger } from './utils/debugUtils.js';

let indentationEngine: IndentationEngine;

/**
 * Check if we should bypass VSCode's default indentation for completed chains
 */
function shouldBypassDefaultIndentation(
  document: vscode.TextDocument, 
  position: vscode.Position
): boolean {
  const currentLine = document.lineAt(position.line);
  const currentLineText = currentLine.text.trim();
  
  // Only bypass if current line has content (meaning it's a completed statement)
  if (currentLineText.length > 0) {
    // Check for completed pipe chains
    if (position.line > 0) {
      const prevLine = document.lineAt(position.line - 1);
      const prevLineText = prevLine.text.trim();
      
      // Previous line ends with operator but current line doesn't contain operators = completed chain
      const prevHasOperator = /(%>%|\|>|\+|-|\*|\/|=|<-|->)\s*$/.test(prevLineText);
      const currentHasOperator = /(%>%|\|>|\+|-|\*|\/|=|<-|->)/.test(currentLineText);
      
      if (prevHasOperator && !currentHasOperator) {
        return true;
      }
    }
    
    // Check for completed bracket expressions (line ends with closing bracket/parenthesis)
    if (/[)\]}]\s*$/.test(currentLineText)) {
      return true;
    }
  }
  
  return false;
}



export function activate(context: vscode.ExtensionContext): void {
  // Initialize the indentation engine
  indentationEngine = new IndentationEngine();
  
  DebugLogger.log('Extension activated');
  
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
    

    
    // Use the new indentation engine
    const targetIndent = indentationEngine.calculateEnterIndentation(document, cursor);
    
    if (targetIndent !== null) {
      const success = await editor.edit((eb) => {
        eb.insert(cursor, `\n${targetIndent}`);
      });
      
      // Log the result with the rule that was applied
      const appliedRule = indentationEngine.getLastAppliedRule();
      if (appliedRule) {
        DebugLogger.logRuleApplication(appliedRule, targetIndent, cursor.line, success);
      }
      
      if (!success) {
        return vscode.commands.executeCommand('default:type', args);
      }
      return undefined;
    }
    
    // Check if we should bypass default indentation for completed chains
    const position = new vscode.Position(cursor.line, cursor.character);
    if (shouldBypassDefaultIndentation(document, position)) {
      // Silently bypass - no debug message needed
      const success = await editor.edit((eb) => {
        eb.insert(cursor, '\n');
      });
      if (success) {
        return undefined;
      }
    }
    
    // No rule applied - let VSCode handle it with default behavior
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
              DebugLogger.log(`Line ${position.line}: Closing bracket '${ch}' formatted`);
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
  // Clean up resources if needed
}


