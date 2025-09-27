/**
 * Main indentation engine that coordinates all rules
 */

import * as vscode from 'vscode';
import { IndentationContext, IndentationRule, RIndentConfig } from '../config/types.js';
import { ConfigurationManager } from '../config/settings.js';
import { DebugLogger } from '../utils/debugUtils.js';
import { BracketAlignmentRule, HangingIndentRule, ClosingBracketRule, ClosingBracketContextRule } from '../rules/BracketRules.js';
import { ParameterAssignmentRule } from '../rules/ParameterRules.js';
// Removed PipeChain rules - now handled by OperatorChain
// Removed PlusChain rules - now handled by OperatorChain
import { OperatorChainRule } from '../rules/OperatorChainRules.js';

export class IndentationEngine {
  private rules: IndentationRule[] = [];
  private config: RIndentConfig;
  private configManager: ConfigurationManager;
  private lastAppliedRule: string | null = null;
  private lastLayerContributions: Array<{layer: string; rules: string[]; indent: number}> = [];
  
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
      
      // Parameter assignment rules (higher than bracket alignment)
      new ParameterAssignmentRule(),
      
      // Bracket rules
      new BracketAlignmentRule(),
      new HangingIndentRule(),
      new ClosingBracketContextRule(), // About to close function call
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
    // Handle on-type closing bracket dedent directly
    if (/^[)\]}]$/.test(character)) {
      const opener = this.findNearestOpeningBracket(document, position);
      if (opener) {
        const openerLine = document.lineAt(opener.line);
        const baseIndent = openerLine.text.match(/^\s*/)?.[0] ?? '';
        return baseIndent;
      }
      // If no opener found, fall through to rule-based handling
    }

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
    const timestamp = new Date().toLocaleTimeString();
    const line = context.lineText.trim();
    
    // Check all rules and collect their evaluations
    const ruleEvaluations: Array<{
      name: string;
      applies: boolean;
      indentSize: number;
      explanation: string;
      baseLineNumber?: number;
      baseLine?: string;
    }> = [];
    
    let applicableRulesCount = 0;
    
    for (const rule of this.rules) {
      try {
        const applies = rule.applies(context, this.config);
        let indentSize = 0;
        let explanation = '';
        let baseLineNumber: number | undefined;
        let baseLine: string | undefined;
        
        if (applies) {
          const indentation = rule.getIndentation(context, this.config);
          if (indentation !== null) {
            indentSize = indentation.length;
            applicableRulesCount++;
            
            // Get rule-specific explanation
            if (rule instanceof BracketAlignmentRule) {
              explanation = this.getBracketRuleExplanation(context, indentSize);
            } else if (rule instanceof OperatorChainRule) {
              const chainInfo = this.getOperatorChainExplanation(context, indentSize);
              explanation = chainInfo.explanation;
              baseLineNumber = chainInfo.baseLineNumber;
              baseLine = chainInfo.baseLine;
            } else if (rule.name === 'ParameterAssignment') {
              explanation = this.getParameterRuleExplanation(context, indentSize);
            }
          }
        }
        
        ruleEvaluations.push({
          name: rule.name,
          applies,
          indentSize,
          explanation,
          baseLineNumber,
          baseLine
        });
      } catch (error) {
        ruleEvaluations.push({
          name: rule.name,
          applies: false,
          indentSize: 0,
          explanation: `Error: ${error}`
        });
      }
    }
    
    // Log comprehensive rule check
    this.logRuleCheck(timestamp, context, ruleEvaluations, applicableRulesCount);
    
    // Apply cooperative rules logic
    const finalIndent = this.calculateCooperativeIndent(context, ruleEvaluations);
    
    if (finalIndent !== null) {
      this.logIndentApplication(timestamp, context, finalIndent, ruleEvaluations);
      return finalIndent;
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
   * Find the nearest unmatched opening bracket to the left of the given position
   * (scans backward across lines, pairing brackets as encountered)
   */
  private findNearestOpeningBracket(
    document: vscode.TextDocument,
    position: vscode.Position
  ): { line: number; column: number; bracketType: '(' | '[' | '{' } | null {
    let bracketStack: Array<{ type: string; line: number; column: number }> = [];
    let currentLine = position.line;
    let currentColumn = position.character;

    while (currentLine >= 0) {
      const line = document.lineAt(currentLine);
      const lineText = line.text;
      const searchEnd = currentLine === position.line ? currentColumn : lineText.length;

      for (let col = searchEnd - 1; col >= 0; col--) {
        const char = lineText[col];
        if (char === ')' || char === ']' || char === '}') {
          bracketStack.push({ type: char, line: currentLine, column: col });
        } else if (char === '(' || char === '[' || char === '{') {
          if (bracketStack.length > 0) {
            const last = bracketStack[bracketStack.length - 1];
            const matching = (char === '(' && last.type === ')') ||
                             (char === '[' && last.type === ']') ||
                             (char === '{' && last.type === '}');
            if (matching) {
              bracketStack.pop();
            } else {
              // Different kind of bracket encountered; continue scanning
            }
          } else {
            return { line: currentLine, column: col, bracketType: char as '(' | '[' | '{' };
          }
        }
      }

      currentLine--;
      currentColumn = 0;
    }

    return null;
  }

  
  /**
   * Calculate proximity-based additive indentation by combining rules in context layers
   */
  private calculateCooperativeIndent(context: IndentationContext, ruleEvaluations: any[]): string | null {
    const applicableRules = ruleEvaluations.filter(r => r.applies);
    
    if (applicableRules.length === 0) {
      return null;
    }
    
    // Check for terminating rules (closing bracket contexts override everything)
    const closingBracketContextRule = applicableRules.find(r => r.name === 'ClosingBracketContext');
    if (closingBracketContextRule) {
      // ClosingBracketContext terminates - get the actual indentation from the rule
      const rule = this.rules.find(r => r.name === 'ClosingBracketContext');
      const indentation = rule?.getIndentation(context, this.config);
      if (indentation !== null && indentation !== undefined) {
        this.lastLayerContributions = [{
          layer: 'Function Close Context',
          rules: ['ClosingBracketContext'],
          indent: indentation.length
        }];
        return indentation;
      }
    }
    
    const closingBracketRule = applicableRules.find(r => r.name === 'ClosingBracket');
    if (closingBracketRule) {
      // ClosingBracket should preserve outer bracket alignment but reset immediate context
      const bracketRule = applicableRules.find(r => r.name === 'BracketAlignment');
      if (bracketRule) {
        // We're still inside outer brackets - use bracket alignment
        this.lastLayerContributions = [{
          layer: 'Reset to Outer Context',
          rules: ['BracketAlignment'],
          indent: bracketRule.indentSize
        }];
        return ' '.repeat(bracketRule.indentSize);
      } else {
        // No outer brackets - return to column 0
        this.lastLayerContributions = [{
          layer: 'Reset to Top Level',
          rules: ['ClosingBracket'],
          indent: 0
        }];
        return '';
      }
    }
    
    // Filter out zero-indent rules for additive logic
    const positiveRules = applicableRules.filter(r => r.indentSize > 0);
    if (positiveRules.length === 0) {
      return null;
    }
    
    // Use proximity-based additive approach: build indentation from base outward
    let totalIndent = 0;
    let appliedRules: string[] = [];
    const layerContributions: Array<{layer: string; rules: string[]; indent: number}> = [];
    
    // Find if we have a base position provider (BracketAlignment)
    const bracketRule = positiveRules.find(r => r.name === 'BracketAlignment');
    const basePosition = bracketRule ? bracketRule.indentSize : 0;
    
    // Layer 1: Immediate context (parameter assignment, operator continuation)
    const immediateRules = positiveRules.filter(r => 
      r.name === 'ParameterAssignment' || r.name === 'OperatorChain'
    );
    let immediateIndent = 0;
    const immediateRuleNames: string[] = [];
    for (const rule of immediateRules) {
      immediateIndent += rule.indentSize;
      immediateRuleNames.push(rule.name);
      appliedRules.push(rule.name);
    }
    if (immediateIndent > 0) {
      layerContributions.push({
        layer: 'Immediate',
        rules: immediateRuleNames,
        indent: immediateIndent
      });
    }
    
    // Layer 2: Surrounding context (bracket alignment, hanging indent)
    const surroundingRules = positiveRules.filter(r => 
      r.name === 'BracketAlignment' || r.name === 'HangingIndent'
    );
    let surroundingIndent = 0;
    const surroundingRuleNames: string[] = [];
    for (const rule of surroundingRules) {
      surroundingIndent += rule.indentSize;
      surroundingRuleNames.push(rule.name);
      appliedRules.push(rule.name);
    }
    if (surroundingIndent > 0) {
      layerContributions.push({
        layer: 'Surrounding',
        rules: surroundingRuleNames,
        indent: surroundingIndent
      });
    }
    
    // Calculate total: base position + immediate additions
    if (bracketRule) {
      totalIndent = basePosition + immediateIndent;
    } else {
      totalIndent = immediateIndent + surroundingIndent;
    }
    
    // Layer 3: Outer context (closing brackets)
    const outerRules = applicableRules.filter(r => 
      r.name === 'ClosingBracket'
    );
    let outerIndent = 0;
    const outerRuleNames: string[] = [];
    for (const rule of outerRules) {
      outerIndent += rule.indentSize;
      outerRuleNames.push(rule.name);
      appliedRules.push(rule.name);
    }
    if (outerIndent > 0) {
      layerContributions.push({
        layer: 'Outer',
        rules: outerRuleNames,
        indent: outerIndent
      });
      totalIndent += outerIndent;
    }
    
    // Store layer information for debug logging
    this.lastLayerContributions = layerContributions;
    this.lastAppliedRule = appliedRules.length > 0 ? appliedRules.join('+') : null;
    
    return totalIndent > 0 ? ' '.repeat(totalIndent) : null;
  }
  
  /**
   * Log comprehensive rule check
   */
  private logRuleCheck(timestamp: string, context: IndentationContext, evaluations: any[], applicableCount: number): void {
    if (!this.config.enableDebugLogging) return;
    
    const line = context.lineText.trim();
    DebugLogger.log(`[${timestamp}] Auto-Indent Check at Line ${context.line}, Column ${context.column}: "${line}"`);
    DebugLogger.log(`    ${applicableCount} Rules apply up to:`);
    
    // Find top-level indent line
    const topLevelLine = this.findTopLevelIndentLine(context);
    if (topLevelLine !== null) {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const topLine = editor.document.lineAt(topLevelLine);
        DebugLogger.log(`        Line ${topLevelLine}: "${topLine.text.trim()}"`);
      }
    }
    
    // Log each rule evaluation
    for (const evaluation of evaluations) {
      const symbol = evaluation.applies ? '✓' : '✗';
      if (evaluation.applies) {
        DebugLogger.log(`   ${evaluation.name} applies? ${symbol} | Indent: ${evaluation.indentSize}`);
        if (evaluation.explanation) {
          DebugLogger.log(`        ${evaluation.explanation}`);
        }
        if (evaluation.baseLine) {
          DebugLogger.log(`        Line ${evaluation.baseLineNumber}: "${evaluation.baseLine}"`);
        }
      } else {
        DebugLogger.log(`   ${evaluation.name} applies? ${symbol}`);
      }
    }
  }
  
  /**
   * Log indent application
   */
  private logIndentApplication(timestamp: string, context: IndentationContext, finalIndent: string, evaluations: any[]): void {
    if (!this.config.enableDebugLogging) return;
    
    DebugLogger.log(`[${timestamp}] Auto-Indent of ${finalIndent.length} applied at Line ${context.line + 1}, Column 0`);
    
    // Explain the indent calculation with base + additions logic
    const applicableRules = evaluations.filter(r => r.applies && r.indentSize > 0);
    const bracketRule = applicableRules.find(r => r.name === 'BracketAlignment');
    const immediateRules = applicableRules.filter(r => r.name === 'ParameterAssignment' || r.name === 'OperatorChain');
    
    if (applicableRules.length === 1) {
      const rule = applicableRules[0];
      DebugLogger.log(`     ${rule.name} rule: ${finalIndent.length} spaces`);
      
      // Add detailed explanation for bracket alignment
      if (rule.name === 'BracketAlignment' && rule.explanation) {
        DebugLogger.log(`       ${rule.explanation}`);
      }
    } else if (bracketRule && immediateRules.length > 0) {
      DebugLogger.log(`     Base + Additions (total: ${finalIndent.length} spaces):`);
      DebugLogger.log(`       Base: ${bracketRule.name} → ${bracketRule.indentSize} spaces`);
      const immediateTotal = immediateRules.reduce((sum, r) => sum + r.indentSize, 0);
      DebugLogger.log(`       Additions: ${immediateRules.map(r => r.name).join(', ')} → +${immediateTotal} spaces`);
    } else if (this.lastLayerContributions.length > 0) {
      DebugLogger.log(`     Proximity-based layers (total: ${finalIndent.length} spaces):`);
      for (const layer of this.lastLayerContributions) {
        const ruleList = layer.rules.join(', ');
        DebugLogger.log(`       ${layer.layer}: ${ruleList} → +${layer.indent} spaces`);
      }
    } else {
      DebugLogger.log(`     Multiple rules applied: ${this.lastAppliedRule} → ${finalIndent.length} spaces`);
    }
  }
  
  /**
   * Find the top-level indent line (where indentation ceases) for current expression
   */
  private findTopLevelIndentLine(context: IndentationContext): number | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    
    const document = editor.document;
    
    // Start from current line and go backwards to find expression start
    for (let lineNum = context.line; lineNum >= 0; lineNum--) {
      const line = document.lineAt(lineNum);
      const trimmed = line.text.trim();
      
      // Skip empty lines
      if (trimmed.length === 0) {
        continue;
      }
      
      // If we find a line with no indentation, it's the start of this expression
      if (!line.text.startsWith(' ') && !line.text.startsWith('\t')) {
        return lineNum;
      }
      
      // Stop if we find an empty line that separates expressions
      if (lineNum > 0) {
        const prevLine = document.lineAt(lineNum - 1);
        if (prevLine.text.trim().length === 0) {
          // Check if the line before the empty line has no indentation
          if (lineNum > 1) {
            const beforeEmptyLine = document.lineAt(lineNum - 2);
            if (beforeEmptyLine.text.trim().length > 0 && 
                !beforeEmptyLine.text.startsWith(' ') && 
                !beforeEmptyLine.text.startsWith('\t')) {
              return lineNum; // Current line is start of new expression
            }
          }
        }
      }
    }
    
    return 0; // Beginning of file
  }
  
  /**
   * Get bracket rule explanation
   */
  private getBracketRuleExplanation(context: IndentationContext, indentSize: number): string {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return `Bracket alignment to column ${indentSize}`;
    
    // Find the bracket that's being aligned to
    const position = new vscode.Position(context.line, context.column);
    
    // Use BracketAlignmentRule's bracket finding method
    const bracketRule = this.rules.find(r => r.name === 'BracketAlignment') as BracketAlignmentRule;
    if (bracketRule) {
      const bracketResult = (bracketRule as any).findNearestOpeningBracket(editor.document, position);
      if (bracketResult) {
        const bracketLine = editor.document.lineAt(bracketResult.line);
        const functionMatch = bracketLine.text.substring(0, bracketResult.column).match(/(\w+)\s*$/);
        const functionName = functionMatch ? functionMatch[1] : 'function';
        return `Align to ${functionName}( at line ${bracketResult.line + 1}, column ${bracketResult.column + 1}`;
      }
    }
    
    return `Bracket alignment to column ${indentSize}`;
  }

  /**
   * Get parameter assignment rule explanation
   */
  private getParameterRuleExplanation(context: IndentationContext, indentSize: number): string {
    return `Parameter value: +${indentSize} spaces`;
  }
  
  /**
   * Get operator chain explanation
   */
  private getOperatorChainExplanation(context: IndentationContext, indentSize: number): { explanation: string; baseLineNumber?: number; baseLine?: string } {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return { explanation: 'Operator chain indentation' };
    
    const document = editor.document;
    
    // Find the base line of the chain within current expression bounds
    let baseLineNumber = context.line;
    const expressionStartLine = this.findTopLevelIndentLine(context) || 0;
    
    // Only traverse within the current expression
    while (baseLineNumber > expressionStartLine) {
      const line = document.lineAt(baseLineNumber - 1);
      const trimmed = line.text.trim();
      
      // Check if previous line is part of the same chain
      if (!trimmed.endsWith('+') && !trimmed.endsWith('%>%') && !trimmed.endsWith('=') && 
          !trimmed.endsWith('<-') && !trimmed.endsWith('->') && !trimmed.endsWith('|>')) {
        break;
      }
      
      // Stop at expression boundaries (empty lines followed by non-indented lines)
      if (trimmed.length === 0) {
        break;
      }
      
      baseLineNumber--;
    }
    
    const baseLine = document.lineAt(baseLineNumber).text.trim();
    const baseIndent = document.lineAt(baseLineNumber).text.match(/^\s*/)?.[0]?.length || 0;
    const operatorIndent = indentSize - baseIndent;
    
    return {
      explanation: `Base indent: ${baseIndent} + operator indent: ${operatorIndent} = ${indentSize} spaces`,
      baseLineNumber,
      baseLine
    };
  }
}



