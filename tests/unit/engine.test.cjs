const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { IndentationEngine } = require('../../out/indentation/indentationEngine');
const { normalizeConfig } = require('../../out/config/defaults');
const { DocumentScanner, scanLine, visualWidth } = require('../../out/indentation/rLexer');
const cases = require('../fixtures/indentation.cjs');
function document(text) {
  const lines = text.split(/\r?\n/);
  return {
    version: 1,
    lineCount: lines.length,
    lineAt(line) {
      assert.ok(line >= 0 && line < lines.length);
      return { text: lines[line] };
    },
  };
}
function positioned(code) {
  const index = code.indexOf('|CURSOR|');
  const before = index === -1 ? code : code.slice(0, index);
  return {
    doc: document(code.replace('|CURSOR|', '')),
    pos: { line: before.split('\n').length - 1, character: before.split('\n').at(-1).length },
  };
}
for (const [name, code, expected, config] of cases)
  test(name, () => {
    const { doc, pos } = positioned(code);
    assert.equal(
      new IndentationEngine().calculateEnterIndentation(doc, pos, config),
      typeof expected === 'number' ? ' '.repeat(expected) : expected,
    );
  });
for (const [code, expected] of [
  ['f(\n  g(\n    x\n  )', '  '],
  ['if (TRUE) {\n  print(x)', null],
  ['f(\n  x\n    )', ''],
  ['x[\n  1\n    ]', ''],
  ['if (x) {\n  y\n    }', ''],
  ['f(\n g(\n  x\n  ))', ''],
  ['f(\n  ]', null],
  ['"hello\n  )', null],
  ['# )', null],
])
  test(`post-insertion close: ${JSON.stringify(code)}`, () => {
    const { doc, pos } = positioned(code);
    assert.equal(new IndentationEngine().calculateTypeIndentation(doc, pos, code.at(-1)), expected);
  });
test('legacy engines produce the supported result', () => {
  for (const engine of ['air', 'ast']) {
    const { doc, pos } = positioned('f(a =');
    assert.equal(new IndentationEngine().calculateEnterIndentation(doc, pos, { engine }), '    ');
  }
});
test('invalid configuration widths are normalized', () => {
  for (const indentSize of [-1, 0, 1.5, NaN, Infinity, 100000, '4', null])
    assert.equal(normalizeConfig({ indentSize }).indentSize, 2);
});
test('scan preserves quotes and raw string state across lines', () => {
  const s = new DocumentScanner(),
    d = document('f(r"-(one\n" ( )\nthree)-",');
  assert.equal(s.line(d, 2).brackets.length, 1);
  assert.equal(s.line(d, 2).lexical.rawEnd, undefined);
});
test('escaped quotes and even backslashes', () => {
  assert.equal(scanLine('f("a\\\"(",').brackets.length, 1);
  assert.equal(scanLine('f("a\\\\",').brackets.length, 1);
});
test('tabs use display columns', () => assert.equal(visualWidth('\t a\t', 4), 8));
test('version change invalidates cached bracket state', () => {
  let lines = ['f(', '  x,'];
  const doc = { version: 1, lineCount: 2, lineAt: (i) => ({ text: lines[i] }) };
  const engine = new IndentationEngine();
  assert.equal(engine.calculateEnterIndentation(doc, { line: 1, character: 4 }), '  ');
  lines[0] = 'if (x) {';
  doc.version++;
  engine.invalidate(doc, 0);
  assert.equal(engine.calculateEnterIndentation(doc, { line: 1, character: 4 }), '  ');
  lines[0] = 'long_function(a,';
  doc.version++;
  assert.equal(engine.calculateEnterIndentation(doc, { line: 1, character: 4 }), '              ');
});
test('manual script whitespace remains unchanged and executable as an indentation corpus', () => {
  const source = fs.readFileSync('tests/manual_indent_tests.R', 'utf8');
  assert.equal(source, fs.readFileSync('tests/fixtures/manual-original.R', 'utf8'));
  const lines = source.split('\n');
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim() || !lines[i - 1].trim()) continue;
    const prior = lines.slice(0, i).join('\n'),
      { doc, pos } = positioned(prior);
    const expected = lines[i].match(/^\s*/)[0];
    assert.equal(
      new IndentationEngine().calculateEnterIndentation(doc, pos),
      expected,
      `Manual script line ${i + 1}`,
    );
  }
});
test('prefix cache avoids rescanning long unchanged documents', () => {
  let reads = 0;
  const doc = {
    version: 1,
    lineCount: 20001,
    lineAt: (i) => {
      reads++;
      return { text: i === 20000 ? 'x |>' : 'x <- 1' };
    },
  };
  const engine = new IndentationEngine();
  const pos = { line: 20000, character: 4 };
  engine.calculateEnterIndentation(doc, pos);
  reads = 0;
  for (let i = 0; i < 100; i++) assert.equal(engine.calculateEnterIndentation(doc, pos), '  ');
  assert.ok(reads < 1000, `read ${reads} lines for cached operations`);
});
