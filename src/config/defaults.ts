/**
 * Default configuration values for R indent extension
 */

import { RIndentConfig } from './types.js';

export const DEFAULT_CONFIG: RIndentConfig = {
  indentSize: 2,
  alignFunctionArguments: true,
  enableDebugLogging: false,
  engine: 'rules',
};

export const RSTUDIO_COMPATIBLE_CONFIG: RIndentConfig = {
  indentSize: 2,
  alignFunctionArguments: true,
  enableDebugLogging: false,
  engine: 'rules',
};

export const MINIMAL_CONFIG: RIndentConfig = {
  indentSize: 2,
  alignFunctionArguments: false,
  enableDebugLogging: false,
  engine: 'rules',
};



