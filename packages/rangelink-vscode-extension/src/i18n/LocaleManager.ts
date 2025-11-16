import { getLogger } from 'barebone-logger';

import { DEFAULT_LOCALE, supportedLocales, type LocaleCode, type MessageMap } from './supportedLocales';

const logger = getLogger();

/**
 * Current locale code.
 * Defaults to 'en' (English).
 * Modified via setLocale().
 */
let currentLocale: LocaleCode = DEFAULT_LOCALE;

/**
 * Set the current locale for i18n message formatting.
 * Automatically extracts base locale from language codes (e.g., 'en-US' → 'en').
 *
 * Stateful locale management (mirrors LogManager pattern):
 * - Call once at extension startup to initialize from vscode.env.language
 * - Can be called later to switch locales dynamically
 * - Falls back to DEFAULT_LOCALE ('en') for unsupported locales with warning
 *
 * @param locale - VSCode language code (e.g., 'en', 'en-US', 'fr-FR')
 */
export const setLocale = (locale: string): void => {
  // Extract base locale from language codes like 'en-US' → 'en'
  const baseLocale = locale.split('-')[0];

  // Check if locale is supported
  if (!(baseLocale in supportedLocales)) {
    logger.warn(
      { fn: 'setLocale', requestedLocale: locale, baseLocale, fallbackLocale: DEFAULT_LOCALE },
      `Unsupported locale '${baseLocale}', falling back to '${DEFAULT_LOCALE}'`,
    );
    currentLocale = DEFAULT_LOCALE;
    return;
  }

  currentLocale = baseLocale as LocaleCode;
  logger.debug({ fn: 'setLocale', locale: currentLocale }, 'Locale set successfully');
};

/**
 * Get the message map for the current locale.
 * Resolves locale string to message map on each access (no stale reference risk).
 *
 * @returns Message map (MessageCode → string) for current locale
 */
export const getMessages = (): MessageMap => {
  return supportedLocales[currentLocale] || supportedLocales[DEFAULT_LOCALE];
};

/**
 * Get the current locale code.
 *
 * @returns Current locale code (e.g., 'en', 'fr')
 */
export const getCurrentLocale = (): LocaleCode => currentLocale;
