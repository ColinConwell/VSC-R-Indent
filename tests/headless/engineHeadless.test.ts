import { expect } from 'chai';
import { IndentationEngine } from '../../src/indentation/indentationEngine';
import * as vscodeMock from '../mocks/vscode';

function createVscodeMock(doc: any) {
  class Position {
    line: number;
    character: number;
    constructor(line: number, character: number) {
      this.line = line;
      this.character = character;
    }
  }

  const window = {
    activeTextEditor: { document: doc, selections: [] as any[], selection: null as any },
    createOutputChannel: (_name: string) => ({ appendLine: (_m: string) => {}, dispose: () => {} })
  };

  const workspace = {
    getConfiguration: (_section: string) => ({
      get: (key: string, fallback: any) => {
        if (key === 'indentSize' || key === 'pipeIndentSize') return 2;
        if (key === 'alignFunctionArguments') return true;
        if (key === 'enableDebugLogging') return false;
        return fallback;
      }
    }),
    onDidChangeConfiguration: () => ({ dispose: () => {} })
  };

  const languages = {
    registerOnTypeFormattingEditProvider: () => ({ dispose: () => {} })
  };

  const commands = {
    registerCommand: () => ({ dispose: () => {} })
  };

  return { window, workspace, languages, commands, Position };
}

class TextDocument {
  private _lines: string[];
  public languageId = 'r';
  constructor(text: string) {
    this._lines = text.split('\n');
  }
  lineAt(line: number) { return { text: this._lines[line] ?? '' }; }
}

describe('IndentationEngine (headless)', () => {
  async function runEnterIndent(code: string, line: number, col: number): Promise<string | null> {
    const doc = new TextDocument(code);
    // Set active editor on our vscode mock
    (vscodeMock as any).window.activeTextEditor = { document: doc, selections: [], selection: null };
    const engine = new IndentationEngine();
    const pos = new (vscodeMock as any).Position(line, col);
    return engine.calculateEnterIndentation(doc as any, pos);
  }

  it('parameter value: base bracket + 2 spaces', async () => {
    const code = 'f(a =';
    const indent = await runEnterIndent(code, 0, code.length);
    const openCol = code.indexOf('(') + 1;
    expect(indent?.length).to.equal(openCol + 2);
  });

  it('top-level pipe indent is 2 spaces', async () => {
    const code = 'data %>%';
    const indent = await runEnterIndent(code, 0, code.length);
    expect(indent).to.equal('  ');
  });

  it('bracket alignment precedence over outer operator', async () => {
    const code = 'ggplot(mtcars, aes(x = disp, y = mpg)) +\n  theme(text = element_text(size = 12,';
    const indent = await runEnterIndent(code, 1, '  theme(text = element_text(size = 12,'.length);
    // align to column after element_text(
    const line0 = code.split('\n')[1];
    const alignCol = line0.indexOf('element_text(') + 'element_text('.length;
    expect(indent?.length).to.equal(alignCol);
  });
});


