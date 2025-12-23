import type { ConfigGetter, ConfigInspection } from '../../config/types';

/**
 * Creates a mock ConfigGetter for testing configuration-related code.
 *
 * @param overrides - Key-value pairs to return from get()
 * @returns A ConfigGetter that returns overrides values or undefined
 */
export const createMockConfigGetter = (
  overrides: Partial<Record<string, unknown>> = {},
): ConfigGetter => ({
  get: <T>(key: string): T | undefined => {
    if (key in overrides) {
      return overrides[key] as T;
    }
    return undefined;
  },
  inspect: (key: string): ConfigInspection | undefined => {
    const isOverridden = key in overrides;
    return {
      key,
      defaultValue: undefined,
      globalValue: isOverridden ? String(overrides[key]) : undefined,
      workspaceValue: undefined,
      workspaceFolderValue: undefined,
    };
  },
});
