import { createMockLogger } from 'barebone-logger-testing';

import { DestinationAvailabilityService } from '../../destinations/DestinationAvailabilityService';
import type { AIAssistantDestinationType } from '../../destinations/PasteDestination';
import {
  createBaseMockPasteDestination,
  createMockDestinationRegistry,
  createMockEditor,
  createMockTabGroupsWithCount,
  createMockTerminal,
  createMockVscodeAdapter,
} from '../helpers';

describe('DestinationAvailabilityService', () => {
  const mockLogger = createMockLogger();

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
      const service = new DestinationAvailabilityService(registry, ideAdapter, mockLogger);

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
        mockLogger,
      );

      const result = service.getUnavailableMessageCode('github-copilot-chat');

      expect(result).toBe('INFO_GITHUB_COPILOT_CHAT_NOT_AVAILABLE');
    });
  });

  describe('getAvailableDestinations()', () => {
    describe('text-editor availability', () => {
      it('includes text-editor when hasActiveTextEditor and tabGroupCount >= 2', async () => {
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: createMockEditor(),
            activeTerminal: undefined,
            tabGroups: createMockTabGroupsWithCount(2),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          mockLogger,
        );

        const result = await service.getAvailableDestinations();

        expect(result).toStrictEqual([{ type: 'text-editor', displayName: 'Text Editor ("file.ts")' }]);
      });

      it('excludes text-editor when hasActiveTextEditor is false', async () => {
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: undefined,
            activeTerminal: undefined,
            tabGroups: createMockTabGroupsWithCount(2),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          mockLogger,
        );

        const result = await service.getAvailableDestinations();

        expect(result.find((d) => d.type === 'text-editor')).toBeUndefined();
      });

      it('excludes text-editor when tabGroupCount < 2', async () => {
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: createMockEditor(),
            activeTerminal: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          mockLogger,
        );

        const result = await service.getAvailableDestinations();

        expect(result.find((d) => d.type === 'text-editor')).toBeUndefined();
      });
    });

    describe('terminal availability', () => {
      it('includes terminal when hasActiveTerminal is true', async () => {
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: createMockTerminal(),
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          mockLogger,
        );

        const result = await service.getAvailableDestinations();

        expect(result).toStrictEqual([{ type: 'terminal', displayName: 'Terminal ("bash")' }]);
      });

      it('excludes terminal when hasActiveTerminal is false', async () => {
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: undefined,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          mockLogger,
        );

        const result = await service.getAvailableDestinations();

        expect(result.find((d) => d.type === 'terminal')).toBeUndefined();
      });
    });

    describe('AI assistant availability', () => {
      it('includes all AI assistants when available', async () => {
        const registry = createMockRegistryWithUnifiedAI();
        const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
        mockDestination.isAvailable.mockResolvedValue(true);
        registry.create.mockReturnValue(mockDestination);
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: undefined,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(registry, ideAdapter, mockLogger);

        const result = await service.getAvailableDestinations();

        expect(result).toStrictEqual([
          { type: 'claude-code', displayName: 'Claude Code Chat' },
          { type: 'github-copilot-chat', displayName: 'GitHub Copilot Chat' },
          { type: 'cursor-ai', displayName: 'Cursor AI Assistant' },
        ]);
      });

      it('excludes AI assistants when not available', async () => {
        const registry = createMockRegistryWithUnifiedAI();
        const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
        mockDestination.isAvailable.mockResolvedValue(false);
        registry.create.mockReturnValue(mockDestination);
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: undefined,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(registry, ideAdapter, mockLogger);

        const result = await service.getAvailableDestinations();

        expect(result.find((d) => d.type === 'claude-code')).toBeUndefined();
        expect(result.find((d) => d.type === 'cursor-ai')).toBeUndefined();
        expect(result.find((d) => d.type === 'github-copilot-chat')).toBeUndefined();
      });
    });

    describe('combined availability', () => {
      it('returns all available destinations when everything is available', async () => {
        const registry = createMockRegistryWithUnifiedAI();
        const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
        mockDestination.isAvailable.mockResolvedValue(true);
        registry.create.mockReturnValue(mockDestination);
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: createMockTerminal(),
            activeTextEditor: createMockEditor(),
            tabGroups: createMockTabGroupsWithCount(2),
          },
        });
        const service = new DestinationAvailabilityService(registry, ideAdapter, mockLogger);

        const result = await service.getAvailableDestinations();

        expect(result).toStrictEqual([
          { type: 'text-editor', displayName: 'Text Editor ("file.ts")' },
          { type: 'terminal', displayName: 'Terminal ("bash")' },
          { type: 'claude-code', displayName: 'Claude Code Chat' },
          { type: 'github-copilot-chat', displayName: 'GitHub Copilot Chat' },
          { type: 'cursor-ai', displayName: 'Cursor AI Assistant' },
        ]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinations',
            isTextEditorEligible: true,
            isTerminalEligible: true,
            availableCount: 5,
            availableTypes: [
              'text-editor',
              'terminal',
              'claude-code',
              'github-copilot-chat',
              'cursor-ai',
            ],
          },
          'Found 5 available destinations',
        );
      });

      it('returns empty array when nothing is available', async () => {
        const registry = createMockRegistryWithUnifiedAI();
        const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
        mockDestination.isAvailable.mockResolvedValue(false);
        registry.create.mockReturnValue(mockDestination);
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: undefined,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(registry, ideAdapter, mockLogger);

        const result = await service.getAvailableDestinations();

        expect(result).toStrictEqual([]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinations',
            isTextEditorEligible: false,
            isTerminalEligible: false,
            availableCount: 0,
            availableTypes: [],
          },
          'Found 0 available destinations',
        );
      });
    });

    describe('checks AI assistants in parallel', () => {
      it('calls registry.create for each AI assistant type', async () => {
        const registry = createMockRegistryWithUnifiedAI();
        const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
        mockDestination.isAvailable.mockResolvedValue(false);
        registry.create.mockReturnValue(mockDestination);
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: undefined,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(registry, ideAdapter, mockLogger);

        await service.getAvailableDestinations();

        expect(registry.create).toHaveBeenCalledWith({ type: 'claude-code' });
        expect(registry.create).toHaveBeenCalledWith({ type: 'cursor-ai' });
        expect(registry.create).toHaveBeenCalledWith({ type: 'github-copilot-chat' });
      });
    });
  });
});
