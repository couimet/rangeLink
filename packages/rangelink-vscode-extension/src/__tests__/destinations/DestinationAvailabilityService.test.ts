import { createMockLogger } from 'barebone-logger-testing';

import { DestinationAvailabilityService } from '../../destinations';
import type { AIAssistantDestinationKind } from '../../types';
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
    it.each<[AIAssistantDestinationKind, boolean]>([
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

  describe('getTerminalItems()', () => {
    it('returns empty array when no terminals exist', async () => {
      const result = await service.getTerminalItems(Infinity);

      expect(result).toStrictEqual([]);
    });

    it('returns terminal items with terminalInfo including processId and boundState', async () => {
      const terminal1 = createMockTerminal({ name: 'bash' });
      const terminal2 = createMockTerminal({ name: 'zsh' });
      ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          terminals: [terminal1, terminal2],
          activeTerminal: terminal2,
          tabGroups: createMockTabGroupsWithCount(1),
        },
      });
      service = new DestinationAvailabilityService(
        mockRegistry,
        ideAdapter,
        mockConfigReader,
        mockLogger,
      );

      const result = await service.getTerminalItems(Infinity);

      expect(result).toStrictEqual([
        {
          label: 'Terminal ("zsh")',
          displayName: 'Terminal ("zsh")',
          bindOptions: { kind: 'terminal', terminal: terminal2 },
          itemKind: 'bindable',
          isActive: true,
          boundState: 'not-bound',
          terminalInfo: {
            terminal: terminal2,
            name: 'zsh',
            isActive: true,
            processId: undefined,
            boundState: 'not-bound',
          },
        },
        {
          label: 'Terminal ("bash")',
          displayName: 'Terminal ("bash")',
          bindOptions: { kind: 'terminal', terminal: terminal1 },
          itemKind: 'bindable',
          isActive: false,
          boundState: 'not-bound',
          terminalInfo: {
            terminal: terminal1,
            name: 'bash',
            isActive: false,
            processId: undefined,
            boundState: 'not-bound',
          },
        },
      ]);
    });

    it('delegates to getGroupedDestinationItems with terminal filter and boundTerminalProcessId', async () => {
      const spy = jest.spyOn(service, 'getGroupedDestinationItems');

      await service.getTerminalItems(3, 42);

      expect(spy).toHaveBeenCalledWith({
        destinationKinds: ['terminal'],
        terminalThreshold: 3,
        boundTerminalProcessId: 42,
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
            boundState: 'not-bound',
            terminalInfo: {
              terminal,
              name: 'bash',
              isActive: true,
              processId: undefined,
              boundState: 'not-bound',
            },
          },
        ]);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.resolveTerminalThreshold',
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
            boundState: 'not-bound',
            terminalInfo: {
              terminal,
              name: 'bash',
              isActive: true,
              processId: undefined,
              boundState: 'not-bound',
            },
          },
        ]);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.resolveTerminalThreshold',
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
            boundState: 'not-bound',
            terminalInfo: {
              terminal,
              name: 'bash',
              isActive: true,
              processId: undefined,
              boundState: 'not-bound',
            },
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
            boundState: 'not-bound',
            terminalInfo: {
              terminal,
              name: 'bash',
              isActive: true,
              processId: undefined,
              boundState: 'not-bound',
            },
          },
        ]);
        expect(mockLogger.warn).not.toHaveBeenCalled();
      });

      it('accepts Infinity as a valid threshold (shows all terminals)', async () => {
        mockConfigReader.getWithDefault.mockReturnValue(Infinity);
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
            boundState: 'not-bound',
            terminalInfo: {
              terminal,
              name: 'bash',
              isActive: true,
              processId: undefined,
              boundState: 'not-bound',
            },
          },
        ]);
        expect(mockLogger.warn).not.toHaveBeenCalled();
      });

      it('floors fractional config values to integers', async () => {
        mockConfigReader.getWithDefault.mockReturnValue(2.9);
        const terminal1 = createMockTerminal({ name: 'Terminal 1' });
        const terminal2 = createMockTerminal({ name: 'Terminal 2' });
        const terminal3 = createMockTerminal({ name: 'Terminal 3' });
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTerminal: terminal1,
            terminals: [terminal1, terminal2, terminal3],
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
            label: 'Terminal ("Terminal 1")',
            displayName: 'Terminal ("Terminal 1")',
            bindOptions: { kind: 'terminal', terminal: terminal1 },
            itemKind: 'bindable',
            isActive: true,
            boundState: 'not-bound',
            terminalInfo: {
              terminal: terminal1,
              name: 'Terminal 1',
              isActive: true,
              processId: undefined,
              boundState: 'not-bound',
            },
          },
          {
            label: 'Terminal ("Terminal 2")',
            displayName: 'Terminal ("Terminal 2")',
            bindOptions: { kind: 'terminal', terminal: terminal2 },
            itemKind: 'bindable',
            isActive: false,
            boundState: 'not-bound',
            terminalInfo: {
              terminal: terminal2,
              name: 'Terminal 2',
              isActive: false,
              processId: undefined,
              boundState: 'not-bound',
            },
          },
        ]);
        expect(result['terminal-more']).toStrictEqual({
          label: 'More terminals...',
          displayName: 'More terminals...',
          remainingCount: 1,
          itemKind: 'terminal-more',
        });
        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.resolveTerminalThreshold',
            providedThreshold: undefined,
            configThreshold: 2.9,
            effectiveThreshold: 2,
          },
          'Resolved terminalThreshold',
        );
      });
    });
  });
});
