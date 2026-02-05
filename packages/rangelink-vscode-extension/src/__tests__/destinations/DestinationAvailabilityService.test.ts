import { createMockLogger } from 'barebone-logger-testing';

import { DestinationAvailabilityService } from '../../destinations/DestinationAvailabilityService';
import type { AIAssistantDestinationType } from '../../destinations/PasteDestination';
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
  let mockConfigReader: ReturnType<typeof createMockConfigReader>;
  let mockRegistry: ReturnType<typeof createMockDestinationRegistry>;
  let ideAdapter: ReturnType<typeof createMockVscodeAdapter>;
  let service: DestinationAvailabilityService;

  const createMockRegistryWithUnifiedAI = (aiAvailable = false) => {
    const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
    mockDestination.isAvailable.mockResolvedValue(aiAvailable);

    return createMockDestinationRegistry({
      createImpl: () => mockDestination,
    });
  };

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockConfigReader = createMockConfigReader();
    mockRegistry = createMockRegistryWithUnifiedAI();
    ideAdapter = createMockVscodeAdapter({
      windowOptions: {
        activeTextEditor: undefined,
        activeTerminal: undefined,
        tabGroups: createMockTabGroupsWithCount(1),
      },
    });
    service = new DestinationAvailabilityService(
      mockRegistry,
      ideAdapter,
      mockConfigReader,
      mockLogger,
    );
  });

  describe('isAIAssistantAvailable()', () => {
    it.each<[AIAssistantDestinationType, boolean]>([
      ['claude-code', true],
      ['claude-code', false],
      ['cursor-ai', true],
      ['cursor-ai', false],
      ['github-copilot-chat', true],
      ['github-copilot-chat', false],
    ])('%s destination returns %s', async (type, available) => {
      const mockDestination = createBaseMockPasteDestination({ id: type });
      mockDestination.isAvailable.mockResolvedValue(available);
      mockRegistry.create.mockReturnValue(mockDestination);

      const result = await service.isAIAssistantAvailable(type);

      expect(result).toBe(available);
      expect(mockRegistry.create).toHaveBeenCalledWith({ kind: type });
      expect(mockDestination.isAvailable).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'DestinationAvailabilityService.isAIAssistantAvailable',
          kind: type,
          available,
        },
        `AI assistant ${type} availability: ${available}`,
      );
    });
  });

  describe('getUnavailableMessageCode()', () => {
    it('returns INFO_CLAUDE_CODE_NOT_AVAILABLE for claude-code', () => {
      const result = service.getUnavailableMessageCode('claude-code');

      expect(result).toBe('INFO_CLAUDE_CODE_NOT_AVAILABLE');
    });

    it('returns INFO_CURSOR_AI_NOT_AVAILABLE for cursor-ai', () => {
      const result = service.getUnavailableMessageCode('cursor-ai');

      expect(result).toBe('INFO_CURSOR_AI_NOT_AVAILABLE');
    });

    it('returns INFO_GITHUB_COPILOT_CHAT_NOT_AVAILABLE for github-copilot-chat', () => {
      const result = service.getUnavailableMessageCode('github-copilot-chat');

      expect(result).toBe('INFO_GITHUB_COPILOT_CHAT_NOT_AVAILABLE');
    });
  });

  describe('getAvailableDestinations()', () => {
    describe('text-editor availability', () => {
      it('includes text-editor when hasActiveTextEditor is true', async () => {
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: createMockEditor(),
            activeTerminal: undefined,
            tabGroups: createMockTabGroupsWithCount(2),
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getAvailableDestinations();

        expect(result).toStrictEqual([
          { kind: 'text-editor', displayName: 'Text Editor ("file.ts")' },
        ]);
      });

      it('excludes text-editor when hasActiveTextEditor is false', async () => {
        const result = await service.getAvailableDestinations();

        expect(result.find((d) => d.kind === 'text-editor')).toBeUndefined();
      });
    });

    describe('terminal availability', () => {
      it('includes terminal when hasActiveTerminal is true', async () => {
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: createMockTerminal(),
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getAvailableDestinations();

        expect(result).toStrictEqual([{ kind: 'terminal', displayName: 'Terminal ("bash")' }]);
      });

      it('excludes terminal when hasActiveTerminal is false', async () => {
        const result = await service.getAvailableDestinations();

        expect(result.find((d) => d.kind === 'terminal')).toBeUndefined();
      });
    });

    describe('AI assistant availability', () => {
      it('includes all AI assistants when available', async () => {
        const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
        mockDestination.isAvailable.mockResolvedValue(true);
        mockRegistry.create.mockReturnValue(mockDestination);

        const result = await service.getAvailableDestinations();

        expect(result).toStrictEqual([
          { kind: 'claude-code', displayName: 'Claude Code Chat' },
          { kind: 'cursor-ai', displayName: 'Cursor AI Assistant' },
          { kind: 'github-copilot-chat', displayName: 'GitHub Copilot Chat' },
        ]);
      });

      it('excludes AI assistants when not available', async () => {
        const result = await service.getAvailableDestinations();

        expect(result.find((d) => d.kind === 'claude-code')).toBeUndefined();
        expect(result.find((d) => d.kind === 'cursor-ai')).toBeUndefined();
        expect(result.find((d) => d.kind === 'github-copilot-chat')).toBeUndefined();
      });
    });

    describe('combined availability', () => {
      it('returns all available destinations when everything is available', async () => {
        const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
        mockDestination.isAvailable.mockResolvedValue(true);
        mockRegistry.create.mockReturnValue(mockDestination);
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: createMockTerminal(),
            activeTextEditor: createMockEditor(),
            tabGroups: createMockTabGroupsWithCount(2),
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getAvailableDestinations();

        expect(result).toStrictEqual([
          { kind: 'text-editor', displayName: 'Text Editor ("file.ts")' },
          { kind: 'terminal', displayName: 'Terminal ("bash")' },
          { kind: 'claude-code', displayName: 'Claude Code Chat' },
          { kind: 'cursor-ai', displayName: 'Cursor AI Assistant' },
          { kind: 'github-copilot-chat', displayName: 'GitHub Copilot Chat' },
        ]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinations',
            isTextEditorEligible: true,
            isTerminalEligible: true,
            availableCount: 5,
            availableKinds: [
              'text-editor',
              'terminal',
              'claude-code',
              'cursor-ai',
              'github-copilot-chat',
            ],
          },
          'Found 5 available destinations',
        );
      });

      it('returns empty array when nothing is available', async () => {
        const result = await service.getAvailableDestinations();

        expect(result).toStrictEqual([]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinations',
            isTextEditorEligible: false,
            isTerminalEligible: false,
            availableCount: 0,
            availableKinds: [],
          },
          'Found 0 available destinations',
        );
      });
    });

    describe('checks AI assistants in parallel', () => {
      it('calls registry.create for each AI assistant type', async () => {
        await service.getAvailableDestinations();

        expect(mockRegistry.create).toHaveBeenCalledWith({ kind: 'claude-code' });
        expect(mockRegistry.create).toHaveBeenCalledWith({ kind: 'cursor-ai' });
        expect(mockRegistry.create).toHaveBeenCalledWith({ kind: 'github-copilot-chat' });
      });
    });
  });

  describe('getGroupedDestinationItems()', () => {
    describe('terminalThreshold validation', () => {
      it('logs warning and uses default when config value is 0 (below minimum)', async () => {
        mockConfigReader.getWithDefault.mockReturnValue(0);
        const terminal = createMockTerminal();
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: terminal,
            terminals: [terminal],
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems();

        expect(result.terminal).toStrictEqual([
          {
            label: 'Terminal ("bash")',
            displayName: 'Terminal ("bash")',
            bindOptions: { kind: 'terminal', terminal },
            itemKind: 'bindable',
            isActive: true,
          },
        ]);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            invalidValue: 0,
            fallback: 5,
          },
          'Invalid terminalThreshold, using default',
        );
      });

      it('logs warning and uses default when config value is NaN', async () => {
        mockConfigReader.getWithDefault.mockReturnValue(NaN);
        const terminal = createMockTerminal();
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: terminal,
            terminals: [terminal],
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems();

        expect(result.terminal).toStrictEqual([
          {
            label: 'Terminal ("bash")',
            displayName: 'Terminal ("bash")',
            bindOptions: { kind: 'terminal', terminal },
            itemKind: 'bindable',
            isActive: true,
          },
        ]);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            invalidValue: NaN,
            fallback: 5,
          },
          'Invalid terminalThreshold, using default',
        );
      });

      it('does not log warning when config value is 1 (minimum valid)', async () => {
        mockConfigReader.getWithDefault.mockReturnValue(1);
        const terminal = createMockTerminal();
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: terminal,
            terminals: [terminal],
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems();

        expect(result.terminal).toStrictEqual([
          {
            label: 'Terminal ("bash")',
            displayName: 'Terminal ("bash")',
            bindOptions: { kind: 'terminal', terminal },
            itemKind: 'bindable',
            isActive: true,
          },
        ]);
        expect(mockLogger.warn).not.toHaveBeenCalled();
      });

      it('does not log warning when config value is 2 (above minimum)', async () => {
        mockConfigReader.getWithDefault.mockReturnValue(2);
        const terminal = createMockTerminal();
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: terminal,
            terminals: [terminal],
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems();

        expect(result.terminal).toStrictEqual([
          {
            label: 'Terminal ("bash")',
            displayName: 'Terminal ("bash")',
            bindOptions: { kind: 'terminal', terminal },
            itemKind: 'bindable',
            isActive: true,
          },
        ]);
        expect(mockLogger.warn).not.toHaveBeenCalled();
      });
    });
  });
});
