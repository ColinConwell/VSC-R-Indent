import * as vscode from 'vscode';
import { IndentationEngine } from './indentation/indentationEngine.js';
import { DebugLogger } from './utils/debugUtils.js';
import { ConfigurationManager } from './config/settings.js';

let indentationEngine: IndentationEngine;
let statusBarItem: vscode.StatusBarItem | null = null;

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
  // Simplified bypass logic - only bypass for clearly completed expressions
  if (position.line > 0) {
    const prevLine = document.lineAt(position.line - 1);
    const prevLineText = prevLine.text.trim();
    
    // Only bypass after function calls that are clearly complete
    if (/\w+\([^)]*\)\s*$/.test(prevLineText)) {
      // Bypass case - will be logged by DebugLogger.logBypassDefault()
      return true;
    }
  }
  
  return false;
}

/**
 * Check if position is inside parentheses/brackets
 */
function checkInsideParentheses(document: vscode.TextDocument, position: vscode.Position): boolean {
  let openCount = 0;
  let closeCount = 0;
  
  // Count brackets from start of document to current position
  for (let lineNum = 0; lineNum <= position.line; lineNum++) {
    const line = document.lineAt(lineNum);
    const text = lineNum === position.line 
      ? line.text.substring(0, position.character)
      : line.text;
    
    for (const char of text) {
      if (char === '(' || char === '[' || char === '{') {
        openCount++;
      } else if (char === ')' || char === ']' || char === '}') {
        closeCount++;
      }
    }
  }
  
  return openCount > closeCount;
}

export function activate(context: vscode.ExtensionContext): void {
  // Initialize the indentation engine and debug logger
  indentationEngine = new IndentationEngine();
  DebugLogger.initialize();
  const cfgManager = ConfigurationManager.getInstance();
  const cfg = cfgManager.getConfig();
  
  // Extension initialization logged by DebugLogger.initialize()
  

  
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
    
    
    // Use the new indentation engine
    const targetIndent = indentationEngine.calculateEnterIndentation(document, cursor);
    
    if (targetIndent !== null) {
      const success = await editor.edit((eb) => {
        eb.insert(cursor, `\n${targetIndent}`);
      });
      
      // Log successful rule application
      const appliedRule = indentationEngine.getLastAppliedRule();
      if (appliedRule && success) {
        DebugLogger.logRuleSuccess(appliedRule, cursor.line + 1, targetIndent.length);
      }
      
      if (!success) {
        return vscode.commands.executeCommand('default:type', args);
      }
      // Indentation applied successfully - debug logging handled by IndentationEngine
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

  // Command to cycle indentation engine modes for quick comparison
  const toggleEngineCmd = vscode.commands.registerCommand('rIndent.toggleEngine', async () => {
    const cfg = vscode.workspace.getConfiguration('rIndent');
    const current = cfg.get<string>('engine', 'rules');
    const order = ['rules', 'ast', 'air'];
    const next = order[(order.indexOf(current) + 1) % order.length];
    await cfg.update('engine', next, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`R Indent engine set to: ${next}`);
    updateStatusBar(next);
  });
  context.subscriptions.push(toggleEngineCmd);

  // Command: Show recent debug logs
  const showLogsCmd = vscode.commands.registerCommand('rIndent.showRecentLogs', async () => {
    // The output channel is already initialized; bringing it to front is enough
    vscode.window.showInformationMessage('Opening R Indent output channel...');
    // There is no dedicated show method on DebugLogger; use VSCode output channels UI
    // We trigger a no-op log to ensure channel is visible when debug logging is disabled
    DebugLogger.log('');
  });
  context.subscriptions.push(showLogsCmd);

  // Command: Toggle debug logging
  const toggleDebugCmd = vscode.commands.registerCommand('rIndent.toggleDebugLogging', async () => {
    const cfg = vscode.workspace.getConfiguration('rIndent');
    const current = cfg.get<boolean>('enableDebugLogging', false);
    const next = !current;
    await cfg.update('enableDebugLogging', next, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`R Indent debug logging: ${next ? 'ON' : 'OFF'}`);
  });
  context.subscriptions.push(toggleDebugCmd);

  // Optional status bar item
  if (cfg.showStatusBar) {
    initStatusBar(cfg.engine || 'rules', context);
  }

  // React to configuration changes (show/hide status bar)
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('rIndent.showStatusBar') || event.affectsConfiguration('rIndent.engine')) {
        const cfg = ConfigurationManager.getInstance().getConfig();
        if (cfg.showStatusBar) {
          initStatusBar(cfg.engine || 'rules', context);
        } else {
          disposeStatusBar();
        }
      }
    })
  );
}

export function deactivate(): void {
  // Clean up resources
  DebugLogger.dispose();
  disposeStatusBar();
}

function initStatusBar(engine: string, context: vscode.ExtensionContext) {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'rIndent.toggleEngine';
    context.subscriptions.push(statusBarItem);
  }
  statusBarItem.text = `R Indent: ${engine}`;
  statusBarItem.tooltip = 'Click to cycle indentation engine';
  statusBarItem.show();
}

function updateStatusBar(engine: string) {
  if (statusBarItem) {
    statusBarItem.text = `R Indent: ${engine}`;
  }
}

function disposeStatusBar() {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = null;
  }
}


