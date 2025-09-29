"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
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
