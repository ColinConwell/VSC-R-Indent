const { performance } = require('node:perf_hooks');
const assert = require('node:assert/strict');
const { IndentationEngine } = require('../../out/indentation/indentationEngine');
for (const length of [100, 10000, 50000]) {
  const doc = {
    version: 1,
    lineCount: length + 1,
    lineAt: (i) => ({ text: i === length ? 'data |>' : 'x <- f("bracket ) in string")' }),
  };
  const engine = new IndentationEngine(),
    pos = { line: length, character: 7 };
  const start = performance.now();
  assert.equal(engine.calculateEnterIndentation(doc, pos), '  ');
  const cold = performance.now() - start;
  const durations = [];
  for (let i = 0; i < 500; i++) {
    const start = performance.now();
    assert.equal(engine.calculateEnterIndentation(doc, pos), '  ');
    durations.push(performance.now() - start);
  }
  durations.sort((a, b) => a - b);
  console.log(JSON.stringify({ lines: length, coldMs: cold, cachedP95Ms: durations[475] }));
  // A deliberately generous bound catches accidental full-document rescans, not CPU speed noise.
  assert.ok(durations[475] < 25, 'Cached indentation exceeded 25 ms at p95');
}
