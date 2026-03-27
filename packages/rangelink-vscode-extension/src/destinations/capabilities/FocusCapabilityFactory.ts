import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { ClipboardPreserver } from '../../clipboard/ClipboardPreserver';
import type { CustomAiAssistantConfig } from '../../config/parseCustomAiAssistants';
import { CHAT_PASTE_COMMANDS } from '../../constants';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import type { FocusTier } from '../types';

import { AIAssistantFocusCapability } from './AIAssistantFocusCapability';
import { EditorFocusCapability } from './EditorFocusCapability';
import type { FocusCapability } from './FocusCapability';
import {
  AIAssistantInsertFactory,
  DirectInsertFactory,
  EditorInsertFactory,
  ManualPasteInsertFactory,
  TerminalInsertFactory,
} from './insertFactories';
import { TerminalFocusCapability } from './TerminalFocusCapability';
import { TieredFocusCapability } from './TieredFocusCapability';

/**
 * Factory for creating FocusCapability instances with InsertFactory injection.
 *
 * Creates focus capabilities with pre-configured insert factories,
 * providing symmetric implementations across all destination types.
 */
export class FocusCapabilityFactory {
  constructor(
    private readonly ideAdapter: VscodeAdapter,
    private readonly clipboardPreserver: ClipboardPreserver,
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
      new TerminalInsertFactory(this.ideAdapter, this.clipboardPreserver, this.logger),
      this.logger,
    );
  }

  createAIAssistantCapability(focusCommands: string[], pasteCommands: string[]): FocusCapability {
    return new AIAssistantFocusCapability(
      this.ideAdapter,
      focusCommands,
      new AIAssistantInsertFactory(
        this.ideAdapter,
        pasteCommands,
        this.clipboardPreserver,
        this.logger,
      ),
      this.logger,
    );
  }

  createCustomAIAssistantCapability(config: CustomAiAssistantConfig): TieredFocusCapability {
    const tiers: FocusTier[] = [];

    if (config.insertCommands && config.insertCommands.length > 0) {
      tiers.push({
        commands: config.insertCommands.map((e) => e.command),
        insertFactory: new DirectInsertFactory(this.ideAdapter, config.insertCommands, this.logger),
        label: 'insertCommands',
      });
    }

    if (config.focusAndPasteCommands && config.focusAndPasteCommands.length > 0) {
      tiers.push({
        commands: config.focusAndPasteCommands,
        insertFactory: new AIAssistantInsertFactory(
          this.ideAdapter,
          [...CHAT_PASTE_COMMANDS],
          this.clipboardPreserver,
          this.logger,
        ),
        label: 'focusAndPasteCommands',
      });
    }

    if (config.focusCommands && config.focusCommands.length > 0) {
      tiers.push({
        commands: config.focusCommands,
        insertFactory: new ManualPasteInsertFactory(this.ideAdapter, this.logger),
        label: 'focusCommands',
      });
    }

    return new TieredFocusCapability(this.ideAdapter, tiers, this.logger);
  }
}
