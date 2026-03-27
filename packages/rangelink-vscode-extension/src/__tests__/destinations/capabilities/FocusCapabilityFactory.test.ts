import { createMockLogger } from 'barebone-logger-testing';

import { AIAssistantFocusCapability } from '../../../destinations/capabilities/AIAssistantFocusCapability';
import { EditorFocusCapability } from '../../../destinations/capabilities/EditorFocusCapability';
import { FocusCapabilityFactory } from '../../../destinations/capabilities/FocusCapabilityFactory';
import { TerminalFocusCapability } from '../../../destinations/capabilities/TerminalFocusCapability';
import { TieredFocusCapability } from '../../../destinations/capabilities/TieredFocusCapability';
import type { CustomAiAssistantConfig } from '../../../config/parseCustomAiAssistants';
import {
  createMockClipboardPreserver,
  createMockTerminal,
  createMockUri,
  createMockVscodeAdapter,
} from '../../helpers';

describe('FocusCapabilityFactory', () => {
  let factory: FocusCapabilityFactory;

  beforeEach(() => {
    const mockLogger = createMockLogger();
    const mockAdapter = createMockVscodeAdapter();
    const mockClipboardPreserver = createMockClipboardPreserver();
    factory = new FocusCapabilityFactory(mockAdapter, mockClipboardPreserver, mockLogger);
  });

  it('creates EditorFocusCapability', () => {
    const uri = createMockUri('/workspace/src/file.ts');
    const capability = factory.createEditorCapability(uri, 1);

    expect(capability).toBeInstanceOf(EditorFocusCapability);
  });

  it('creates TerminalFocusCapability', () => {
    const terminal = createMockTerminal({ name: 'zsh' });
    const capability = factory.createTerminalCapability(terminal);

    expect(capability).toBeInstanceOf(TerminalFocusCapability);
  });

  it('creates AIAssistantFocusCapability', () => {
    const capability = factory.createAIAssistantCapability(
      ['workbench.action.chat.open'],
      ['editor.action.clipboardPasteAction'],
    );

    expect(capability).toBeInstanceOf(AIAssistantFocusCapability);
  });

  describe('createCustomAIAssistantCapability', () => {
    it('creates TieredFocusCapability with all three tiers', () => {
      const config: CustomAiAssistantConfig = {
        kind: 'custom-ai:acme.spark-ai',
        extensionId: 'acme.spark-ai',
        extensionName: 'Spark AI',
        insertCommands: [{ command: 'sparkAi.insertText' }],
        focusAndPasteCommands: ['sparkAi.openChat'],
        focusCommands: ['sparkAi.chatView.focus'],
      };

      const capability = factory.createCustomAIAssistantCapability(config);

      expect(capability).toBeInstanceOf(TieredFocusCapability);
    });

    it('creates TieredFocusCapability with only focusCommands', () => {
      const config: CustomAiAssistantConfig = {
        kind: 'custom-ai:acme.spark-ai',
        extensionId: 'acme.spark-ai',
        extensionName: 'Spark AI',
        focusCommands: ['sparkAi.chatView.focus'],
      };

      const capability = factory.createCustomAIAssistantCapability(config);

      expect(capability).toBeInstanceOf(TieredFocusCapability);
    });

    it('creates TieredFocusCapability with only insertCommands', () => {
      const config: CustomAiAssistantConfig = {
        kind: 'custom-ai:acme.spark-ai',
        extensionId: 'acme.spark-ai',
        extensionName: 'Spark AI',
        insertCommands: [{ command: 'sparkAi.insertText' }],
      };

      const capability = factory.createCustomAIAssistantCapability(config);

      expect(capability).toBeInstanceOf(TieredFocusCapability);
    });
  });
});
