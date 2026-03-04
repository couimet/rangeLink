import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

import type { ClipboardPreserver } from '../../clipboard/ClipboardPreserver';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';

import { AIAssistantFocusCapability } from './AIAssistantFocusCapability';
import { EditorFocusCapability } from './EditorFocusCapability';
import type { FocusCapability } from './FocusCapability';
import {
  AIAssistantInsertFactory,
  EditorInsertFactory,
  TerminalInsertFactory,
} from './insertFactories';
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
      new TerminalInsertFactory(this.ideAdapter, this.logger),
      this.logger,
    );
  }

  createAIAssistantCapability(focusCommands: string[], pasteCommands: string[]): FocusCapability {
    return new AIAssistantFocusCapability(
      this.ideAdapter,
      focusCommands,
      new AIAssistantInsertFactory(this.ideAdapter, pasteCommands, this.clipboardPreserver, this.logger),
      this.logger,
    );
  }
}
