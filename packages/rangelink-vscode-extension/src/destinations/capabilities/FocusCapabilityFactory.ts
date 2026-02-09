import type { Logger } from 'barebone-logger';
import type * as vscode from 'vscode';

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
    private readonly logger: Logger,
  ) {}

  createEditorCapability(editor: vscode.TextEditor): FocusCapability {
    return new EditorFocusCapability(
      this.ideAdapter,
      editor.document.uri,
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
      new AIAssistantInsertFactory(this.ideAdapter, pasteCommands, this.logger),
      this.logger,
    );
  }
}
