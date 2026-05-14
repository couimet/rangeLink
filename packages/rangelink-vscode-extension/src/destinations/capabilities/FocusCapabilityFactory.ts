import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { CustomAiAssistantConfig } from '../../config/parseCustomAiAssistants';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { FocusTier } from '../types';

import { AIAssistantFocusCapability } from './AIAssistantFocusCapability';
import type { ColdRefocusConfig } from './ColdRefocusConfig';
import { EditorFocusCapability } from './EditorFocusCapability';
import type { FocusCapability } from './FocusCapability';
import {
  AIAssistantInsertFactory,
  DirectInsertFactory,
  EditorInsertFactory,
  ManualPasteInsertFactory,
  TerminalInsertFactory,
} from './insertFactories';
import { LazyResolvedFocusCapability } from './LazyResolvedFocusCapability';
import { TerminalFocusCapability } from './TerminalFocusCapability';

/**
 * Factory for creating FocusCapability instances with InsertFactory injection.
 *
 * Creates focus capabilities with pre-configured insert factories,
 * providing symmetric implementations across all destination types.
 */
export class FocusCapabilityFactory {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly logger: Logger,
  ) {}

  createEditorCapability(uri: vscode.Uri, viewColumn: number): FocusCapability {
    return new EditorFocusCapability(
      this.ideAdapter,
      uri,
      viewColumn,
      new EditorInsertFactory(this.ideAdapter, this.logger),
      this.logger,
    );
  }

  createTerminalCapability(terminal: vscode.Terminal): FocusCapability {
    return new TerminalFocusCapability(
      this.ideAdapter,
      terminal,
      new TerminalInsertFactory(this.ideAdapter, this.logger),
      this.logger,
    );
  }

  createAIAssistantCapability(
    focusCommands: string[],
    getColdRefocus: (() => ColdRefocusConfig) | undefined,
  ): FocusCapability {
    return new AIAssistantFocusCapability(
      this.ideAdapter,
      focusCommands,
      getColdRefocus,
      new AIAssistantInsertFactory(this.ideAdapter, this.logger),
      this.logger,
    );
  }

  /**
   * Build the ordered FocusTier list from a custom AI assistant config.
   *
   * Exposed as a separate method so callers (e.g., built-in override logic)
   * can build user tiers and append fallback tiers before creating the capability.
   */
  buildCustomAIAssistantTiers(config: CustomAiAssistantConfig): FocusTier[] {
    const tiers: FocusTier[] = [];

    if (config.insertCommands && config.insertCommands.length > 0) {
      tiers.push({
        commands: config.insertCommands.map((e) => e.command),
        insertFactory: new DirectInsertFactory(this.ideAdapter, config.insertCommands, this.logger),
        label: 'insertCommands',
        probeMode: 'none',
      });
    }

    if (config.focusAndPasteCommands && config.focusAndPasteCommands.length > 0) {
      tiers.push({
        commands: config.focusAndPasteCommands,
        insertFactory: this.createStandardAIAssistantInsertFactory(),
        label: 'focusAndPasteCommands',
        probeMode: 'execute',
      });
    }

    if (config.focusCommands && config.focusCommands.length > 0) {
      tiers.push({
        commands: config.focusCommands,
        insertFactory: new ManualPasteInsertFactory(this.logger),
        label: 'focusCommands',
        probeMode: 'execute',
      });
    }

    return tiers;
  }

  /**
   * Create a FocusTier for built-in focus+paste commands (used as fallback tier).
   */
  buildBuiltinFallbackTier(focusCommands: readonly string[]): FocusTier {
    return {
      commands: focusCommands,
      insertFactory: this.createStandardAIAssistantInsertFactory(),
      label: 'builtinFallback',
      probeMode: 'execute',
    };
  }

  private createStandardAIAssistantInsertFactory(): AIAssistantInsertFactory {
    return new AIAssistantInsertFactory(this.ideAdapter, this.logger);
  }

  /**
   * Create a LazyResolvedFocusCapability from pre-built tiers.
   *
   * Resolution happens on first focus() call: getCommands() is called once,
   * the winning tier is cached, and all subsequent focus() calls use the
   * resolved tier directly.
   */
  createLazyResolvedCapability(
    tiers: readonly FocusTier[],
    logPrefix: string,
    fallbackTierIndex?: number,
  ): LazyResolvedFocusCapability {
    return new LazyResolvedFocusCapability(
      this.ideAdapter,
      tiers,
      this.logger,
      logPrefix,
      fallbackTierIndex,
    );
  }
}
