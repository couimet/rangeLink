import { getLogger } from 'barebone-logger';

import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../../errors';
import { getCurrentLocale, setLocale } from '../../i18n/LocaleManager';
import { messagesEn } from '../../i18n/messages.en';
import { supportedLocales } from '../../i18n/supportedLocales';
import { MessageCode } from '../../types/MessageCode';
import { formatMessage } from '../formatMessage';

/**
 * Test-only message codes (decoupled from actual UI MessageCode enum).
 * Tests formatMessage infrastructure, not specific UI messages.
 *
 * Library approach: These tests validate formatMessage logic independently
 * of UI message changes. Actual UI messages are tested in integration tests.
 */
enum TestMessageCode {
  SIMPLE_MESSAGE = 'SIMPLE_MESSAGE',
  MESSAGE_WITH_PARAM = 'MESSAGE_WITH_PARAM',
  MESSAGE_WITH_MULTIPLE_PARAMS = 'MESSAGE_WITH_MULTIPLE_PARAMS',
}

/**
 * Test message map (decoupled from messages.en.ts).
 * Allows testing formatMessage logic without coupling to UI messages.
 */
const testMessagesEn: Record<TestMessageCode, string> = {
  [TestMessageCode.SIMPLE_MESSAGE]: 'This is a simple message',
  [TestMessageCode.MESSAGE_WITH_PARAM]: 'Hello {name}',
  [TestMessageCode.MESSAGE_WITH_MULTIPLE_PARAMS]: 'User {name} has {count} items',
};

