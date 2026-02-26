import { createMockLogger } from 'barebone-logger-testing';

import { DestinationAvailabilityService } from '../../destinations';
import type { AIAssistantDestinationKind } from '../../types';
import {
  createBaseMockPasteDestination,
  createMockConfigReader,
  createMockDestinationRegistry,
  createMockTab,
  createMockTabGroup,
  createMockTabGroupsWithCount,
  createMockTerminal,
  createMockUri,
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

    describe('file items via text-editor kind', () => {
      it('returns file items when eligible files exist', async () => {
        const uri = createMockUri('/workspace/src/app.ts');
        const tab = createMockTab(uri);
        const group = createMockTabGroup([tab]);
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            tabGroups: { all: [group] },
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems({
          destinationKinds: ['text-editor'],
        });

        expect(result['text-editor']).toStrictEqual([
          {
            label: 'app.ts',
            displayName: 'app.ts',
            description: undefined,
            bindOptions: { kind: 'text-editor', uri, viewColumn: 1 },
            itemKind: 'bindable',
            fileInfo: {
              uri,
              filename: 'app.ts',
              displayPath: 'src/app.ts',
              viewColumn: 1,
              isCurrentInGroup: true,
              isActiveEditor: false,
              boundState: 'not-bound',
            },
            boundState: 'not-bound',
          },
        ]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            destinationKinds: ['text-editor'],
          },
          'Using provided destinationKinds filter',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            groupKeys: ['text-editor'],
          },
          'Built grouped destination items',
        );
      });

      it('returns empty when no eligible files', async () => {
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            tabGroups: { all: [] },
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems({
          destinationKinds: ['text-editor'],
        });

        expect(result['text-editor']).toBeUndefined();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            destinationKinds: ['text-editor'],
          },
          'Using provided destinationKinds filter',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            groupKeys: [],
          },
          'Built grouped destination items',
        );
      });

      it('applies bound state when boundFileUriString matches', async () => {
        const uri = createMockUri('/workspace/src/app.ts');
        const tab = createMockTab(uri);
        const group = createMockTabGroup([tab]);
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            tabGroups: { all: [group] },
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems({
          destinationKinds: ['text-editor'],
          boundFileUriString: uri.toString(),
        });

        expect(result['text-editor']).toStrictEqual([
          {
            label: 'app.ts',
            displayName: 'app.ts',
            description: 'bound',
            bindOptions: { kind: 'text-editor', uri, viewColumn: 1 },
            itemKind: 'bindable',
            fileInfo: {
              uri,
              filename: 'app.ts',
              displayPath: 'src/app.ts',
              viewColumn: 1,
              isCurrentInGroup: true,
              isActiveEditor: false,
              boundState: 'bound',
            },
            boundState: 'bound',
          },
        ]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            destinationKinds: ['text-editor'],
          },
          'Using provided destinationKinds filter',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            groupKeys: ['text-editor'],
          },
          'Built grouped destination items',
        );
      });

      it('shows file-more item for non-current-in-group files', async () => {
        const uri1 = createMockUri('/workspace/src/a.ts');
        const uri2 = createMockUri('/workspace/src/b.ts');
        const uri3 = createMockUri('/workspace/src/c.ts');
        const tab1 = createMockTab(uri1);
        const tab2 = createMockTab(uri2);
        const tab3 = createMockTab(uri3);
        const group = createMockTabGroup([tab1, tab2, tab3], { activeTab: tab1 });
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            tabGroups: { all: [group] },
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems({
          destinationKinds: ['text-editor'],
        });

        expect(result['text-editor']).toStrictEqual([
          {
            label: 'a.ts',
            displayName: 'a.ts',
            description: undefined,
            bindOptions: { kind: 'text-editor', uri: uri1, viewColumn: 1 },
            itemKind: 'bindable',
            fileInfo: {
              uri: uri1,
              filename: 'a.ts',
              displayPath: 'src/a.ts',
              viewColumn: 1,
              isCurrentInGroup: true,
              isActiveEditor: false,
              boundState: 'not-bound',
            },
            boundState: 'not-bound',
          },
        ]);
        expect(result['file-more']).toStrictEqual({
          label: 'More files...',
          displayName: 'More files...',
          remainingCount: 2,
          itemKind: 'file-more',
        });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            destinationKinds: ['text-editor'],
          },
          'Using provided destinationKinds filter',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            groupKeys: ['text-editor', 'file-more'],
          },
          'Built grouped destination items',
        );
      });

      it('marks only the file in the matching viewColumn as bound when same URI appears in two tab groups', async () => {
        const uri = createMockUri('/workspace/src/app.ts');
        const tab1 = createMockTab(uri);
        const tab2 = createMockTab(uri);
        const group1 = createMockTabGroup([tab1]);
        const group2 = createMockTabGroup([tab2], { viewColumn: 2 });
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            tabGroups: { all: [group1, group2] },
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems({
          destinationKinds: ['text-editor'],
          boundFileUriString: uri.toString(),
          boundFileViewColumn: 1,
        });

        expect(result['text-editor']).toStrictEqual([
          {
            label: 'app.ts',
            displayName: 'app.ts',
            description: 'src · bound',
            bindOptions: { kind: 'text-editor', uri, viewColumn: 1 },
            itemKind: 'bindable',
            fileInfo: {
              uri,
              filename: 'app.ts',
              displayPath: 'src/app.ts',
              viewColumn: 1,
              isCurrentInGroup: true,
              isActiveEditor: false,
              boundState: 'bound',
            },
            boundState: 'bound',
          },
          {
            label: 'app.ts',
            displayName: 'app.ts',
            description: 'src',
            bindOptions: { kind: 'text-editor', uri, viewColumn: 2 },
            itemKind: 'bindable',
            fileInfo: {
              uri,
              filename: 'app.ts',
              displayPath: 'src/app.ts',
              viewColumn: 2,
              isCurrentInGroup: true,
              isActiveEditor: false,
              boundState: 'not-bound',
            },
            boundState: 'not-bound',
          },
        ]);
      });

      it('shows no file-more when all files are current-in-group', async () => {
        const uri1 = createMockUri('/workspace/src/a.ts');
        const uri2 = createMockUri('/workspace/src/b.ts');
        const tab1 = createMockTab(uri1);
        const tab2 = createMockTab(uri2);
        const group1 = createMockTabGroup([tab1]);
        const group2 = createMockTabGroup([tab2], { viewColumn: 2 });
        ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            tabGroups: { all: [group1, group2] },
          },
        });
        service = new DestinationAvailabilityService(
          mockRegistry,
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getGroupedDestinationItems({
          destinationKinds: ['text-editor'],
        });

        expect(result['text-editor']).toStrictEqual([
          {
            label: 'a.ts',
            displayName: 'a.ts',
            description: undefined,
            bindOptions: { kind: 'text-editor', uri: uri1, viewColumn: 1 },
            itemKind: 'bindable',
            fileInfo: {
              uri: uri1,
              filename: 'a.ts',
              displayPath: 'src/a.ts',
              viewColumn: 1,
              isCurrentInGroup: true,
              isActiveEditor: false,
              boundState: 'not-bound',
            },
            boundState: 'not-bound',
          },
          {
            label: 'b.ts',
            displayName: 'b.ts',
            description: undefined,
            bindOptions: { kind: 'text-editor', uri: uri2, viewColumn: 2 },
            itemKind: 'bindable',
            fileInfo: {
              uri: uri2,
              filename: 'b.ts',
              displayPath: 'src/b.ts',
              viewColumn: 2,
              isCurrentInGroup: true,
              isActiveEditor: false,
              boundState: 'not-bound',
            },
            boundState: 'not-bound',
          },
        ]);
        expect(result['file-more']).toBeUndefined();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            destinationKinds: ['text-editor'],
          },
          'Using provided destinationKinds filter',
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getGroupedDestinationItems',
            groupKeys: ['text-editor'],
          },
          'Built grouped destination items',
        );
      });
    });
  });

  describe('getAllFileItems()', () => {
    it('returns empty array when no files exist', () => {
      ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          tabGroups: { all: [] },
        },
      });
      service = new DestinationAvailabilityService(
        mockRegistry,
        ideAdapter,
        mockConfigReader,
        mockLogger,
      );

      const result = service.getAllFileItems();

      expect(result).toStrictEqual([]);
    });

    it('returns items for all files including non-current-in-group', () => {
      const uri1 = createMockUri('/workspace/src/a.ts');
      const uri2 = createMockUri('/workspace/src/b.ts');
      const tab1 = createMockTab(uri1);
      const tab2 = createMockTab(uri2);
      const group = createMockTabGroup([tab1, tab2], { activeTab: tab1 });
      ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          tabGroups: { all: [group] },
        },
      });
      service = new DestinationAvailabilityService(
        mockRegistry,
        ideAdapter,
        mockConfigReader,
        mockLogger,
      );

      const result = service.getAllFileItems();

      expect(result).toStrictEqual([
        {
          label: 'a.ts',
          displayName: 'a.ts',
          description: undefined,
          bindOptions: { kind: 'text-editor', uri: uri1, viewColumn: 1 },
          itemKind: 'bindable',
          fileInfo: {
            uri: uri1,
            filename: 'a.ts',
            displayPath: 'src/a.ts',
            viewColumn: 1,
            isCurrentInGroup: true,
            isActiveEditor: false,
            boundState: 'not-bound',
          },
          boundState: 'not-bound',
        },
        {
          label: 'b.ts',
          displayName: 'b.ts',
          description: undefined,
          bindOptions: { kind: 'text-editor', uri: uri2, viewColumn: 1 },
          itemKind: 'bindable',
          fileInfo: {
            uri: uri2,
            filename: 'b.ts',
            displayPath: 'src/b.ts',
            viewColumn: 1,
            isCurrentInGroup: false,
            isActiveEditor: false,
            boundState: 'not-bound',
          },
          boundState: 'not-bound',
        },
      ]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'DestinationAvailabilityService.getAllFileItems', fileCount: 2 },
        'Built all file items',
      );
    });

    it('marks bound file with bound state', () => {
      const uri = createMockUri('/workspace/src/app.ts');
      const tab = createMockTab(uri);
      const group = createMockTabGroup([tab]);
      ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          tabGroups: { all: [group] },
        },
      });
      service = new DestinationAvailabilityService(
        mockRegistry,
        ideAdapter,
        mockConfigReader,
        mockLogger,
      );

      const result = service.getAllFileItems(uri.toString());

      expect(result).toStrictEqual([
        {
          label: 'app.ts',
          displayName: 'app.ts',
          description: 'bound',
          bindOptions: { kind: 'text-editor', uri, viewColumn: 1 },
          itemKind: 'bindable',
          fileInfo: {
            uri,
            filename: 'app.ts',
            displayPath: 'src/app.ts',
            viewColumn: 1,
            isCurrentInGroup: true,
            isActiveEditor: false,
            boundState: 'bound',
          },
          boundState: 'bound',
        },
      ]);
    });

    it('marks only the file in the matching viewColumn as bound when same URI appears in two tab groups', () => {
      const uri = createMockUri('/workspace/src/app.ts');
      const tab1 = createMockTab(uri);
      const tab2 = createMockTab(uri);
      const group1 = createMockTabGroup([tab1]);
      const group2 = createMockTabGroup([tab2], { viewColumn: 2 });
      ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          tabGroups: { all: [group1, group2] },
        },
      });
      service = new DestinationAvailabilityService(
        mockRegistry,
        ideAdapter,
        mockConfigReader,
        mockLogger,
      );

      const result = service.getAllFileItems(uri.toString(), 1);

      expect(result).toStrictEqual([
        {
          label: 'app.ts',
          displayName: 'app.ts',
          description: 'src · bound',
          bindOptions: { kind: 'text-editor', uri, viewColumn: 1 },
          itemKind: 'bindable',
          fileInfo: {
            uri,
            filename: 'app.ts',
            displayPath: 'src/app.ts',
            viewColumn: 1,
            isCurrentInGroup: true,
            isActiveEditor: false,
            boundState: 'bound',
          },
          boundState: 'bound',
        },
        {
          label: 'app.ts',
          displayName: 'app.ts',
          description: 'src',
          bindOptions: { kind: 'text-editor', uri, viewColumn: 2 },
          itemKind: 'bindable',
          fileInfo: {
            uri,
            filename: 'app.ts',
            displayPath: 'src/app.ts',
            viewColumn: 2,
            isCurrentInGroup: true,
            isActiveEditor: false,
            boundState: 'not-bound',
          },
          boundState: 'not-bound',
        },
      ]);
    });

    it('applies disambiguators for duplicate filenames', () => {
      const uri1 = createMockUri('/workspace/src/a/util.ts');
      const uri2 = createMockUri('/workspace/src/b/util.ts');
      const tab1 = createMockTab(uri1);
      const tab2 = createMockTab(uri2);
      const group = createMockTabGroup([tab1, tab2], { activeTab: tab1 });
      ideAdapter = createMockVscodeAdapter({
        windowOptions: {
          tabGroups: { all: [group] },
        },
      });
      service = new DestinationAvailabilityService(
        mockRegistry,
        ideAdapter,
        mockConfigReader,
        mockLogger,
      );

      const result = service.getAllFileItems();

      expect(result[0].description).toBe('…/a');
      expect(result[1].description).toBe('…/b');
    });
  });
});
