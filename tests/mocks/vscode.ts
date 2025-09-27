export class Position {
  line: number;
  character: number;
  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}

export type Disposable = { dispose: () => void };

export const window = {
  activeTextEditor: null as any,
  createOutputChannel: (_name: string) => ({ appendLine: (_m: string) => {}, dispose: () => {} })
};

export const workspace = {
  getConfiguration: (_section: string) => ({
    get: (key: string, fallback: any) => {
      if (key === 'indentSize' || key === 'pipeIndentSize') return 2;
      if (key === 'alignFunctionArguments') return true;
      if (key === 'enableDebugLogging') return false;
      return fallback;
    }
  }),
  onDidChangeConfiguration: () => ({ dispose: () => {} } as Disposable)
};

export const languages = {
  registerOnTypeFormattingEditProvider: () => ({ dispose: () => {} } as Disposable)
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} } as Disposable)
};


