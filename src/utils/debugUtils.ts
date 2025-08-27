/**
 * Streamlined debugging utilities for R indent extension
 */

import { ConfigurationManager } from '../config/settings.js';

export class DebugLogger {
  private static configManager = ConfigurationManager.getInstance();
  
  /**
   * Log successful rule application - clean, minimal format
   */
  public static logRuleSuccess(ruleName: string, lineNumber: number, indentSize: number): void {
    const config = this.configManager.getConfig();
    if (config.enableDebugLogging) {
      console.log(`[R Indent] ${ruleName}: Line ${lineNumber} → ${indentSize} spaces`);
    }
  }
  
  /**
   * Log when no rules apply (fallback to VSCode)
   */
  public static logNoRuleApplied(lineNumber: number): void {
    const config = this.configManager.getConfig();
    if (config.enableDebugLogging) {
      console.log(`[R Indent] No rule applied: Line ${lineNumber} → VSCode default`);
    }
  }
  
  /**
   * Log when VSCode default is bypassed
   */
  public static logBypassDefault(lineNumber: number): void {
    const config = this.configManager.getConfig();
    if (config.enableDebugLogging) {
      console.log(`[R Indent] Bypassed default: Line ${lineNumber} → No indent`);
    }
  }
}
