import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { CursorAIDestination } from '../../destinations/CursorAIDestination';
import { DestinationFactory } from '../../destinations/DestinationFactory';
import { TerminalDestination } from '../../destinations/TerminalDestination';
import { TextEditorDestination } from '../../destinations/TextEditorDestination';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import type { VscodeAdapter } from '../../ide/vscode/VscodeAdapter';
import { createMockEditor } from '../helpers/createMockEditor';
import { createMockFormattedLink } from '../helpers/createMockFormattedLink';
import { createMockTerminal } from '../helpers/createMockTerminal';
import { createMockVscodeAdapter } from '../helpers/mockVSCode';

describe('DestinationFactory', () => {
  let factory: DestinationFactory;
  let mockAdapter: VscodeAdapter;
  let mockLogger: Logger;
  let mockTerminal: any;
  let mockEditor: any;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockAdapter = createMockVscodeAdapter();
    factory = new DestinationFactory(mockAdapter, mockLogger);

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
        expect.objectContaining({
          fn: 'DestinationFactory.create',
          type: 'terminal',
        }),
        'Creating destination: terminal',
      );
    });

    it('should inject logger into TerminalDestination', async () => {
      const destination = factory.create({ type: 'terminal', terminal: mockTerminal });

      // Verify logger was injected by triggering a log call
      await destination.pasteLink(createMockFormattedLink('test'));

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw RangeLinkExtensionError for github-copilot type (not yet implemented)', () => {
      let caughtError: unknown;
      try {
        factory.create({ type: 'github-copilot' });
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(RangeLinkExtensionError);
      const error = caughtError as RangeLinkExtensionError;
      expect(error.code).toBe(RangeLinkExtensionErrorCodes.DESTINATION_NOT_IMPLEMENTED);
      expect(error.message).toBe('Destination type not yet implemented: github-copilot');
      expect(error.functionName).toBe('DestinationFactory.create');
      expect(error.details).toStrictEqual({ destinationType: 'github-copilot' });
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
      expect(destination.displayName).toContain('test.md');
    });

    it('should create new instance on each call', () => {
      const dest1 = factory.create({ type: 'terminal', terminal: mockTerminal });
      const dest2 = factory.create({ type: 'terminal', terminal: mockTerminal });

      expect(dest1).not.toBe(dest2); // Different instances
      expect(dest1.id).toBe(dest2.id); // Same type
    });
  });

  describe('getSupportedTypes()', () => {
    it('should return array with terminal, cursor-ai, text-editor, and claude-code types', () => {
      const types = factory.getSupportedTypes();

      expect(types).toEqual(['terminal', 'cursor-ai', 'text-editor', 'claude-code']);
    });

    it('should return array (not frozen or readonly)', () => {
      const types = factory.getSupportedTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBe(4);
    });
  });

  describe('getDisplayNames()', () => {
    it('should return display names for all destination types', () => {
      const displayNames = factory.getDisplayNames();

      expect(displayNames).toEqual({
        terminal: 'Terminal',
        'text-editor': 'Text Editor',
        'cursor-ai': 'Cursor AI Assistant',
        'github-copilot': 'GitHub Copilot Chat',
        'claude-code': 'Claude Code Chat',
      });
    });

    it('should have user-friendly display names', () => {
      const displayNames = factory.getDisplayNames();

      // Display names should be capitalized and readable
      expect(displayNames.terminal).toMatch(/^[A-Z]/);
      expect(displayNames['text-editor']).toMatch(/^[A-Z]/);
      expect(displayNames['cursor-ai']).toMatch(/^[A-Z]/);
      expect(displayNames['github-copilot']).toMatch(/^[A-Z]/);
      expect(displayNames['claude-code']).toMatch(/^[A-Z]/);
    });

    it('should include future destination types in display names', () => {
      const displayNames = factory.getDisplayNames();

      // Even though these aren't implemented yet, display names should be available for UI
      expect(displayNames['text-editor']).toBeDefined();
      expect(displayNames['cursor-ai']).toBeDefined();
      expect(displayNames['github-copilot']).toBeDefined();
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
