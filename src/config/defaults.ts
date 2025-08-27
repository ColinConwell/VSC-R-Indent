/**
 * Default configuration values for R indent extension
 */

import { RIndentConfig } from './types.js';

export const DEFAULT_CONFIG: RIndentConfig = {
  enablePipeAlignment: true,
  pipeIndentSize: 2,
  alignFunctionArguments: true,
  bracketAlignment: 'afterBracket',
  rstudioCompatibility: true,
  enableDebugLogging: false,
  trimWhitespaceLines: false,
  useTabOnHangingIndent: false,
  keepHangingBracketOnLine: false,
};

export const RSTUDIO_COMPATIBLE_CONFIG: RIndentConfig = {
  enablePipeAlignment: true,
  pipeIndentSize: 2,
  alignFunctionArguments: true,
  bracketAlignment: 'afterBracket',
  rstudioCompatibility: true,
  enableDebugLogging: false,
  trimWhitespaceLines: false,
  useTabOnHangingIndent: false,
  keepHangingBracketOnLine: false,
};

export const MINIMAL_CONFIG: RIndentConfig = {
  enablePipeAlignment: false,
  pipeIndentSize: 2,
  alignFunctionArguments: false,
  bracketAlignment: 'standardIndent',
  rstudioCompatibility: false,
  enableDebugLogging: false,
  trimWhitespaceLines: true,
  useTabOnHangingIndent: false,
  keepHangingBracketOnLine: true,
};



