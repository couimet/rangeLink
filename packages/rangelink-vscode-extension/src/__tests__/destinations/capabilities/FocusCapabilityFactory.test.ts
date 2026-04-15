import { createMockLogger } from 'barebone-logger-testing';

import type { CustomAiAssistantConfig } from '../../../config/parseCustomAiAssistants';
import { AIAssistantFocusCapability } from '../../../destinations/capabilities/AIAssistantFocusCapability';
import { EditorFocusCapability } from '../../../destinations/capabilities/EditorFocusCapability';
import { FocusCapabilityFactory } from '../../../destinations/capabilities/FocusCapabilityFactory';
import { LazyResolvedFocusCapability } from '../../../destinations/capabilities/LazyResolvedFocusCapability';
import { TerminalFocusCapability } from '../../../destinations/capabilities/TerminalFocusCapability';
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

  describe('buildCustomAIAssistantTiers', () => {
    it('builds tiers for all three command types', () => {
      const config: CustomAiAssistantConfig = {
        kind: 'custom-ai:acme.spark-ai',
        extensionId: 'acme.spark-ai',
        extensionName: 'Spark AI',
        insertCommands: [{ command: 'sparkAi.insertText' }],
        focusAndPasteCommands: ['sparkAi.openChat'],
        focusCommands: ['sparkAi.chatView.focus'],
      };

      const tiers = factory.buildCustomAIAssistantTiers(config);

      expect(tiers).toHaveLength(3);
      expect(tiers[0].label).toBe('insertCommands');
      expect(tiers[0].probeMode).toBe('none');
      expect(tiers[1].label).toBe('focusAndPasteCommands');
      expect(tiers[1].probeMode).toBe('execute');
      expect(tiers[2].label).toBe('focusCommands');
      expect(tiers[2].probeMode).toBe('execute');
    });

    it('builds tiers for only focusCommands', () => {
      const config: CustomAiAssistantConfig = {
        kind: 'custom-ai:acme.spark-ai',
        extensionId: 'acme.spark-ai',
        extensionName: 'Spark AI',
        focusCommands: ['sparkAi.chatView.focus'],
      };

      const tiers = factory.buildCustomAIAssistantTiers(config);

      expect(tiers).toHaveLength(1);
      expect(tiers[0].label).toBe('focusCommands');
    });

    it('builds tiers for only insertCommands', () => {
      const config: CustomAiAssistantConfig = {
        kind: 'custom-ai:acme.spark-ai',
        extensionId: 'acme.spark-ai',
        extensionName: 'Spark AI',
        insertCommands: [{ command: 'sparkAi.insertText' }],
      };

      const tiers = factory.buildCustomAIAssistantTiers(config);

      expect(tiers).toHaveLength(1);
      expect(tiers[0].label).toBe('insertCommands');
      expect(tiers[0].probeMode).toBe('none');
    });
  });

  describe('createLazyResolvedCapability', () => {
    it('creates LazyResolvedFocusCapability from tiers', () => {
      const config: CustomAiAssistantConfig = {
        kind: 'custom-ai:acme.spark-ai',
        extensionId: 'acme.spark-ai',
        extensionName: 'Spark AI',
        insertCommands: [{ command: 'sparkAi.insertText' }],
        focusAndPasteCommands: ['sparkAi.openChat'],
        focusCommands: ['sparkAi.chatView.focus'],
      };

      const tiers = factory.buildCustomAIAssistantTiers(config);
      const capability = factory.createLazyResolvedCapability(tiers, 'Spark AI');

      expect(capability).toBeInstanceOf(LazyResolvedFocusCapability);
    });
  });
});
