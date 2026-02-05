import { MessageCode } from '../types';

import { messagesEn } from './messages.en';

/**
 * Type alias for message map: MessageCode enum to string templates.
 */
export type MessageMap = Record<MessageCode, string>;

/**
 * Supported locale codes.
 * Extend this union type when adding new locales.
 */
export type LocaleCode = 'en'; // | 'fr' | 'es' - Future locales

/**
 * Registry of all supported locales and their message maps.
 * Each locale must provide a complete mapping of all MessageCode values.
 *
 * Architecture: Extension-Only i18n (Option D)
 * - Single source of truth for locale availability
 * - Enables automated completeness testing
 * - Easy to extend: add new locale file and import here
 */
export const supportedLocales: Record<LocaleCode, MessageMap> = {
  en: messagesEn,
  // fr: messagesFr, // Future
  // es: messagesEs, // Future
};

/**
 * Default locale used when:
 * - Requested locale is not supported
 * - Fallback needed for missing translations
 */
export const DEFAULT_LOCALE: LocaleCode = 'en';
