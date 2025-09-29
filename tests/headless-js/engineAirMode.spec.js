const { expect } = require('chai');
const mock = require('mock-require');

class TextDocument {
  constructor(text) {
    this._lines = text.split('\n');
    this.languageId = 'r';
  }
  get lineCount() { return this._lines.length; }
  lineAt(line) { return { text: this._lines[line] ?? '' }; }
}

function createVscodeMock(doc) {
  class Position { constructor(line, character) { this.line = line; this.character = character; } }
  const window = {
    activeTextEditor: { document: doc, selections: [], selection: null },
    createOutputChannel: () => ({ appendLine: () => {}, dispose: () => {} })
  };
  const workspace = {
    getConfiguration: () => ({ get: (_k, d) => d }),
    onDidChangeConfiguration: () => ({ dispose: () => {} })
  };
  const languages = { registerOnTypeFormattingEditProvider: () => ({ dispose: () => {} }) };
  const commands = { registerCommand: () => ({ dispose: () => {} }) };
  return { window, workspace, languages, commands, Position };
}

describe('IndentationEngine (air mode, mocked runner)', () => {
  function runEnterIndentAir(code, line, col) {
    const doc = new TextDocument(code);
    mock.stopAll();
    mock('vscode', createVscodeMock(doc));
    // Force config.engine = 'air'
    const settings = require('../../out/src/config/settings.js');
    const oldGetConfig = settings.ConfigurationManager.prototype.getConfig;
    settings.ConfigurationManager.prototype.getConfig = function() {
      const cfg = oldGetConfig.call(this);
      return { ...cfg, engine: 'air' };
    };
    // Mock AirRunner to return predictable indentation: bracket base + 2 spaces
    const airRunner = require('../../out/src/indentation/airRunner.js');
    airRunner.AirRunner.formatSliceSync = function(slice, opts) {
      const lines = slice.split(/\r?\n/);
      const idx = line + 1;
      if (idx >= 0 && idx < lines.length) {
        const base = (lines[line].match(/^\s*/) || [''])[0];
        lines[idx] = base + '  ' + (lines[idx] || '');
      }
      return lines.join('\n');
    };
    const { IndentationEngine } = require('../../out/src/indentation/indentationEngine.js');
    const vscode = require('vscode');
    const engine = new IndentationEngine();
    const pos = new vscode.Position(line, col);
    return engine.calculateEnterIndentation(doc, pos);
  }

  it('uses Air runner indentation when engine=air', () => {
    const code = 'f(';
    const indent = runEnterIndentAir(code, 0, code.length);
    expect(indent).to.equal('  ');
  });
});


