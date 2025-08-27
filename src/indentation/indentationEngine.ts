/**
 * Main indentation engine that coordinates all rules
 */

import * as vscode from 'vscode';
import { IndentationContext, IndentationRule, RIndentConfig } from '../config/types.js';
import { ConfigurationManager } from '../config/settings.js';
import { BracketAlignmentRule, HangingIndentRule, ClosingBracketRule } from '../rules/BracketRules.js';
// Removed PipeChain rules - now handled by OperatorChain
// Removed PlusChain rules - now handled by OperatorChain
import { OperatorChainRule } from '../rules/OperatorChainRules.js';
import { DebugLogger } from '../utils/debugUtils.js';

export class IndentationEngine {
  private rules: IndentationRule[] = [];
  private config: RIndentConfig;
  private configManager: ConfigurationManager;
  private lastAppliedRule: string | null = null;
  
  constructor() {
    this.configManager = ConfigurationManager.getInstance();
    this.config = this.configManager.getConfig();
    this.initializeRules();
    
    // Watch for configuration changes
    this.configManager.onConfigurationChanged((newConfig) => {
      this.config = newConfig;
    });
  }
  
  private initializeRules(): void {
    this.rules = [
      // General operator chain rules (highest priority - handles all operators)
      new OperatorChainRule(),
      
      // Bracket rules
      new BracketAlignmentRule(),
      new HangingIndentRule(),
      new ClosingBracketRule(),
    ];
    
    // Sort rules by priority (highest first)
    this.rules.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Calculate indentation for Enter key press
   */
  public calculateEnterIndentation(
    document: vscode.TextDocument,
    position: vscode.Position
  ): string | null {
    const context = this.createContext(document, position, true);
    return this.applyRules(context);
  }
  
  /**
   * Calculate indentation for typing a character
   */
  public calculateTypeIndentation(
    document: vscode.TextDocument,
    position: vscode.Position,
    character: string
  ): string | null {
    const context = this.createContext(document, position, false, character);
    return this.applyRules(context);
  }
  
  private createContext(
    document: vscode.TextDocument,
    position: vscode.Position,
    isEnterKey: boolean,
    triggerChar?: string
  ): IndentationContext {
    const line = document.lineAt(position.line);
    const lineText = line.text;
    const currentIndent = this.extractIndentation(lineText);
    
    return {
      line: position.line,
      column: position.character,
      lineText,
      currentIndent,
      triggerChar,
      isEnterKey,
    };
  }
  
  private applyRules(context: IndentationContext): string | null {
    for (const rule of this.rules) {
      try {
        const applies = rule.applies(context, this.config);
        
        if (applies) {
          const indentation = rule.getIndentation(context, this.config);
          
          if (indentation !== null) {
            this.lastAppliedRule = rule.name;
            return indentation;
          } else {
            DebugLogger.log(`Line ${context.line}: ${rule.name} → ❌ returned null`);
          }
        }
      } catch (error) {
        DebugLogger.log(`Line ${context.line}: Error in rule ${rule.name}: ${error}`);
      }
    }
    

    this.lastAppliedRule = null;
    return null;
  }
  
  public getLastAppliedRule(): string | null {
    return this.lastAppliedRule;
  }
  
  private extractIndentation(lineText: string): string {
    const match = lineText.match(/^\s*/);
    return match ? match[0] : '';
  }
  
  private debugLog(message: string): void {
    if (this.config.enableDebugLogging) {
      console.log(`[R Indent] ${message}`);
    }
  }
  
  /**
   * Update configuration
   */
  public updateConfig(newConfig: RIndentConfig): void {
    this.config = newConfig;
  }
  
  /**
   * Get current configuration
   */
  public getConfig(): RIndentConfig {
    return { ...this.config };
  }
  
  /**
   * Add a custom rule
   */
  public addRule(rule: IndentationRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Remove a rule by name
   */
  public removeRule(ruleName: string): void {
    this.rules = this.rules.filter(rule => rule.name !== ruleName);
  }
}



