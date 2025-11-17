import { getLogger } from 'barebone-logger';

import { RangeLinkExtensionError, RangeLinkExtensionErrorCodes } from '../errors';
import { getCurrentLocale, getMessages } from '../i18n/LocaleManager';
import { messagesEn } from '../i18n/messages.en';
import { supportedLocales, type LocaleCode } from '../i18n/supportedLocales';
import { MessageCode } from '../types/MessageCode';

const logger = getLogger();

/**
 * Format localized message with parameter substitution.
 *
 * Stateful locale system:
 * - Uses current locale set via setLocale() (default: 'en')
 * - Optional locale override for testing/special cases
 * - Graceful fallback to English for missing translations
 *
 * Template syntax: Uses {paramName} for placeholders.
 * Parameter values: Supports strings, numbers, arrays, and objects.
 * - Primitives (string/number): Converted directly
 * - Arrays/objects: Serialized via JSON.stringify()
 *
 * @param code - Message code identifying the message template
 * @param params - Optional parameters for template substitution
 * @param localeOverride - Optional locale override (for testing)
 * @returns Formatted message string with substituted parameters
 * @throws {RangeLinkExtensionError} If message code missing in all locales (programming error)
 */
export const formatMessage = (
  code: MessageCode,
  params?: Record<string, unknown>,
  localeOverride?: LocaleCode,
): string => {
  // Determine which messages to use (override or current locale)
  const messages = localeOverride ? supportedLocales[localeOverride] : getMessages();
  const activeLocale = localeOverride || getCurrentLocale();

  // Try to get template from selected locale
  let template = messages?.[code];

  // Fallback to English if translation missing (Option C: warn + fallback)
  if (!template && activeLocale !== 'en') {
    logger.warn(
      { fn: 'formatMessage', code, locale: activeLocale },
      `Missing translation for message code '${code}' in locale '${activeLocale}', using English fallback`,
    );
    template = messagesEn[code];
  }

  // If still missing (even in English), throw error (programming error)
  if (!template) {
    const errorMessage = `Missing translation for message code: ${code}`;
    logger.error({ fn: 'formatMessage', code, locale: activeLocale }, errorMessage);
    throw new RangeLinkExtensionError({
      code: RangeLinkExtensionErrorCodes.MISSING_MESSAGE_CODE,
      message: errorMessage,
      functionName: 'formatMessage',
      details: { messageCode: code, locale: activeLocale },
    });
  }

  if (!params) {
    return template;
  }

  // Substitute {paramName} placeholders
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    if (value === undefined) {
      return match; // Preserve placeholder if param not provided
    }

    // Handle primitives directly
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }

    // Handle arrays/objects with JSON.stringify()
    try {
      return JSON.stringify(value);
    } catch (error) {
      // Fallback for circular references or other JSON errors
      logger.warn(
        { fn: 'formatMessage', key, valueType: typeof value, error },
        'Failed to stringify parameter value, using String() fallback',
      );
      return String(value);
    }
  });
};
