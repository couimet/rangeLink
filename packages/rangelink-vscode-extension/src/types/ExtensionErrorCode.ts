import type { ExtensionError } from './ExtensionError';

/**
 * The `code` of any error an extension operation can surface.
 *
 * Derived from {@link ExtensionError} rather than restated, so the two cannot
 * drift when a member joins the union.
 */
export type ExtensionErrorCode = ExtensionError['code'];
