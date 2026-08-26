import type { CustomAiAssistantConfig } from '../../../config/parseCustomAiAssistants';
import { AIAssistantFocusCapability } from '../../../destinations/capabilities/AIAssistantFocusCapability';
import { EditorFocusCapability } from '../../../destinations/capabilities/EditorFocusCapability';
import { FocusCapabilityFactory } from '../../../destinations/capabilities/FocusCapabilityFactory';
import { LazyResolvedFocusCapability } from '../../../destinations/capabilities/LazyResolvedFocusCapability';
import { TerminalFocusCapability } from '../../../destinations/capabilities/TerminalFocusCapability';
import type { FocusStages } from '../../../destinations/types';
import { createMockClipboardService, createMockTerminal, createMockTerminalPasteService, createMockUri, createMockVscodeAdapter } from '../../helpers';

import { createMockLogger } from '@couimet/logger-contract-testing';

describe('FocusCapabilityFactory', () => {
  let factory: FocusCapabilityFactory;

  beforeEach(() => {
    const mockLogger = createMockLogger();
    const mockAdapter = createMockVscodeAdapter();
    const mockTerminalPasteService = createMockTerminalPasteService();
    factory = new FocusCapabilityFactory(mockAdapter, mockTerminalPasteService, createMockClipboardService(), mockLogger);
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
    const capability = factory.createAIAssistantCapability([['workbench.action.chat.open']], undefined);

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

      // Each tier also carries an insertFactory instance; assert the deterministic tier fields
      expect(tiers.map((tier) => ({ label: tier.label, probeMode: tier.probeMode, commands: tier.commands }))).toStrictEqual([
        { label: 'insertCommands', probeMode: 'none', commands: [['sparkAi.insertText']] },
        { label: 'focusAndPasteCommands', probeMode: 'execute', commands: [['sparkAi.openChat']] },
        { label: 'focusCommands', probeMode: 'execute', commands: [['sparkAi.chatView.focus']] },
      ]);
    });

    it('builds tiers for only focusCommands', () => {
      const config: CustomAiAssistantConfig = {
        kind: 'custom-ai:acme.spark-ai',
        extensionId: 'acme.spark-ai',
        extensionName: 'Spark AI',
        focusCommands: ['sparkAi.chatView.focus'],
      };

      const tiers = factory.buildCustomAIAssistantTiers(config);

      expect(tiers.map((tier) => ({ label: tier.label, probeMode: tier.probeMode, commands: tier.commands }))).toStrictEqual([
        { label: 'focusCommands', probeMode: 'execute', commands: [['sparkAi.chatView.focus']] },
      ]);
    });

    it('builds tiers for only insertCommands', () => {
      const config: CustomAiAssistantConfig = {
        kind: 'custom-ai:acme.spark-ai',
        extensionId: 'acme.spark-ai',
        extensionName: 'Spark AI',
        insertCommands: [{ command: 'sparkAi.insertText' }],
      };

      const tiers = factory.buildCustomAIAssistantTiers(config);

      expect(tiers.map((tier) => ({ label: tier.label, probeMode: tier.probeMode, commands: tier.commands }))).toStrictEqual([
        { label: 'insertCommands', probeMode: 'none', commands: [['sparkAi.insertText']] },
      ]);
    });
  });

  describe('buildBuiltinFallbackTier', () => {
    it('creates tier with builtinFallback label and execute probeMode', () => {
      const FOCUS_STAGES: FocusStages = [['cursorAi.focus'], ['cursorAi.sidebar.open']];

      const tier = factory.buildBuiltinFallbackTier(FOCUS_STAGES);

      expect({ label: tier.label, probeMode: tier.probeMode, commands: tier.commands }).toStrictEqual({
        label: 'builtinFallback',
        probeMode: 'execute',
        commands: FOCUS_STAGES,
      });
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
