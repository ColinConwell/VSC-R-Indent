import * as vscode from 'vscode';
import { normalizeConfig } from './defaults';
import { RIndentConfig } from './types';

/** Resolve resource/language settings on each operation; no cached active-editor state. */
export function getConfig(
  document?: vscode.TextDocument,
  options?: Pick<vscode.FormattingOptions, 'insertSpaces' | 'tabSize'>,
): RIndentConfig {
  const settings = vscode.workspace.getConfiguration('rIndent', document);
  const editor = vscode.workspace.getConfiguration('editor', document);
  const active = vscode.window.activeTextEditor;
  const editorOptions =
    options || (active && active.document === document ? active.options : undefined);
  const specified = settings.inspect<number>('indentSize');
  const width =
    specified?.workspaceFolderLanguageValue ??
    specified?.workspaceLanguageValue ??
    specified?.globalLanguageValue ??
    specified?.workspaceFolderValue ??
    specified?.workspaceValue ??
    specified?.globalValue;
  return normalizeConfig({
    indentSize:
      width ?? settings.get<number>('pipeIndentSize', settings.get<number>('indentSize', 2)),
    alignFunctionArguments: settings.get<boolean>('alignFunctionArguments', true),
    enableDebugLogging: settings.get<boolean>('enableDebugLogging', false),
    enabled: settings.get<boolean>('enabled', true),
    engine: settings.get<RIndentConfig['engine']>('engine', 'rules'),
    showStatusBar: settings.get<boolean>('showStatusBar', false),
    insertSpaces:
      typeof editorOptions?.insertSpaces === 'boolean'
        ? editorOptions.insertSpaces
        : editor.get<boolean>('insertSpaces', true),
    tabSize:
      typeof editorOptions?.tabSize === 'number'
        ? editorOptions.tabSize
        : editor.get<number>('tabSize', 2),
  });
}
