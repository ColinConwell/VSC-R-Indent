import { RIndentConfig } from './types';
export const DEFAULT_CONFIG: Readonly<RIndentConfig> = Object.freeze({
  indentSize: 2,
  alignFunctionArguments: true,
  enableDebugLogging: false,
  enabled: true,
  showStatusBar: false,
  insertSpaces: true,
  tabSize: 2,
  engine: 'rules',
});
export function normalizeConfig(input: Partial<RIndentConfig> = {}): RIndentConfig {
  const integer = (value: unknown, fallback: number, max: number) =>
    typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max
      ? value
      : fallback;
  return {
    indentSize: integer(input.indentSize, 2, 16),
    tabSize: integer(input.tabSize, 2, 16),
    alignFunctionArguments: input.alignFunctionArguments !== false,
    insertSpaces: input.insertSpaces !== false,
    enableDebugLogging: input.enableDebugLogging === true,
    enabled: input.enabled !== false,
    showStatusBar: input.showStatusBar === true,
    engine: input.engine === 'air' || input.engine === 'ast' ? input.engine : 'rules',
  };
}
