/**
 * Configuration management for R indent extension
 */

import * as vscode from 'vscode';
import { RIndentConfig } from './types.js';
import { DEFAULT_CONFIG } from './defaults.js';

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  
  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }
  
  /**
   * Get current configuration by merging user settings with defaults
   */
  public getConfig(): RIndentConfig {
    const config = vscode.workspace.getConfiguration('rIndent');
    
    return {
      enablePipeAlignment: config.get('enablePipeAlignment', DEFAULT_CONFIG.enablePipeAlignment),
      pipeIndentSize: config.get('pipeIndentSize', DEFAULT_CONFIG.pipeIndentSize),
      alignFunctionArguments: config.get('alignFunctionArguments', DEFAULT_CONFIG.alignFunctionArguments),
      bracketAlignment: config.get('bracketAlignment', DEFAULT_CONFIG.bracketAlignment),
      rstudioCompatibility: config.get('rstudioCompatibility', DEFAULT_CONFIG.rstudioCompatibility),
      enableDebugLogging: config.get('enableDebugLogging', DEFAULT_CONFIG.enableDebugLogging),
      trimWhitespaceLines: config.get('trimWhitespaceLines', DEFAULT_CONFIG.trimWhitespaceLines),
      useTabOnHangingIndent: config.get('useTabOnHangingIndent', DEFAULT_CONFIG.useTabOnHangingIndent),
      keepHangingBracketOnLine: config.get('keepHangingBracketOnLine', DEFAULT_CONFIG.keepHangingBracketOnLine),
    };
  }
  
  /**
   * Watch for configuration changes
   */
  public onConfigurationChanged(callback: (config: RIndentConfig) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('rIndent')) {
        callback(this.getConfig());
      }
    });
  }
  
  /**
   * Get editor-specific settings (tab size, insert spaces)
   */
  public getEditorConfig(): { tabSize: number; insertSpaces: boolean } {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return { tabSize: 2, insertSpaces: true };
    }
    
    const options = editor.options;
    return {
      tabSize: typeof options.tabSize === 'number' ? options.tabSize : 2,
      insertSpaces: typeof options.insertSpaces === 'boolean' ? options.insertSpaces : true,
    };
  }
  
  /**
   * Create indentation string based on editor settings
   */
  public createIndent(level: number): string {
    const editorConfig = this.getEditorConfig();
    
    if (editorConfig.insertSpaces) {
      return ' '.repeat(level * editorConfig.tabSize);
    } else {
      return '\t'.repeat(level);
    }
  }
  
  /**
   * Calculate indentation level from whitespace string
   */
  public getIndentLevel(whitespace: string): number {
    const editorConfig = this.getEditorConfig();
    
    if (editorConfig.insertSpaces) {
      return Math.floor(whitespace.length / editorConfig.tabSize);
    } else {
      return whitespace.length; // Each tab is one level
    }
  }
}



