/**
 * Centralized debugging utilities for R indent extension
 */

import { ConfigurationManager } from '../config/settings.js';

export class DebugLogger {
  private static configManager = ConfigurationManager.getInstance();
  
  /**
   * Log a message only if debug logging is enabled
   */
  public static log(message: string, category: string = 'General'): void {
    const config = this.configManager.getConfig();
    if (config.enableDebugLogging) {
      console.log(`[R Indent] ${message}`);
    }
  }
  
  /**
   * Log rule application in simplified format
   */
  public static logRuleApplication(
    ruleName: string,
    indentation: string,
    lineNumber: number,
    success: boolean
  ): void {
    const config = this.configManager.getConfig();
    if (config.enableDebugLogging) {
      const status = success ? 'Success' : 'Failed';
      console.log(`[R Indent] ${ruleName}: ${lineNumber} | ${indentation.length} (${status})`);
    }
  }
  
  /**
   * Log parser results
   */
  public static logParserResult(pipes: any[], brackets: any[], lineNumber: number): void {
    const config = this.configManager.getConfig();
    if (config.enableDebugLogging) {
      console.log(`[R Indent Parser] Line ${lineNumber} | Pipes: ${pipes.length} | Open brackets: ${brackets.length}`);
    }
  }
}
