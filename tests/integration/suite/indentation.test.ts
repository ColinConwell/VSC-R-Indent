import * as assert from 'assert';
import * as vscode from 'vscode';

suite('R Indent Integration', () => {
  setup(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('Enter after parameter "=" adds bracket base + indentSize', async () => {
    const content = 'f(a =';
    const doc = await vscode.workspace.openTextDocument({ language: 'r', content });
    const editor = await vscode.window.showTextDocument(doc);
    const pos = new vscode.Position(0, content.length);
    editor.selections = [new vscode.Selection(pos, pos)];
    await vscode.commands.executeCommand('type', { text: '\n' });
    const openCol = content.indexOf('(') + 1;
    const indent = doc.lineAt(1).text.match(/^\s*/)?.[0] ?? '';
    assert.strictEqual(indent.length, openCol + 2);
  });

  test('On-type ")" dedents to opener base', async () => {
    const content = 'f(\n  x\n';
    const doc = await vscode.workspace.openTextDocument({ language: 'r', content });
    const editor = await vscode.window.showTextDocument(doc);
    const pos = new vscode.Position(2, 0);
    editor.selections = [new vscode.Selection(pos, pos)];
    await vscode.commands.executeCommand('type', { text: ')' });
    assert.strictEqual(doc.lineAt(2).firstNonWhitespaceCharacterIndex, 0);
  });
});


