import * as vscode from 'vscode';
import { IndentationEngine } from './indentation/indentationEngine';
import { DebugLogger } from './utils/debugUtils';
import { getConfig } from './config/settings';

export function activate(context: vscode.ExtensionContext) {
  const engine = new IndentationEngine();
  const logger = new DebugLogger();
  const status = vscode.window.createStatusBarItem(
    'rstudio-indent.status',
    vscode.StatusBarAlignment.Right,
    100,
  );
  status.name = 'RStudio Indent';
  status.command = 'rIndent.showRecentLogs';
  const noteLegacy = (mode: string) => {
    if (mode !== 'rules')
      logger.warnOnce('legacy-engine', {
        requested: mode,
        effective: 'rules',
        message: 'Air/AST are deprecated aliases. No external process is executed.',
      });
  };
  const updateStatus = () => {
    const document = vscode.window.activeTextEditor?.document;
    const config = getConfig(document);
    status.text = `RStudio Indent: ${config.enabled ? 'On' : 'Off'}`;
    status.tooltip = 'RStudio Indent — show local diagnostic logs';
    if (document?.languageId === 'r' && config.showStatusBar) status.show();
    else status.hide();
  };
  const nativeEnter = () => vscode.commands.executeCommand('default:type', { text: '\n' });
  const enter = vscode.commands.registerCommand('rIndent.enter', async () => {
    const editor = vscode.window.activeTextEditor;
    if (
      !editor ||
      editor.document.languageId !== 'r' ||
      editor.selections.length !== 1 ||
      !editor.selection.isEmpty
    )
      return nativeEnter();
    const document = editor.document;
    const cursor = editor.selection.active;
    const line = document.lineAt(cursor.line).text;
    // Preserve the editor's paired-bracket expansion, including its cursor placement.
    const pairedClose = ({ '(': ')', '[': ']', '{': '}' } as Record<string, string>)[
      line[cursor.character - 1]
    ];
    if (pairedClose && pairedClose === line[cursor.character]) return nativeEnter();
    const config = getConfig(document);
    noteLegacy(config.engine);
    const started = performance.now();
    try {
      const indent = engine.calculateEnterIndentation(document, cursor, config);
      if (indent === null) return nativeEnter();
      const tailWhitespace = line.slice(cursor.character).match(/^[\t ]*/)?.[0].length || 0;
      const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
      const success = await editor.edit(
        (edit) =>
          edit.replace(new vscode.Range(cursor, cursor.translate(0, tailWhitespace)), eol + indent),
        { undoStopBefore: true, undoStopAfter: true },
      );
      if (!success) {
        logger.write('warn', 'edit-rejected');
        return nativeEnter();
      }
      const destination = new vscode.Position(cursor.line + 1, indent.length);
      editor.selection = new vscode.Selection(destination, destination);
      if (config.enableDebugLogging)
        logger.write('debug', 'enter', {
          line: cursor.line + 1,
          column: cursor.character,
          rule: engine.getLastDecision().rule,
          columns: engine.getLastDecision().columns,
          durationMs: Number((performance.now() - started).toFixed(3)),
        });
      return undefined;
    } catch (error) {
      logger.write('error', 'enter-failed', {
        errorType: error instanceof Error ? error.name : 'unknown',
      });
      return nativeEnter();
    }
  });
  const provider = vscode.languages.registerOnTypeFormattingEditProvider(
    { language: 'r' },
    {
      provideOnTypeFormattingEdits(document, position, character, options, cancellation) {
        if (cancellation.isCancellationRequested) return [];
        const config = getConfig(document, options);
        noteLegacy(config.engine);
        try {
          const indent = engine.calculateTypeIndentation(document, position, character, config);
          const current = document.lineAt(position.line).text.match(/^[\t ]*/)?.[0] || '';
          if (indent === null || indent === current || cancellation.isCancellationRequested)
            return [];
          if (config.enableDebugLogging)
            logger.write('debug', 'closing-bracket', {
              line: position.line + 1,
              rule: engine.getLastDecision().rule,
              columns: engine.getLastDecision().columns,
            });
          return [
            vscode.TextEdit.replace(
              new vscode.Range(position.line, 0, position.line, current.length),
              indent,
            ),
          ];
        } catch (error) {
          logger.write('error', 'formatting-failed', {
            errorType: error instanceof Error ? error.name : 'unknown',
          });
          return [];
        }
      },
    },
    '}',
    ')',
    ']',
  );
  context.subscriptions.push(
    logger,
    status,
    enter,
    provider,
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.contentChanges.length)
        engine.invalidate(
          event.document,
          Math.min(...event.contentChanges.map((change) => change.range.start.line)),
        );
    }),
    vscode.window.onDidChangeActiveTextEditor(updateStatus),
    vscode.workspace.onDidChangeConfiguration(updateStatus),
    vscode.commands.registerCommand('rIndent.showRecentLogs', () => logger.show()),
    vscode.commands.registerCommand('rIndent.toggleDebugLogging', async () => {
      const document = vscode.window.activeTextEditor?.document;
      const settings = vscode.workspace.getConfiguration('rIndent', document);
      const next = !getConfig(document).enableDebugLogging;
      // Respect the scope that currently controls this preference.
      const inspection = settings.inspect('enableDebugLogging');
      const languageOverride =
        inspection?.workspaceFolderLanguageValue !== undefined ||
        inspection?.workspaceLanguageValue !== undefined ||
        inspection?.globalLanguageValue !== undefined;
      const folder = languageOverride
        ? inspection?.workspaceFolderLanguageValue
        : inspection?.workspaceFolderValue;
      const workspace = languageOverride
        ? inspection?.workspaceLanguageValue
        : inspection?.workspaceValue;
      const target =
        folder !== undefined
          ? vscode.ConfigurationTarget.WorkspaceFolder
          : workspace !== undefined
            ? vscode.ConfigurationTarget.Workspace
            : vscode.ConfigurationTarget.Global;
      await settings.update('enableDebugLogging', next, target, languageOverride);
      logger.write('info', 'debug-logging', { enabled: next });
      logger.show();
    }),
    vscode.commands.registerCommand('rIndent.toggleEngine', () => {
      logger.write('info', 'engine-selection', {
        message: 'The supported engine is rules. Legacy Air and AST settings use rules.',
      });
      logger.show();
    }),
  );
  logger.write('info', 'activated', {
    extension: context.extension.id,
    version: context.extension.packageJSON.version,
    editorVersion: vscode.version,
    engine: 'rules',
  });
  updateStatus();
  // Narrow diagnostic API for host tests; no source or paths are exposed.
  return { recentLogs: () => logger.recent(), effectiveEngine: 'rules' as const };
}