describe('formatMessage', () => {
  // Mock logger to prevent console spam during tests
  let loggerWarnSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    setLocale('en');

    supportedLocales.en = testMessagesEn as unknown as Record<MessageCode, string>;

    // Spy on logger methods (jest.config restoreMocks: true handles cleanup)
    loggerWarnSpy = jest.spyOn(getLogger(), 'warn').mockImplementation(() => {});
    loggerErrorSpy = jest.spyOn(getLogger(), 'error').mockImplementation(() => {});
  });

  describe('Basic Message Formatting', () => {
    it('should return message without parameters', () => {
      const result = formatMessage(TestMessageCode.SIMPLE_MESSAGE as unknown as MessageCode);

      expect(result).toBe('This is a simple message');
    });

    it('should return message with empty params object', () => {
      const result = formatMessage(TestMessageCode.SIMPLE_MESSAGE as unknown as MessageCode, {});

      expect(result).toBe('This is a simple message');
    });

    it('should return message for template with no placeholders', () => {
      const result = formatMessage(TestMessageCode.SIMPLE_MESSAGE as unknown as MessageCode);

      expect(result).toBe('This is a simple message');
    });
  });

  describe('Parameter Substitution', () => {
    it('should substitute single string parameter', () => {
      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        name: 'Alice',
      });

      expect(result).toBe('Hello Alice');
    });

    it('should substitute single numeric parameter', () => {
      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        name: 42,
      });

      expect(result).toBe('Hello 42');
    });

    it('should substitute multiple parameters', () => {
      const result = formatMessage(
        TestMessageCode.MESSAGE_WITH_MULTIPLE_PARAMS as unknown as MessageCode,
        {
          name: 'Bob',
          count: 5,
        },
      );

      expect(result).toBe('User Bob has 5 items');
    });

    it('should preserve placeholder if parameter not provided', () => {
      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        wrongParam: 'value',
      });

      expect(result).toBe('Hello {name}');
    });

    it('should ignore extra parameters not in template', () => {
      const result = formatMessage(TestMessageCode.SIMPLE_MESSAGE as unknown as MessageCode, {
        extraParam1: 'value1',
        extraParam2: 'value2',
      });

      expect(result).toBe('This is a simple message');
    });

    it('should handle empty string parameter', () => {
      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        name: '',
      });

      expect(result).toBe('Hello ');
    });

    it('should handle parameter with special characters', () => {
      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        name: 'Test-Name_123',
      });

      expect(result).toBe('Hello Test-Name_123');
    });
  });

  describe('Complex Parameter Types', () => {
    it('should serialize array parameter via JSON.stringify', () => {
      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        name: ['item1', 'item2'],
      });

      expect(result).toBe('Hello ["item1","item2"]');
    });

    it('should serialize object parameter via JSON.stringify', () => {
      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        name: { type: 'Test', version: 1 },
      });

      expect(result).toBe('Hello {"type":"Test","version":1}');
    });

    it('should handle circular reference with fallback to String()', () => {
      // Create circular reference
      const circular: { self?: unknown } = {};
      circular.self = circular;

      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        name: circular,
      });

      // Should fallback to String() which produces "[object Object]"
      expect(result).toBe('Hello [object Object]');

      // Should log warning
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'formatMessage',
          key: 'name',
          valueType: 'object',
        }),
        'Failed to stringify parameter value, using String() fallback',
      );
    });

    it('should handle boolean parameter', () => {
      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        name: true,
      });

      expect(result).toBe('Hello true');
    });

    it('should handle null parameter', () => {
      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        name: null,
      });

      expect(result).toBe('Hello null');
    });
  });

  describe('Error Handling', () => {
    it('should throw RangeLinkExtensionError for unknown message code', () => {
      const invalidCode = 'INVALID_CODE' as unknown as MessageCode;

      expect(() => formatMessage(invalidCode)).toThrow(RangeLinkExtensionError);
    });

    it('should throw error with correct error code', () => {
      const invalidCode = 'INVALID_CODE' as unknown as MessageCode;

      expect(() => formatMessage(invalidCode)).toThrow(RangeLinkExtensionError);

      try {
        formatMessage(invalidCode);
      } catch (error) {
        expect(error).toBeInstanceOf(RangeLinkExtensionError);
        expect((error as RangeLinkExtensionError).code).toBe(
          RangeLinkExtensionErrorCodes.MISSING_MESSAGE_CODE,
        );
      }
    });

    it('should throw error with correct details', () => {
      const invalidCode = 'INVALID_CODE' as unknown as MessageCode;

      try {
        formatMessage(invalidCode);
      } catch (error) {
        expect(error).toBeInstanceOf(RangeLinkExtensionError);
        expect((error as RangeLinkExtensionError).details).toStrictEqual({
          messageCode: 'INVALID_CODE',
          locale: 'en',
        });
      }
    });

    it('should log error before throwing', () => {
      const invalidCode = 'INVALID_CODE' as unknown as MessageCode;

      try {
        formatMessage(invalidCode);
      } catch {
        // Expected
      }

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'formatMessage',
          code: 'INVALID_CODE',
          locale: 'en',
        }),
        'Missing translation for message code: INVALID_CODE',
      );
    });
  });

  describe('Locale Management', () => {
    it('should use current locale set via setLocale', () => {
      setLocale('en');

      const result = formatMessage(TestMessageCode.SIMPLE_MESSAGE as unknown as MessageCode);

      expect(result).toBe(testMessagesEn[TestMessageCode.SIMPLE_MESSAGE]);
      expect(getCurrentLocale()).toBe('en');
    });

    it('should support locale override parameter', () => {
      setLocale('en'); // Set current locale to English

      // Override to English explicitly (same as current, but tests override mechanism)
      const result = formatMessage(
        TestMessageCode.SIMPLE_MESSAGE as unknown as MessageCode,
        undefined,
        'en',
      );

      expect(result).toBe('This is a simple message');
    });

    it('should handle locale codes with region (e.g., en-US → en)', () => {
      setLocale('en-US'); // Should extract 'en'

      const result = formatMessage(TestMessageCode.SIMPLE_MESSAGE as unknown as MessageCode);

      expect(result).toBe('This is a simple message');
      expect(getCurrentLocale()).toBe('en');
    });

    it('should fallback to English for unsupported locale', () => {
      setLocale('fr-FR'); // Unsupported locale

      const result = formatMessage(TestMessageCode.SIMPLE_MESSAGE as unknown as MessageCode);

      // Will fallback to 'en' locale (which has our test messages)
      expect(result).toBe('This is a simple message');
      expect(getCurrentLocale()).toBe('en'); // Should fallback to 'en'

      // Should log warning
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          fn: 'setLocale',
          requestedLocale: 'fr-FR',
          baseLocale: 'fr',
          fallbackLocale: 'en',
        }),
        expect.stringContaining("Unsupported locale 'fr'"),
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined params (no substitution needed)', () => {
      const result = formatMessage(
        TestMessageCode.SIMPLE_MESSAGE as unknown as MessageCode,
        undefined,
      );

      expect(result).toBe('This is a simple message');
    });

    it('should handle parameter with zero value', () => {
      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        name: 0,
      });

      expect(result).toBe('Hello 0');
    });

    it('should handle parameter with negative number', () => {
      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        name: -42,
      });

      expect(result).toBe('Hello -42');
    });

    it('should handle parameter with floating point number', () => {
      const result = formatMessage(TestMessageCode.MESSAGE_WITH_PARAM as unknown as MessageCode, {
        name: 3.14,
      });

      expect(result).toBe('Hello 3.14');
    });
  });

  describe('PasteDestinationManager Messages (Issue #112)', () => {
    beforeEach(() => {
      // Restore real message map for these tests (earlier tests override it with testMessagesEn)
      supportedLocales.en = messagesEn;
      setLocale('en');
    });

    it('should format STATUS_BAR_DESTINATION_NOT_BOUND (static)', () => {
      const result = formatMessage(MessageCode.STATUS_BAR_DESTINATION_NOT_BOUND);

      expect(result).toStrictEqual('RangeLink: No destination bound');
    });

    it('should format STATUS_BAR_DESTINATION_UNBOUND with destinationName param', () => {
      const result = formatMessage(MessageCode.STATUS_BAR_DESTINATION_UNBOUND, {
        destinationName: 'Terminal',
      });

      expect(result).toStrictEqual('✓ RangeLink unbound from Terminal');
    });

    it('should format STATUS_BAR_DESTINATION_BINDING_REMOVED_TERMINAL_CLOSED (static)', () => {
      const result = formatMessage(
        MessageCode.STATUS_BAR_DESTINATION_BINDING_REMOVED_TERMINAL_CLOSED,
      );

      expect(result).toStrictEqual('Destination binding removed (terminal closed)');
    });

    it('should format STATUS_BAR_DESTINATION_BOUND with destinationName param', () => {
      const result = formatMessage(MessageCode.STATUS_BAR_DESTINATION_BOUND, {
        destinationName: 'Cursor AI Assistant',
      });

      expect(result).toStrictEqual('✓ RangeLink bound to Cursor AI Assistant');
    });

    it('should format STATUS_BAR_DESTINATION_REBOUND with two params', () => {
      const result = formatMessage(MessageCode.STATUS_BAR_DESTINATION_REBOUND, {
        previousDestination: 'Terminal',
        newDestination: 'Cursor AI Assistant',
      });

      expect(result).toStrictEqual('Unbound Terminal, now bound to Cursor AI Assistant');
    });
  });

  describe('RangeLinkNavigationHandler Messages (Issue #121)', () => {
    beforeEach(() => {
      // Restore real message map for these tests (earlier tests override it with testMessagesEn)
      supportedLocales.en = messagesEn;
      setLocale('en');
    });

    it('should format WARN_NAVIGATION_FILE_NOT_FOUND with path param', () => {
      const result = formatMessage(MessageCode.WARN_NAVIGATION_FILE_NOT_FOUND, {
        path: 'src/missing.ts',
      });

      expect(result).toStrictEqual('RangeLink: Cannot find file: src/missing.ts');
    });

    it('should format INFO_NAVIGATION_SUCCESS with path and position params', () => {
      const result = formatMessage(MessageCode.INFO_NAVIGATION_SUCCESS, {
        path: 'src/utils/helper.ts',
        position: 'L42C10',
      });

      expect(result).toStrictEqual('RangeLink: Navigated to src/utils/helper.ts @ L42C10');
    });

    it('should format ERROR_NAVIGATION_FAILED with path and error params', () => {
      const result = formatMessage(MessageCode.ERROR_NAVIGATION_FAILED, {
        path: 'src/broken.ts',
        error: 'File is not readable',
      });

      expect(result).toStrictEqual(
        'RangeLink: Failed to navigate to src/broken.ts: File is not readable',
      );
    });
  });
});
