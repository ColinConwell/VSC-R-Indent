/** Pure interfaces shared by the editor adapter and deterministic tests. */
export interface IndentationDocument {
  lineAt(line: number): { text: string };
  readonly lineCount: number;
  readonly version?: number;
}
export interface Position {
  line: number;
  character: number;
}
export interface RIndentConfig {
  indentSize: number;
  alignFunctionArguments: boolean;
  enableDebugLogging: boolean;
  enabled: boolean;
  showStatusBar: boolean;
  insertSpaces: boolean;
  tabSize: number;
  /** Legacy values remain readable; all modes now use the same supported rules. */
  engine: 'rules' | 'air' | 'ast';
}
export interface IndentDecision {
  indent: string | null;
  rule: string;
  /** Display columns, not UTF-16 length or the number of tabs. */
  columns: number | null;
}
