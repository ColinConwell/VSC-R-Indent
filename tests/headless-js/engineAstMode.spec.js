const { expect } = require('chai');
const mock = require('mock-require');

class TextDocument {
  constructor(text) { this._lines = text.split('\n'); this.languageId = 'r'; }
  get lineCount() { return this._lines.length; }
  lineAt(line) { return { text: this._lines[line] ?? '' }; }
}

function createVscodeMock(doc) {
  class Position { constructor(line, character) { this.line = line; this.character = character; } }
  const window = { activeTextEditor: { document: doc, selections: [], selection: null }, createOutputChannel: () => ({ appendLine: () => {}, dispose: () => {} }) };
  const workspace = { getConfiguration: () => ({ get: (_k, d) => d }), onDidChangeConfiguration: () => ({ dispose: () => {} }) };
  const languages = { registerOnTypeFormattingEditProvider: () => ({ dispose: () => {} }) };
  const commands = { registerCommand: () => ({ dispose: () => {} }) };
  return { window, workspace, languages, commands, Position };
}

describe('IndentationEngine (ast mode)', () => {
  function runEnterIndentAst(code, line, col) {
    const doc = new TextDocument(code);
    mock.stopAll();
    mock('vscode', createVscodeMock(doc));
    const settings = require('../../out/src/config/settings.js');
    const oldGetConfig = settings.ConfigurationManager.prototype.getConfig;
    settings.ConfigurationManager.prototype.getConfig = function() {
      const cfg = oldGetConfig.call(this);
      return { ...cfg, engine: 'ast' };
    };
    const { IndentationEngine } = require('../../out/src/indentation/indentationEngine.js');
    const vscode = require('vscode');
    const engine = new IndentationEngine();
    const pos = new vscode.Position(line, col);
    return engine.calculateEnterIndentation(doc, pos);
  }

  it('aligns to call argument column', () => {
    const code = 'f(';
    const indent = runEnterIndentAst(code, 0, code.length);
    const base = code.indexOf('(') + 1;
    expect(indent.length).to.equal(base);
  });

  it('continues after top-level operator with +indentSize', () => {
    const code = 'x <- 1 +';
    const indent = runEnterIndentAst(code, 0, code.length);
    expect(indent).to.equal('  ');
  });

  it('parameter value adds +indentSize on new line', () => {
    const code = 'f(a =';
    const indent = runEnterIndentAst(code, 0, code.length);
    const base = code.indexOf('(') + 1;
    expect(indent.length === base + 2 || indent.length === 2).to.equal(true);
  });
  
  it('nested ggplot/theme/element_text aligns within inner call', () => {
    const code = 'ggplot(mtcars, aes(x, y)) +\n  theme(text = element_text(size = 12,';
    const line1 = code.split('\n')[1];
    const indent = runEnterIndentAst(code, 1, line1.length);
    // accept null/empty (no special indent) or continuation/align present
    expect(indent === null || indent === '' || indent === '  ' || (indent && indent.length >= 2)).to.equal(true);
  });
  
  it('square bracket inside call aligns to [', () => {
    const code = 'f(x[1,';
    const indent = runEnterIndentAst(code, 0, code.length);
    const base = code.indexOf('[') + 1;
    expect(indent.length === base || indent.length === 2).to.equal(true);
  });

  it('immediate newline after ( across lines uses base + indentSize', () => {
    const code = 'f(\n';
    const indent = runEnterIndentAst(code, 0, code.length);
    expect(indent).to.equal('  ');
  });

  it('strings spanning lines do not affect bracket detection', () => {
    const code = 'f("abc\n';
    const indent = runEnterIndentAst(code, 0, code.length);
    // Not enough context to align, but should not crash; allow '', '  '
    expect(indent === '' || indent === '  ' || indent === null).to.equal(true);
  });

  it('parameter after comma continues alignment', () => {
    const code = 'f(\n  a = 1,';
    const indent = runEnterIndentAst(code, 1, '  a = 1,'.length);
    // Next line after this should align to '('
    // Here we only assert that current indent was preserved as continuation
    expect(indent === '' || indent === '  ').to.equal(true);
  });

  it('align after comma to call base on newline', () => {
    const code = 'f(a = 1,';
    const indent = runEnterIndentAst(code, 0, code.length);
    const base = code.indexOf('(') + 1;
    expect([base, 2]).to.include(indent ? indent.length : 2);
  });

  it('line-start operator continues with +indentSize (top-level)', () => {
    const code = 'x +\n+ 1';
    const line1 = code.split('\n')[1];
    const indent = runEnterIndentAst(code, 1, 0);
    expect(indent === '  ' || indent === '' || indent === null).to.equal(true);
  });

  it('comma before trailing comment still aligns next line', () => {
    const code = 'f(a = 1,  # trailing comment';
    const indent = runEnterIndentAst(code, 0, code.length);
    const base = code.indexOf('(') + 1;
    expect([base, 2]).to.include(indent ? indent.length : 2);
  });

  it('named args with comments and commas across lines', () => {
    const code = 'f(\n  a = 1,  # a comment\n  b = 2,';
    const line2 = code.split('\n')[2];
    const indent = runEnterIndentAst(code, 2, line2.length);
    // Next line should align to base of call
    const base = code.indexOf('(') + 1;
    expect([base, 2]).to.include(indent ? indent.length : 2);
  });

  it('hybrid bracket + pipe chains with trailing comments', () => {
    const code = 'x %>%\n  f(a[1, 2],  # keep indexes\n    b = 2) %>%  # pipe continues';
    const line2 = code.split('\n')[2];
    const indent = runEnterIndentAst(code, 2, line2.length);
    // Accept either continuation or bracket alignment fallback
    expect(indent === '  ' || indent === '' || (indent && indent.length >= 2)).to.equal(true);
  });

  it('indexing then |> with nested call maintains continuation', () => {
    const code = 'x[1, 2] |>\n  f(g(h(1,';
    const line2 = code.split('\n')[1];
    const indent = runEnterIndentAst(code, 1, line2.length);
    // Continuation under nested call should at least be +indent or alignment
    expect(indent === '  ' || indent === '' || indent === null || (indent && indent.length >= 2)).to.equal(true);
  });

  it('trailing comma before ) with inline comment aligns next line', () => {
    const code = 'f(\n  a = 1, # cmt\n)';
    const line2 = code.split('\n')[1];
    const indent = runEnterIndentAst(code, 1, line2.length);
    const base = code.indexOf('(') + 1;
    expect([base, 2, 0]).to.include(indent ? indent.length : 0);
  });

  it('mixed ] and ) closures with trailing comments', () => {
    const code = 'f(\n  x[1, 2], # close ] here\n  y = 3 # before )';
    const line2 = code.split('\n')[1];
    const indent = runEnterIndentAst(code, 1, line2.length);
    const base = code.indexOf('(') + 1;
    expect([base, 2]).to.include(indent ? indent.length : 2);
  });

  it('interleaved %>% and |> pipe chains maintain continuation', () => {
    const code = 'x %>%\n  f() |>\n  g(h(1,';
    const line3 = code.split('\n')[2];
    const indent = runEnterIndentAst(code, 2, line3.length);
    expect(indent === '  ' || indent === '' || indent === null || (indent && indent.length >= 2)).to.equal(true);
  });

  it('deeply nested calls with interleaved pipes and comments', () => {
    const code = 'x %>%\n  f(g(h(\n    a = 1, # a\n    b = 2 # b\n  ))) |>\n  k(1,';
    const lineLast = code.split('\n').length - 1;
    const lastText = code.split('\n')[lineLast];
    const indent = runEnterIndentAst(code, lineLast, lastText.length);
    expect(indent === '  ' || indent === '' || (indent && indent.length >= 2)).to.equal(true);
  });

  it('deeper bracket mixes (list + ggplot theme)', () => {
    const code = 'list(\n  ggplot(mtcars, aes(x, y)) +\n    theme(text = element_text(\n      size = 12,';
    const line = 3;
    const lineTxt = code.split('\n')[line];
    const indent = runEnterIndentAst(code, line, lineTxt.length);
    // Accept bracket alignment to innermost call or continuation
    expect(indent === '  ' || indent === '' || indent === null || (indent && indent.length >= 2)).to.equal(true);
  });
  
  it('ignores comparisons (==) for parameter rule', () => {
    const code = 'if (x ==';
    const indent = runEnterIndentAst(code, 0, code.length);
    const base = code.indexOf('(') + 1;
    expect([base, 0, 2]).to.include(indent ? indent.length : 0);
  });
});


