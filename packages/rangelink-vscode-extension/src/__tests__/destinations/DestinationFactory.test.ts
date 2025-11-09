import type { Logger } from 'barebone-logger';
import { createMockLogger } from 'barebone-logger-testing';

import { DestinationFactory } from '../../destinations/DestinationFactory';
import { TerminalDestination } from '../../destinations/TerminalDestination';
import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';

describe('DestinationFactory', () => {
  let factory: DestinationFactory;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    factory = new DestinationFactory(mockLogger);
  });

  describe('create()', () => {
    it('should create TerminalDestination for terminal type', () => {
      const destination = factory.create('terminal');

      expect(destination).toBeInstanceOf(TerminalDestination);
      expect(destination.id).toBe('terminal');
      expect(destination.displayName).toBe('Terminal');
    });

    it('should log debug message when creating destination', () => {
      factory.create('terminal');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'DestinationFactory.create',
          type: 'terminal',
        }),
        'Creating destination: terminal',
      );
    });

    it('should inject logger into TerminalDestination', async () => {
      const destination = factory.create('terminal');

      // Verify logger was injected by triggering a log call
      await destination.paste('test');

      expect(mockLogger.warn).toHaveBeenCalled(); // paste() logs warning when no terminal bound
    });

    it('should throw RangeLinkExtensionError for claude-code type (not yet implemented)', () => {
      let caughtError: unknown;
      try {
        factory.create('claude-code');
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(RangeLinkExtensionError);
      const error = caughtError as RangeLinkExtensionError;
      expect(error.code).toBe(RangeLinkExtensionErrorCodes.DESTINATION_NOT_IMPLEMENTED);
      expect(error.message).toBe('Destination type not yet implemented: claude-code');
      expect(error.functionName).toBe('DestinationFactory.create');
      expect(error.details).toStrictEqual({ destinationType: 'claude-code' });
    });

    it('should throw RangeLinkExtensionError for cursor-ai type (not yet implemented)', () => {
      let caughtError: unknown;
      try {
        factory.create('cursor-ai');
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(RangeLinkExtensionError);
      const error = caughtError as RangeLinkExtensionError;
      expect(error.code).toBe(RangeLinkExtensionErrorCodes.DESTINATION_NOT_IMPLEMENTED);
      expect(error.message).toBe('Destination type not yet implemented: cursor-ai');
      expect(error.functionName).toBe('DestinationFactory.create');
      expect(error.details).toStrictEqual({ destinationType: 'cursor-ai' });
    });

    it('should create new instance on each call', () => {
      const dest1 = factory.create('terminal');
      const dest2 = factory.create('terminal');

      expect(dest1).not.toBe(dest2); // Different instances
      expect(dest1.id).toBe(dest2.id); // Same type
    });
  });

  describe('getSupportedTypes()', () => {
    it('should return array with terminal type', () => {
      const types = factory.getSupportedTypes();

      expect(types).toEqual(['terminal']);
    });

    it('should return array (not frozen or readonly)', () => {
      const types = factory.getSupportedTypes();

      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBe(1);
    });
  });

  describe('getDisplayNames()', () => {
    it('should return display names for all destination types', () => {
      const displayNames = factory.getDisplayNames();

      expect(displayNames).toEqual({
        terminal: 'Terminal',
        'claude-code': 'Claude Code Chat',
        'cursor-ai': 'Cursor AI Assistant',
      });
    });

    it('should have user-friendly display names', () => {
      const displayNames = factory.getDisplayNames();

      // Display names should be capitalized and readable
      expect(displayNames.terminal).toMatch(/^[A-Z]/);
      expect(displayNames['claude-code']).toMatch(/^[A-Z]/);
      expect(displayNames['cursor-ai']).toMatch(/^[A-Z]/);
    });

    it('should include future destination types in display names', () => {
      const displayNames = factory.getDisplayNames();

      // Even though claude-code and cursor-ai aren't implemented yet,
      // display names should be available for UI components
      expect(displayNames['claude-code']).toBeDefined();
      expect(displayNames['cursor-ai']).toBeDefined();
    });
  });

  describe('Factory pattern validation', () => {
    it('should maintain consistent interface across destination types', () => {
      const terminal = factory.create('terminal');

      // All destinations must implement PasteDestination interface
      expect(terminal).toHaveProperty('id');
      expect(terminal).toHaveProperty('displayName');
      expect(terminal).toHaveProperty('isAvailable');
      expect(terminal).toHaveProperty('paste');
    });

    it('should create destinations with correct types', async () => {
      const terminal = factory.create('terminal');

      // Methods should have correct return types
      expect(typeof (await terminal.isAvailable())).toBe('boolean');
      expect(typeof (await terminal.paste('test'))).toBe('boolean');
      expect(typeof terminal.displayName).toBe('string');
      expect(typeof terminal.id).toBe('string');
    });
  });
});
