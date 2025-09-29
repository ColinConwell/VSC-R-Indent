const cp = require('child_process');
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

function hasAir(airPath) {
  try {
    const res = cp.spawnSync(airPath, ['--version'], { encoding: 'utf8', timeout: 2000 });
    return res.status === 0;
  } catch { return false; }
}

function measure(fn, iters) {
  const times = [];
  const t0 = Date.now();
  for (let i = 0; i < iters; i++) {
    const s = Date.now();
    fn();
    times.push(Date.now() - s);
  }
  const total = Date.now() - t0;
  times.sort((a,b)=>a-b);
  const mean = total / iters;
  const p95 = times[Math.floor(times.length*0.95)] || mean;
  return { total, mean, p95 };
}

describe('Perf (real Air if available)', function() {
  this.timeout(60000);

  const airPath = process.env.AIR_PATH || 'air';
  if (!hasAir(airPath)) {
    it('skipped: Air binary not found (set AIR_PATH or add to PATH)', function() {
      expect(true).to.equal(true);
    });
    return;
  }

  function runner(engine, code, line, col) {
    const doc = new TextDocument(code);
    mock.stopAll();
    mock('vscode', createVscodeMock(doc));
    const settings = require('../../out/src/config/settings.js');
    const oldGetConfig = settings.ConfigurationManager.prototype.getConfig;
    settings.ConfigurationManager.prototype.getConfig = function() {
      const cfg = oldGetConfig.call(this);
      return { ...cfg, engine, airExecutablePath: airPath };
    };
    const { IndentationEngine } = require('../../out/src/indentation/indentationEngine.js');
    const vscode = require('vscode');
    const engineInst = new IndentationEngine();
    const pos = new vscode.Position(line, col);
    return () => engineInst.calculateEnterIndentation(doc, pos);
  }

  it('reports table for rules vs air', () => {
    const scenarios = [
      { name: 'param value', code: 'f(a =', line: 0, colOff: 0, iters: 200 },
      { name: 'pipe chain', code: 'mtcars %>%\n  filter(mpg > 20) %>%', line: 1, colOff: 0, iters: 200 },
      { name: 'ggplot + pipes', code: 'ggplot(mtcars, aes(x, y)) +\n  geom_point() %>%', line: 1, colOff: 0, iters: 200 },
    ];

    const rows = [];
    for (const s of scenarios) {
      const lines = s.code.split('\n');
      const col = (s.colOff || 0) + lines[s.line].length;
      const fnRules = runner('rules', s.code, s.line, col);
      const fnAir = runner('air', s.code, s.line, col);
      const fnAst = runner('ast', s.code, s.line, col);
      const rRules = measure(fnRules, s.iters);
      const rAir = measure(fnAir, Math.max(20, Math.floor(s.iters/5))); // fewer iters for Air
      const rAst = measure(fnAst, s.iters);
      rows.push({ scenario: s.name, rules: rRules, air: rAir, ast: rAst });
    }

    // Print table
    const header = ['Scenario', 'Mode', 'Iters', 'Total(ms)', 'Mean(ms)', 'P95(ms)', 'Ops/sec'];
    const linesOut = [];
    linesOut.push(header.join('\t'));
    for (const row of rows) {
      const add = (mode, r, iters) => {
        const opsSec = (iters / (r.total/1000)).toFixed(1);
        linesOut.push([row.scenario, mode, String(iters), String(r.total), r.mean.toFixed(3), String(r.p95), opsSec].join('\t'));
      };
      const it = scenarios.find(s=>s.name===row.scenario).iters;
      add('rules', row.rules, it);
      add('ast', row.ast, it);
      add('air', row.air, Math.max(20, Math.floor(it/5)));
    }
    console.log('\nPerf Report (rules vs air)');
    console.log(linesOut.join('\n'));
    expect(rows.length).to.be.greaterThan(0);
  });
});


