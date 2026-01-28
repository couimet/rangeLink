import { createMockLogger } from 'barebone-logger-testing';

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
  let mockConfigReader: ReturnType<typeof createMockConfigReader>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockConfigReader = createMockConfigReader();
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
      const service = new DestinationAvailabilityService(registry, ideAdapter, mockConfigReader, mockLogger);

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
        mockConfigReader,
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
        mockConfigReader,
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
        mockConfigReader,
        mockLogger,
      );

      const result = service.getUnavailableMessageCode('github-copilot-chat');

      expect(result).toBe('INFO_GITHUB_COPILOT_CHAT_NOT_AVAILABLE');
    });
  });

  describe('getAvailableDestinationItems()', () => {
    describe('text-editor availability', () => {
      it('includes text-editor DestinationItem when hasActiveTextEditor and tabGroupCount >= 2', async () => {
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
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getAvailableDestinationItems();

        expect(result).toStrictEqual([
          { kind: 'destination', destinationType: 'text-editor', displayName: 'Text Editor ("file.ts")' },
        ]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinationItems',
            isTextEditorEligible: true,
            terminalCount: 0,
            itemCount: 1,
          },
          'Found 1 available destination items',
        );
      });

      it('excludes text-editor when hasActiveTextEditor is false', async () => {
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            activeTextEditor: undefined,
            terminals: [],
            activeTerminal: undefined,
            tabGroups: createMockTabGroupsWithCount(2),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getAvailableDestinationItems();

        expect(
          result.find((d) => d.kind === 'destination' && d.destinationType === 'text-editor'),
        ).toBeUndefined();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinationItems',
            isTextEditorEligible: false,
            terminalCount: 0,
            itemCount: 0,
          },
          'Found 0 available destination items',
        );
      });
    });

    describe('terminal availability', () => {
      it('includes single TerminalItem when one terminal exists', async () => {
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
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getAvailableDestinationItems();

        expect(result).toStrictEqual([
          { kind: 'terminal', terminal, displayName: 'zsh', isActive: true },
        ]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinationItems',
            isTextEditorEligible: false,
            terminalCount: 1,
            itemCount: 1,
          },
          'Found 1 available destination items',
        );
      });

      it('includes multiple TerminalItems with correct active status', async () => {
        const terminal1 = createMockTerminal({ name: 'zsh' });
        const terminal2 = createMockTerminal({ name: 'bash' });
        const terminal3 = createMockTerminal({ name: 'node' });
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
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getAvailableDestinationItems();

        expect(result).toStrictEqual([
          { kind: 'terminal', terminal: terminal1, displayName: 'zsh', isActive: false },
          { kind: 'terminal', terminal: terminal2, displayName: 'bash', isActive: true },
          { kind: 'terminal', terminal: terminal3, displayName: 'node', isActive: false },
        ]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinationItems',
            isTextEditorEligible: false,
            terminalCount: 3,
            itemCount: 3,
          },
          'Found 3 available destination items',
        );
      });

      it('shows first 4 terminals plus "More..." when >5 terminals exist', async () => {
        const terminal1 = createMockTerminal({ name: 'terminal-1' });
        const terminal2 = createMockTerminal({ name: 'terminal-2' });
        const terminal3 = createMockTerminal({ name: 'terminal-3' });
        const terminal4 = createMockTerminal({ name: 'terminal-4' });
        const terminal5 = createMockTerminal({ name: 'terminal-5' });
        const terminal6 = createMockTerminal({ name: 'terminal-6' });
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [terminal1, terminal2, terminal3, terminal4, terminal5, terminal6],
            activeTerminal: terminal1,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getAvailableDestinationItems();

        expect(result).toStrictEqual([
          { kind: 'terminal', terminal: terminal1, displayName: 'terminal-1', isActive: true },
          { kind: 'terminal', terminal: terminal2, displayName: 'terminal-2', isActive: false },
          { kind: 'terminal', terminal: terminal3, displayName: 'terminal-3', isActive: false },
          { kind: 'terminal', terminal: terminal4, displayName: 'terminal-4', isActive: false },
          { kind: 'terminal-more', displayName: 'More terminals...', remainingCount: 2 },
        ]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinationItems',
            isTextEditorEligible: false,
            terminalCount: 6,
            itemCount: 5,
          },
          'Found 5 available destination items',
        );
      });

      it('shows all 5 terminals without "More..." when exactly 5 terminals exist', async () => {
        const terminal1 = createMockTerminal({ name: 'terminal-1' });
        const terminal2 = createMockTerminal({ name: 'terminal-2' });
        const terminal3 = createMockTerminal({ name: 'terminal-3' });
        const terminal4 = createMockTerminal({ name: 'terminal-4' });
        const terminal5 = createMockTerminal({ name: 'terminal-5' });
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [terminal1, terminal2, terminal3, terminal4, terminal5],
            activeTerminal: terminal3,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getAvailableDestinationItems();

        expect(result).toStrictEqual([
          { kind: 'terminal', terminal: terminal1, displayName: 'terminal-1', isActive: false },
          { kind: 'terminal', terminal: terminal2, displayName: 'terminal-2', isActive: false },
          { kind: 'terminal', terminal: terminal3, displayName: 'terminal-3', isActive: true },
          { kind: 'terminal', terminal: terminal4, displayName: 'terminal-4', isActive: false },
          { kind: 'terminal', terminal: terminal5, displayName: 'terminal-5', isActive: false },
        ]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinationItems',
            isTextEditorEligible: false,
            terminalCount: 5,
            itemCount: 5,
          },
          'Found 5 available destination items',
        );
      });

      it('excludes terminals when no terminals exist', async () => {
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [],
            activeTerminal: undefined,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          mockConfigReader,
          mockLogger,
        );

        const result = await service.getAvailableDestinationItems();

        expect(result.find((d) => d.kind === 'terminal')).toBeUndefined();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinationItems',
            isTextEditorEligible: false,
            terminalCount: 0,
            itemCount: 0,
          },
          'Found 0 available destination items',
        );
      });

      it('respects custom maxInline config value', async () => {
        const terminal1 = createMockTerminal({ name: 'terminal-1' });
        const terminal2 = createMockTerminal({ name: 'terminal-2' });
        const terminal3 = createMockTerminal({ name: 'terminal-3' });
        const terminal4 = createMockTerminal({ name: 'terminal-4' });
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [terminal1, terminal2, terminal3, terminal4],
            activeTerminal: terminal1,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const configReader = createMockConfigReader({
          getWithDefault: jest.fn().mockReturnValue(3),
        });
        const service = new DestinationAvailabilityService(
          createMockRegistryWithUnifiedAI(),
          ideAdapter,
          configReader,
          mockLogger,
        );

        const result = await service.getAvailableDestinationItems();

        expect(result).toStrictEqual([
          { kind: 'terminal', terminal: terminal1, displayName: 'terminal-1', isActive: true },
          { kind: 'terminal', terminal: terminal2, displayName: 'terminal-2', isActive: false },
          { kind: 'terminal-more', displayName: 'More terminals...', remainingCount: 2 },
        ]);
        expect(configReader.getWithDefault).toHaveBeenCalledWith('terminalPicker.maxInline', 5);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinationItems',
            isTextEditorEligible: false,
            terminalCount: 4,
            itemCount: 3,
          },
          'Found 3 available destination items',
        );
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
            terminals: [],
            activeTerminal: undefined,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(registry, ideAdapter, mockConfigReader, mockLogger);

        const result = await service.getAvailableDestinationItems();

        expect(result).toStrictEqual([
          { kind: 'destination', destinationType: 'claude-code', displayName: 'Claude Code Chat' },
          { kind: 'destination', destinationType: 'github-copilot-chat', displayName: 'GitHub Copilot Chat' },
          { kind: 'destination', destinationType: 'cursor-ai', displayName: 'Cursor AI Assistant' },
        ]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinationItems',
            isTextEditorEligible: false,
            terminalCount: 0,
            itemCount: 3,
          },
          'Found 3 available destination items',
        );
      });

      it('excludes AI assistants when not available', async () => {
        const registry = createMockRegistryWithUnifiedAI();
        const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
        mockDestination.isAvailable.mockResolvedValue(false);
        registry.create.mockReturnValue(mockDestination);
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [],
            activeTerminal: undefined,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(registry, ideAdapter, mockConfigReader, mockLogger);

        const result = await service.getAvailableDestinationItems();

        expect(
          result.find((d) => d.kind === 'destination' && d.destinationType === 'claude-code'),
        ).toBeUndefined();
        expect(
          result.find((d) => d.kind === 'destination' && d.destinationType === 'cursor-ai'),
        ).toBeUndefined();
        expect(
          result.find((d) => d.kind === 'destination' && d.destinationType === 'github-copilot-chat'),
        ).toBeUndefined();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinationItems',
            isTextEditorEligible: false,
            terminalCount: 0,
            itemCount: 0,
          },
          'Found 0 available destination items',
        );
      });
    });

    describe('combined availability', () => {
      it('returns all available items when everything is available', async () => {
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
        const service = new DestinationAvailabilityService(registry, ideAdapter, mockConfigReader, mockLogger);

        const result = await service.getAvailableDestinationItems();

        expect(result).toStrictEqual([
          { kind: 'destination', destinationType: 'text-editor', displayName: 'Text Editor ("file.ts")' },
          { kind: 'terminal', terminal, displayName: 'bash', isActive: true },
          { kind: 'destination', destinationType: 'claude-code', displayName: 'Claude Code Chat' },
          { kind: 'destination', destinationType: 'github-copilot-chat', displayName: 'GitHub Copilot Chat' },
          { kind: 'destination', destinationType: 'cursor-ai', displayName: 'Cursor AI Assistant' },
        ]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinationItems',
            isTextEditorEligible: true,
            terminalCount: 1,
            itemCount: 5,
          },
          'Found 5 available destination items',
        );
      });

      it('returns empty array when nothing is available', async () => {
        const registry = createMockRegistryWithUnifiedAI();
        const mockDestination = createBaseMockPasteDestination({ id: 'claude-code' });
        mockDestination.isAvailable.mockResolvedValue(false);
        registry.create.mockReturnValue(mockDestination);
        const ideAdapter = createMockVscodeAdapter({
          windowOptions: {
            terminals: [],
            activeTerminal: undefined,
            activeTextEditor: undefined,
            tabGroups: createMockTabGroupsWithCount(1),
          },
        });
        const service = new DestinationAvailabilityService(registry, ideAdapter, mockConfigReader, mockLogger);

        const result = await service.getAvailableDestinationItems();

        expect(result).toStrictEqual([]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          {
            fn: 'DestinationAvailabilityService.getAvailableDestinationItems',
            isTextEditorEligible: false,
            terminalCount: 0,
            itemCount: 0,
          },
          'Found 0 available destination items',
        );
      });
    });
  });
});
