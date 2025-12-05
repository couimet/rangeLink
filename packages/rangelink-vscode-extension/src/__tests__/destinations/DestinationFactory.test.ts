import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { CursorAIDestination } from '../../destinations/CursorAIDestination';
import { DestinationFactory } from '../../destinations/DestinationFactory';
import { GitHubCopilotChatDestination } from '../../destinations/GitHubCopilotChatDestination';
import { TerminalDestination } from '../../destinations/TerminalDestination';
import { TextEditorDestination } from '../../destinations/TextEditorDestination';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { createMockChatPasteHelperFactory } from '../helpers/createMockChatPasteHelperFactory';
import { createMockEditor } from '../helpers/createMockEditor';
import { createMockFormattedLink } from '../helpers/createMockFormattedLink';
import { createMockTerminal } from '../helpers/createMockTerminal';
import { createMockVscodeAdapter } from '../helpers/mockVSCode';

describe('DestinationFactory', () => {
  let factory: DestinationFactory;
  let mockAdapter: VscodeAdapter;
  let mockLogger: Logger;
  let mockChatPasteHelperFactory: ReturnType<typeof createMockChatPasteHelperFactory>;
  let mockTerminal: any;
  let mockEditor: any;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter();
    mockChatPasteHelperFactory = createMockChatPasteHelperFactory();
    factory = new DestinationFactory(mockAdapter, mockChatPasteHelperFactory, mockLogger);

    // Create mock terminal using helper
    mockTerminal = createMockTerminal({ name: 'bash' });

    // Create mock editor using helper
    mockEditor = createMockEditor();
  });

  describe('create()', () => {
    it('should create TerminalDestination for terminal type', () => {
      const destination = factory.create({ type: 'terminal', terminal: mockTerminal });

      expect(destination).toBeInstanceOf(TerminalDestination);
      expect(destination.id).toBe('terminal');
      expect(destination.displayName).toContain('Terminal');
    });

    it('should log debug message when creating destination', () => {
      factory.create({ type: 'terminal', terminal: mockTerminal });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          fn: 'DestinationFactory.create',
          type: 'terminal',
        },
        'Creating destination: terminal',
      );
    });

    it('should inject logger into TerminalDestination', async () => {
      const destination = factory.create({ type: 'terminal', terminal: mockTerminal });

      // Verify logger was injected by triggering a log call
      await destination.pasteLink(createMockFormattedLink('test'));

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should create GitHubCopilotChatDestination for github-copilot-chat type', () => {
      const destination = factory.create({ type: 'github-copilot-chat' });

      expect(destination).toBeInstanceOf(GitHubCopilotChatDestination);
      expect(destination.id).toBe('github-copilot-chat');
      expect(destination.displayName).toBe('GitHub Copilot Chat');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        { fn: 'DestinationFactory.create', type: 'github-copilot-chat' },
        'Creating destination: github-copilot-chat',
      );
    });

    it('should create CursorAIDestination for cursor-ai type', () => {
      const destination = factory.create({ type: 'cursor-ai' });

      expect(destination).toBeInstanceOf(CursorAIDestination);
      expect(destination.id).toBe('cursor-ai');
      expect(destination.displayName).toBe('Cursor AI Assistant');
    });

    it('should create TextEditorDestination for text-editor type', () => {
      const destination = factory.create({ type: 'text-editor', editor: mockEditor });

      expect(destination).toBeInstanceOf(TextEditorDestination);
      expect(destination.id).toBe('text-editor');
      expect(destination.displayName).toContain('file.ts');
    });

    it('should create new instance on each call', () => {
      const dest1 = factory.create({ type: 'terminal', terminal: mockTerminal });
      const dest2 = factory.create({ type: 'terminal', terminal: mockTerminal });

      expect(dest1).not.toBe(dest2); // Different instances
      expect(dest1.id).toBe(dest2.id); // Same type
    });
  });

  describe('getSupportedTypes()', () => {
    it('should return array with all supported destination types', () => {
      const types = factory.getSupportedTypes();

      expect(types).toEqual([
        'claude-code',
        'cursor-ai',
        'github-copilot-chat',
        'terminal',
        'text-editor',
      ]);
    });

    it('should return array (not frozen or readonly)', () => {
      const types = factory.getSupportedTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBe(5);
    });
  });

  describe('getDisplayNames()', () => {
    it('should return display names for all destination types', () => {
      const displayNames = factory.getDisplayNames();

      expect(displayNames).toEqual({
        terminal: 'Terminal',
        'text-editor': 'Text Editor',
        'cursor-ai': 'Cursor AI Assistant',
        'github-copilot-chat': 'GitHub Copilot Chat',
        'claude-code': 'Claude Code Chat',
      });
    });

    it('should have user-friendly display names', () => {
      const displayNames = factory.getDisplayNames();

      // Display names should be capitalized and readable
      expect(displayNames.terminal).toMatch(/^[A-Z]/);
      expect(displayNames['text-editor']).toMatch(/^[A-Z]/);
      expect(displayNames['cursor-ai']).toMatch(/^[A-Z]/);
      expect(displayNames['github-copilot-chat']).toMatch(/^[A-Z]/);
      expect(displayNames['claude-code']).toMatch(/^[A-Z]/);
    });

    it('should include all destination types in display names', () => {
      const displayNames = factory.getDisplayNames();

      // All destination types should have display names available for UI
      expect(displayNames['terminal']).toBeDefined();
      expect(displayNames['text-editor']).toBeDefined();
      expect(displayNames['cursor-ai']).toBeDefined();
      expect(displayNames['github-copilot-chat']).toBeDefined();
      expect(displayNames['claude-code']).toBeDefined();
    });
  });

  describe('Factory pattern validation', () => {
    it('should maintain consistent interface across destination types', () => {
      const terminal = factory.create({ type: 'terminal', terminal: mockTerminal });

      // All destinations must implement PasteDestination interface
      expect(terminal).toHaveProperty('id');
      expect(terminal).toHaveProperty('displayName');
      expect(terminal).toHaveProperty('isAvailable');
      expect(terminal).toHaveProperty('pasteLink');
    });

    it('should create destinations with correct types', async () => {
      const terminal = factory.create({ type: 'terminal', terminal: mockTerminal });

      // Methods should have correct return types
      expect(typeof (await terminal.isAvailable())).toBe('boolean');
      expect(typeof (await terminal.pasteLink(createMockFormattedLink('test')))).toBe('boolean');
      expect(typeof terminal.displayName).toBe('string');
      expect(typeof terminal.id).toBe('string');
    });
  });
});
