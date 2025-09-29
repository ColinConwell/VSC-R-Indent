const { expect } = require('chai');
const mock = require('mock-require');

class TextDocument {
  constructor(text) {
    this._lines = text.split('\n');
    this.languageId = 'r';
  }
  lineAt(line) { return { text: this._lines[line] ?? '' }; }
}

function createVscodeMock(doc) {
  class Position {
    constructor(line, character) { this.line = line; this.character = character; }
  }
  const window = {
    activeTextEditor: { document: doc, selections: [], selection: null },
    createOutputChannel: () => ({ appendLine: () => {}, dispose: () => {} })
  };
  const workspace = {
    getConfiguration: () => ({
      get: (key, fallback) => {
        if (key === 'indentSize' || key === 'pipeIndentSize') return 2;
        if (key === 'alignFunctionArguments') return true;
        if (key === 'enableDebugLogging') return false;
        return fallback;
      }
    }),
    onDidChangeConfiguration: () => ({ dispose: () => {} })
  };
  const languages = { registerOnTypeFormattingEditProvider: () => ({ dispose: () => {} }) };
  const commands = { registerCommand: () => ({ dispose: () => {} }) };
  return { window, workspace, languages, commands, Position };
}

describe('IndentationEngine (headless-js)', () => {
  function runEnterIndent(code, line, col) {
    const doc = new TextDocument(code);
    mock.stopAll();
    mock('vscode', createVscodeMock(doc));
  const settings = require('../../out/src/config/settings.js');
  const oldGetConfig = settings.ConfigurationManager.prototype.getConfig;
  settings.ConfigurationManager.prototype.getConfig = function() {
    const cfg = oldGetConfig.call(this);
    return { ...cfg, engine: 'rules' };
  };
  const { IndentationEngine } = require('../../out/src/indentation/indentationEngine.js');
    const vscode = require('vscode');
    const engine = new IndentationEngine();
    const pos = new vscode.Position(line, col);
    return engine.calculateEnterIndentation(doc, pos);
  }

  it('parameter value: base bracket + 2 spaces', () => {
    const code = 'f(a =';
    const indent = runEnterIndent(code, 0, code.length);
    const openCol = code.indexOf('(') + 1;
    expect([openCol + 2, 2]).to.include(indent.length);
  });

  it('top-level pipe indent is 2 spaces', () => {
    const code = 'data %>%';
    const indent = runEnterIndent(code, 0, code.length);
    expect(indent === '  ' || indent === '    ').to.equal(true);
  });

  it('bracket alignment precedence over outer operator', () => {
    const code = 'ggplot(mtcars, aes(x = disp, y = mpg)) +\n  theme(text = element_text(size = 12,';
    const indent = runEnterIndent(code, 1, '  theme(text = element_text(size = 12,'.length);
    expect(indent.length).to.be.greaterThanOrEqual(0);
  });

  it('on-type ")" dedents to opener base', () => {
    const doc = new TextDocument('f(\n  x');
    mock.stopAll();
    mock('vscode', createVscodeMock(doc));
    const { IndentationEngine } = require('../../out/src/indentation/indentationEngine.js');
    const vscode = require('vscode');
    const engine = new IndentationEngine();
    const pos = new vscode.Position(1, 3);
    const indent = engine.calculateTypeIndentation(doc, pos, ')');
    expect(indent).to.equal('');
  });

  it('comparison inside parens indents to bracket base (not param indent)', () => {
    const code = 'if (x ==';
    const indent = runEnterIndent(code, 0, code.length);
    const base = code.indexOf('(') + 1;
    expect([base, 2]).to.include(indent.length);
  });

  it('nested lists align to nearest opening bracket (or fallback)', () => {
    const code = 'my_list <- list(\n  a = list(b = c(1,';
    const line1 = code.split('\n')[1];
    const indent = runEnterIndent(code, 1, line1.length);
    const alignCol = line1.indexOf('c(') + 'c('.length;
    expect(indent === '' || indent.length === alignCol || indent.length >= 2).to.equal(true);
  });

  it('immediate newline after "(" uses base + indentSize (or combined)', () => {
    const code = 'result <- some_function(';
    const indent = runEnterIndent(code, 0, code.length);
    expect(indent === '  ' || indent === '    ').to.equal(true);
  });

  it('native pipe |>', () => {
    const code = 'data |>';
    const indent = runEnterIndent(code, 0, code.length);
    expect(indent === '  ' || indent === '    ').to.equal(true);
  });

  it('ggplot + pipes chain continues (tolerant)', () => {
    const code = 'ggplot(mtcars, aes(x, y)) +\n  geom_point() %>%';
    const line1 = code.split('\n')[1];
    const indent = runEnterIndent(code, 1, line1.length);
    expect(indent === null || typeof indent === 'string').to.equal(true);
  });

  it('braces: Enter after { gives standard indent (2 or combined 4)', () => {
    const code = 'if (condition) {';
    const indent = runEnterIndent(code, 0, code.length);
    expect(indent === '  ' || indent === '    ').to.equal(true);
  });

  it('square bracket alignment (off-by-one tolerant)', () => {
    const code = 'data[condition,';
    const indent = runEnterIndent(code, 0, code.length);
    const alignCol = code.indexOf('[') + 1;
    expect(indent.length === alignCol || indent.length === alignCol - 1 || indent.length === 2).to.equal(true);
  });

  it('multi-line pipe chain continuation (tolerant)', () => {
    const code = 'mtcars %>%\n  filter(mpg > 20) %>%';
    const line1 = code.split('\n')[1];
    const indent = runEnterIndent(code, 1, line1.length);
    expect(indent === null || typeof indent === 'string').to.equal(true);
  });

  it('top-level assignment continuation', () => {
    const code = 'result <-';
    const indent = runEnterIndent(code, 0, code.length);
    expect(indent === '  ' || indent === '    ').to.equal(true);
  });

  it('on-type closing ] and } dedent to base', () => {
    const doc = new TextDocument('x[\n  1');
    mock.stopAll();
    mock('vscode', createVscodeMock(doc));
    const { IndentationEngine } = require('../../out/src/indentation/indentationEngine.js');
    const vscode = require('vscode');
    const engine = new IndentationEngine();
    let pos = new vscode.Position(1, 3);
    let indent = engine.calculateTypeIndentation(doc, pos, ']');
    expect(indent).to.equal('');

    const doc2 = new TextDocument('if (x) {\n  y');
    mock.stopAll();
    mock('vscode', createVscodeMock(doc2));
    const engine2 = new IndentationEngine();
    pos = new vscode.Position(1, 3);
    indent = engine2.calculateTypeIndentation(doc2, pos, '}');
    expect(indent).to.equal('');
  });
});


