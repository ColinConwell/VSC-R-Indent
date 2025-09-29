/**
 * Debug utilities for R indent extension using VSCode Output channel
 */

import * as vscode from 'vscode';
import { ConfigurationManager } from '../config/settings.js';

export class DebugLogger {
  private static outputChannel: vscode.OutputChannel | null = null;
  private static configManager = ConfigurationManager.getInstance();
  private static lastBuffer: string[] = [];

  /**
   * Initialize the output channel
   */
  public static initialize(): void {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel('R Indent');
      // Always log activation regardless of debug setting
      const timestamp = new Date().toLocaleTimeString();
      this.outputChannel.appendLine(`[${timestamp}] R Indent extension activated`);
    }
  }

  /**
   * Dispose of the output channel
   */
  public static dispose(): void {
    if (this.outputChannel) {
      this.outputChannel.dispose();
      this.outputChannel = null;
    }
  }

  /**
   * Log a message to the output channel if debug logging is enabled (with timestamp)
   */
  private static logWithTimestamp(message: string): void {
    const config = this.configManager.getConfig();
    if (config.enableDebugLogging && this.outputChannel) {
      const timestamp = new Date().toLocaleTimeString();
      this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }
  }
  
  /**
   * Log a message to the output channel if debug logging is enabled (without timestamp)
   */
  public static log(message: string): void {
    const config = this.configManager.getConfig();
    if (config.enableDebugLogging && this.outputChannel) {
      this.outputChannel.appendLine(message);
      // keep a small rolling buffer for tests to inspect
      this.lastBuffer.push(message);
      if (this.lastBuffer.length > 200) this.lastBuffer.shift();
    }
  }

  /**
   * Expose recent logs (useful for automated tests)
   */
  public static getRecentLogs(): string[] {
    return [...this.lastBuffer];
  }

  /**
   * Log successful rule application
   */
  public static logRuleSuccess(ruleName: string, lineNumber: number, indentSize: number): void {
    this.logWithTimestamp(`${ruleName}: Line ${lineNumber} → ${indentSize} spaces`);
  }

  /**
   * Log when no rules apply (fallback to VSCode)
   */
  public static logNoRuleApplied(lineNumber: number): void {
    this.logWithTimestamp(`No rule applied: Line ${lineNumber} → VSCode default`);
  }

  /**
   * Log when VSCode default is bypassed
   */
  public static logBypassDefault(lineNumber: number): void {
    this.logWithTimestamp(`Bypassed default: Line ${lineNumber} → No indent`);
  }
  
  /**
   * Log rule application attempts (legacy - not used in new 2-level system)
   */
  public static logRuleCheck(ruleName: string, lineNumber: number, applies: boolean): void {
    this.log(`${ruleName}: Line ${lineNumber} → ${applies ? 'APPLIES' : 'SKIPPED'}`);
  }
}
