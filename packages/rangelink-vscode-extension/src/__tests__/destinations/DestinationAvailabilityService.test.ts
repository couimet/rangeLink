import { createMockLogger } from 'barebone-logger-testing';

import { DEFAULT_TERMINAL_PICKER_MAX_INLINE } from '../../constants';
import { DestinationAvailabilityService } from '../../destinations/DestinationAvailabilityService';
import type { AIAssistantDestinationType } from '../../types';
import {
  createBaseMockPasteDestination,
  createMockConfigReader,
  createMockDestinationRegistry,
  createMockEditor,
  createMockTabGroupsWithCount,
  createMockTerminal,
  createMockVscodeAdapter,
} from '../helpers';

describe('DestinationAvailabilityService', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  const createMockRegistryWithUnifiedAI = (aiAvailable = false) => {
    const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
    mockDestination.isAvailable.mockResolvedValue(aiAvailable);

    return createMockDestinationRegistry({
      createImpl: () => mockDestination,
    });
  };

  describe('isAIAssistantAvailable()', () => {
    it.each<[AIAssistantDestinationType, boolean]>([
      ['claude-code', true],
      ['claude-code', false],
      ['cursor-ai', true],
      ['cursor-ai', false],
      ['github-copilot-chat', true],
      ['github-copilot-chat', false],
    ])('%s destination returns %s', async (type, available) => {
      const registry = createMockRegistryWithUnifiedAI();
      const mockDestination = createBaseMockPasteDestination({ id: type });
      mockDestination.isAvailable.mockResolvedValue(available);
      registry.create.mockReturnValue(mockDestination);
      const ideAdapter = createMockVscodeAdapter();
      const service = new DestinationAvailabilityService(
        registry,
        ideAdapter,
        createMockConfigReader(),
        mockLogger,
      );

      const result = await service.isAIAssistantAvailable(type);

      expect(result).toBe(available);
      expect(registry.create).toHaveBeenCalledWith({ type });
      expect(mockDestination.isAvailable).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'DestinationAvailabilityService.isAIAssistantAvailable',
          type,
          available,
        },
        `AI assistant ${type} availability: ${available}`,
      );
    });
  });

  describe('getUnavailableMessageCode()', () => {
    it('returns INFO_CLAUDE_CODE_NOT_AVAILABLE for claude-code', () => {
      const ideAdapter = createMockVscodeAdapter();
      const service = new DestinationAvailabilityService(
        createMockRegistryWithUnifiedAI(),
        ideAdapter,
        createMockConfigReader(),
        mockLogger,
      );

      const result = service.getUnavailableMessageCode('claude-code');

      expect(result).toBe('INFO_CLAUDE_CODE_NOT_AVAILABLE');
    });

    it('returns INFO_CURSOR_AI_NOT_AVAILABLE for cursor-ai', () => {
      const ideAdapter = createMockVscodeAdapter();
      const service = new DestinationAvailabilityService(
        createMockRegistryWithUnifiedAI(),
        ideAdapter,
        createMockConfigReader(),
        mockLogger,
      );

      const result = service.getUnavailableMessageCode('cursor-ai');

      expect(result).toBe('INFO_CURSOR_AI_NOT_AVAILABLE');
    });

    it('returns INFO_GITHUB_COPILOT_CHAT_NOT_AVAILABLE for github-copilot-chat', () => {
      const ideAdapter = createMockVscodeAdapter();
      const service = new DestinationAvailabilityService(
        createMockRegistryWithUnifiedAI(),
        ideAdapter,
        createMockConfigReader(),
        mockLogger,
      );

      const result = service.getUnavailableMessageCode('github-copilot-chat');

      expect(result).toBe('INFO_GITHUB_COPILOT_CHAT_NOT_AVAILABLE');
    });
  });

  describe('getGroupedDestinationItems()', () => {
    describe('text-editor availability', () => {
      it('includes text-editor group when eligible', async () => {
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: createMockEditor(),
            terminals: [],
            activeTerminal: undefined,
            tabGroups: createMockTabGroupsWithCount(2),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          createMockConfigReader(),
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems();

        expect(result['text-editor']).toStrictEqual([
          {
            label: 'Text Editor ("file.ts")',
            displayName: 'Text Editor ("file.ts")',
            bindOptions: { type: 'text-editor' },
            itemKind: 'bindable',
          },
        ]);
      });

      it('excludes text-editor group when not eligible', async () => {
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: undefined,
            terminals: [],
            activeTerminal: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          createMockConfigReader(),
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems();

        expect(result['text-editor']).toBeUndefined();
      });
    });

    describe('terminal availability', () => {
      it('includes terminal group with BindableQuickPickItems', async () => {
        const terminal = createMockTerminal({ name: 'zsh' });
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [terminal],
            activeTerminal: terminal,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          createMockConfigReader(),
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems({ terminalThreshold: 5 });

        expect(result['terminal']).toStrictEqual([
          {
            label: 'Terminal "zsh"',
            displayName: 'Terminal "zsh"',
            bindOptions: { type: 'terminal', terminal },
            isActive: true,
            itemKind: 'bindable',
          },
        ]);
      });

      it('includes terminal-more item when terminals exceed threshold', async () => {
        const terminal1 = createMockTerminal({ name: 'term-1' });
        const terminal2 = createMockTerminal({ name: 'term-2' });
        const terminal3 = createMockTerminal({ name: 'term-3' });
        const terminal4 = createMockTerminal({ name: 'term-4' });
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [terminal1, terminal2, terminal3, terminal4],
            activeTerminal: terminal1,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          createMockConfigReader(),
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems({ terminalThreshold: 3 });

        expect(result['terminal']).toStrictEqual([
          {
            label: 'Terminal "term-1"',
            displayName: 'Terminal "term-1"',
            bindOptions: { type: 'terminal', terminal: terminal1 },
            isActive: true,
            itemKind: 'bindable',
          },
          {
            label: 'Terminal "term-2"',
            displayName: 'Terminal "term-2"',
            bindOptions: { type: 'terminal', terminal: terminal2 },
            isActive: false,
            itemKind: 'bindable',
          },
        ]);
        expect(result['terminal-more']).toStrictEqual({
          label: 'More terminals...',
          displayName: 'More terminals...',
          remainingCount: 2,
          itemKind: 'terminal-more',
        });
      });

      it('shows all terminals when threshold is Infinity', async () => {
        const terminal1 = createMockTerminal({ name: 'term-1' });
        const terminal2 = createMockTerminal({ name: 'term-2' });
        const terminal3 = createMockTerminal({ name: 'term-3' });
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [terminal1, terminal2, terminal3],
            activeTerminal: terminal2,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          createMockConfigReader(),
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems({ terminalThreshold: Infinity });

        expect(result['terminal']).toHaveLength(3);
        expect(result['terminal-more']).toBeUndefined();
      });
    });

    describe('AI assistant availability', () => {
      it('includes claude-code group when available', async () => {
        const registry = createMockRegistryWithUnifiedAI();
        const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
        mockDestination.isAvailable.mockResolvedValue(true);
        registry.create.mockReturnValue(mockDestination);
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [],
            activeTerminal: undefined,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(
        registry,
        ideAdapter,
        createMockConfigReader(),
        mockLogger,
      );

        const result = await service.getGroupedDestinationItems();

        expect(result['claude-code']).toStrictEqual([
          {
            label: 'Claude Code Chat',
            displayName: 'Claude Code Chat',
            bindOptions: { type: 'claude-code' },
            itemKind: 'bindable',
          },
        ]);
      });
    });

    describe('filtering by destinationTypes', () => {
      it('returns only terminal items when filtered to terminal', async () => {
        const registry = createMockRegistryWithUnifiedAI();
        const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
        mockDestination.isAvailable.mockResolvedValue(true);
        registry.create.mockReturnValue(mockDestination);
        const terminal = createMockTerminal({ name: 'bash' });
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [terminal],
            activeTerminal: terminal,
            activeTextEditor: createMockEditor(),
            tabGroups: createMockTabGroupsWithCount(2),
          },
        });
        const service = new DestinationAvailabilityService(
        registry,
        ideAdapter,
        createMockConfigReader(),
        mockLogger,
      );

        const result = await service.getGroupedDestinationItems({
          destinationTypes: ['terminal'],
          terminalThreshold: Infinity,
        });

        expect(result['terminal']).toBeDefined();
        expect(result['text-editor']).toBeUndefined();
        expect(result['claude-code']).toBeUndefined();
      });

      it('returns only text-editor when filtered to text-editor', async () => {
        const terminal = createMockTerminal({ name: 'bash' });
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [terminal],
            activeTerminal: terminal,
            activeTextEditor: createMockEditor(),
            tabGroups: createMockTabGroupsWithCount(2),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          createMockConfigReader(),
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems({
          destinationTypes: ['text-editor'],
        });

        expect(result['text-editor']).toBeDefined();
        expect(result['terminal']).toBeUndefined();
      });
    });

    describe('logging', () => {
      it('logs grouped items count and configuration', async () => {
        const terminal = createMockTerminal({ name: 'bash' });
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [terminal],
            activeTerminal: terminal,
            activeTextEditor: createMockEditor(),
            tabGroups: createMockTabGroupsWithCount(2),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          createMockConfigReader(),
          mockLogger,
        );

        await service.getGroupedDestinationItems({ terminalThreshold: 5 });

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            destinationTypes: 'all',
            terminalThreshold: 5,
            groupCount: 2,
            totalItems: 2,
            countsByType: { 'text-editor': 1, terminal: 1 },
          },
          'Found 2 grouped destination items',
        );
      });

      it('logs filtered destination types', async () => {
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [],
            activeTerminal: undefined,
            activeTextEditor: createMockEditor(),
            tabGroups: createMockTabGroupsWithCount(2),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          createMockConfigReader(),
          mockLogger,
        );

        await service.getGroupedDestinationItems({ destinationTypes: ['text-editor'] });

        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            destinationTypes: ['text-editor'],
            terminalThreshold: DEFAULT_TERMINAL_PICKER_MAX_INLINE,
            groupCount: 1,
            totalItems: 1,
            countsByType: { 'text-editor': 1 },
          },
          'Found 1 grouped destination items',
        );
      });
    });
  });
});
